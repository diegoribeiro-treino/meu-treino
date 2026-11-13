'use strict';

// Aba "Relatórios". Calorias são estimativas pelo método MET:
//   kcal = MET × 3,5 × peso(kg) ÷ 200 × minutos
// Valores de MET aproximados do Compendium of Physical Activities.
const MET = {
  forcaLeve: 3.0,     // musculação, esforço da sessão 0-4
  forcaModerada: 3.5, // musculação, esforço 5-7 (ou não informado)
  forcaIntensa: 5.0,  // musculação, esforço 8-10
  cardioLeve: 3.5,    // esteira/bicicleta em ritmo leve
  cardioModerado: 5.0, // esteira/bicicleta em ritmo moderado
};
// Blocos de cardio das fichas: 5 leves + 10 moderados no início; 12 moderados + 3 leves no fim
const CARDIO_INI = { min: 15, metMin: 5 * MET.cardioLeve + 10 * MET.cardioModerado };
const CARDIO_FIM = { min: 15, metMin: 12 * MET.cardioModerado + 3 * MET.cardioLeve };
const MIN_POR_SERIE = 2.5; // para estimar a duração de treinos registrados sem tempo

const PERIODOS = [['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['tudo', 'Tudo']];
let periodoRel = '30';

function inicioPeriodo(p) {
  if (p === 'tudo') return '0000-00-00';
  const d = new Date(); d.setDate(d.getDate() - (+p - 1));
  return isoDia(d);
}

// Números de uma sessão: duração, calorias, volume (kg × reps) e séries
function calcSessao(s) {
  let series = 0, volume = 0;
  for (const id in s.series) {
    const feitas = s.series[id].filter((x) => x.ok);
    series += feitas.length;
    const ex = exInfo(id, s);
    if (!['total', 'halter', 'unico'].includes(ex.carga)) continue;
    // Halteres contam os dois; unilaterais contam os dois lados
    const fator = (ex.carga === 'halter' ? 2 : 1) * (ex.lado === 'por lado' || ex.lado === 'por perna' ? 2 : 1);
    for (const x of feitas) volume += (num(x.kg) || 0) * (num(x.reps) || 0) * fator;
  }
  // Minutos de cardio gravados no treino (padrão: 15 min, como nas fichas AB); 1/3 leve e 2/3 moderado
  const cardio = (min) => ({ min, metMin: (min / 3) * MET.cardioLeve + ((2 * min) / 3) * MET.cardioModerado });
  const ini = s.checks && s.checks.cardioIni ? (s.cardioIniMin ? cardio(s.cardioIniMin) : CARDIO_INI) : null;
  const fim = s.cardioFinal === 'feito' ? (s.cardioFimMin ? cardio(s.cardioFimMin) : CARDIO_FIM) : null;
  const minCardio = (ini ? ini.min : 0) + (fim ? fim.min : 0);
  const estimado = s.duracaoMin == null;
  const min = estimado ? Math.round(series * MIN_POR_SERIE + minCardio) : s.duracaoMin;
  const metForca = s.esforco == null ? MET.forcaModerada : s.esforco <= 4 ? MET.forcaLeve : s.esforco >= 8 ? MET.forcaIntensa : MET.forcaModerada;
  const metMin = Math.max(min - minCardio, 0) * metForca + (ini ? ini.metMin : 0) + (fim ? fim.metMin : 0);
  const peso = pesoEm(s.data);
  return { min, estimado, series, volume, kcal: peso ? Math.round((metMin * 3.5 * peso) / 200) : null };
}

const fmtNum = (n, casas = 0) => n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}` : `${m} min`);
const fmtVolume = (kg) => (kg >= 1000 ? `${fmtNum(kg / 1000, 1)} t` : `${fmtNum(kg)} kg`);

function barrasH(itens, fmt = (v) => v) {
  const max = Math.max(1, ...itens.map((i) => i.v));
  return itens.map((i) => `<div class="hbar"><span>${esc(i.rotulo)}</span><span class="trilho"><i style="width:${(i.v / max) * 100}%"></i></span><span class="v">${fmt(i.v)}</span></div>`).join('');
}

function telaRelatorios() {
  const desde = inicioPeriodo(periodoRel);
  const lista = sessoesOrdenadas().filter((s) => s.data >= desde);
  let h = `<h1>Relatórios</h1><div class="chips">${PERIODOS.map(([v, t]) =>
    `<a href="#/relatorios" data-acao="rel-periodo" data-p="${v}" class="${v === periodoRel ? 'sel' : ''}">${t}</a>`).join('')}</div>`;

  if (!pesoEm()) {
    h += `<div class="card destaque small" style="margin-top:12px">Cadastre seu peso, altura e data de nascimento em
      <a href="#/ajustes">Ajustes → Meus dados</a> para ver as calorias estimadas e o IMC.</div>`;
  }
  if (!db.sessoes.length) return h + `<div class="vazio">Os relatórios aparecem depois do primeiro treino salvo.</div>`;

  // 1. Resumo do período
  const calcs = lista.map((s) => ({ s, c: calcSessao(s) }));
  const soma = (fn) => calcs.reduce((acc, x) => acc + (fn(x) || 0), 0);
  const n = lista.length;
  const minTot = soma((x) => x.c.min);
  const comKcal = calcs.filter((x) => x.c.kcal != null);
  const kcalTot = comKcal.reduce((a, x) => a + x.c.kcal, 0);
  // Séries previstas guardadas no treino; para treinos antigos, usa a ficha atual (nunca menos que as feitas)
  const planejadas = soma((x) => {
    const t = fichaDaSessao(x.s);
    return x.s.planejadas ?? Math.max(t ? contarSeries(t, {}).total : 0, x.c.series);
  });
  const seriesTot = soma((x) => x.c.series);
  const esforcos = lista.filter((s) => s.esforco != null).map((s) => s.esforco);
  const kpi = (valor, rotulo) => `<div class="kpi"><b>${valor}</b><span>${rotulo}</span></div>`;
  h += `<h3>Resumo</h3><div class="kpis">
    ${kpi(n, n === 1 ? 'treino' : 'treinos')}
    ${kpi(n ? fmtMin(minTot) : '–', 'tempo total')}
    ${kpi(n ? fmtMin(Math.round(minTot / n)) : '–', 'tempo médio por treino')}
    ${kpi(comKcal.length ? fmtNum(kcalTot) : '–', 'kcal estimadas')}
    ${kpi(comKcal.length ? fmtNum(kcalTot / comKcal.length) : '–', 'kcal por treino (média)')}
    ${kpi(n ? fmtVolume(soma((x) => x.c.volume)) : '–', 'volume levantado')}
    ${kpi(planejadas ? `${Math.round((seriesTot / planejadas) * 100)}%` : '–', `séries feitas (${seriesTot} de ${planejadas})`)}
    ${kpi(esforcos.length ? fmtNum(esforcos.reduce((a, b) => a + b, 0) / esforcos.length, 1) : '–', 'esforço médio (0-10)')}
  </div>`;
  if (calcs.some((x) => x.c.estimado)) h += `<p class="muted small" style="margin-top:6px">Treinos sem tempo anotado entram com duração estimada (${fmtNum(MIN_POR_SERIE, 1)} min por série + cardio).</p>`;

  // 2. Frequência semanal (últimas 8 semanas, independe do período)
  const hoje = new Date();
  const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const semanas = [];
  for (let i = 7; i >= 0; i--) {
    const ini = new Date(seg); ini.setDate(seg.getDate() - 7 * i);
    const fim = new Date(ini); fim.setDate(ini.getDate() + 6);
    const a = isoDia(ini), b = isoDia(fim);
    semanas.push({ rotulo: fmtData(a), v: db.sessoes.filter((s) => s.data >= a && s.data <= b).length });
  }
  const maxSem = Math.max(6, ...semanas.map((s) => s.v));
  h += `<h3>Treinos por semana</h3><div class="card"><div class="colunas">${semanas.map((s) =>
    `<div class="col"><b>${s.v || ''}</b><i class="${s.v ? '' : 'zero'}" style="height:${(s.v / maxSem) * 80}%"></i><span>${s.rotulo}</span></div>`).join('')}</div>
    <p class="muted small" style="margin-top:6px">Últimas 8 semanas (segunda a domingo). A rotina completa tem 6 treinos.</p></div>`;

  if (!n) return h + `<div class="vazio">Nenhum treino neste período.</div>${rodapeRel()}`;

  // 3. Treinos por ficha
  const porFicha = {};
  for (const s of lista) { const chave = s.programa === db.programaAtivo ? s.treino : `${s.treino} (anterior)`; porFicha[chave] = (porFicha[chave] || 0) + 1; }
  const ordemFichas = [...fichasIds(), ...Object.keys(porFicha).filter((k) => !fichasIds().includes(k))];
  h += `<h3>Treinos por ficha</h3><div class="card">${barrasH(ordemFichas.map((f) => ({ rotulo: f, v: porFicha[f] || 0 })))}
    <p class="muted small" style="margin-top:6px">Ajuda a manter o equilíbrio entre superiores (A) e inferiores (B).</p></div>`;

  // 4. Séries por grupo muscular
  const grupos = {};
  for (const s of lista) for (const id in s.series) {
    const feitas = s.series[id].filter((x) => x.ok).length;
    if (!feitas) continue;
    const g = exInfo(id, s).grupo || 'Outros';
    grupos[g] = (grupos[g] || 0) + feitas;
  }
  // Semanas do período, sem contar o tempo antes do primeiro treino registrado
  const primeiro = sessoesOrdenadas()[db.sessoes.length - 1].data;
  const diasDesdePrimeiro = Math.round((dataDeIso(isoDia()) - dataDeIso(primeiro)) / 864e5) + 1;
  const dias = Math.max(7, periodoRel === 'tudo' ? diasDesdePrimeiro : Math.min(+periodoRel, diasDesdePrimeiro));
  const semanasPeriodo = Math.max(1, dias / 7);
  const itensGrupo = Object.entries(grupos).sort((a, b) => b[1] - a[1]).map(([g, v]) => ({ rotulo: g, v: Math.round((v / semanasPeriodo) * 10) / 10 }));
  h += `<h3>Séries por grupo muscular</h3><div class="card">${barrasH(itensGrupo, (v) => fmtNum(v, v % 1 ? 1 : 0))}
    <p class="muted small" style="margin-top:6px">Média de séries por semana${semanasPeriodo > 1 ? ` (${fmtNum(semanasPeriodo, 1)} semanas com registros)` : ''}.</p></div>`;

  // 5. Últimos treinos: tempo, calorias e volume
  h += `<h3>Tempo, calorias e volume por treino</h3><div class="card"><table>
    <tr><th>Data</th><th>Ficha</th><th class="num">Tempo</th><th class="num">kcal</th><th class="num">Volume</th></tr>
    ${calcs.slice(0, 15).map(({ s, c }) => `<tr><td><a href="#/sessao/${s.id}">${fmtData(s.data)}</a></td><td>${esc(s.treino)}</td>
      <td class="num">${c.min} min${c.estimado ? '*' : ''}</td><td class="num">${c.kcal != null ? fmtNum(c.kcal) : '–'}</td><td class="num">${c.volume ? fmtVolume(c.volume) : '–'}</td></tr>`).join('')}
  </table>${calcs.some((x) => x.c.estimado) ? '<p class="muted small">* duração estimada</p>' : ''}
  <p class="muted small">Volume = carga × repetições (halteres e lados contados em dobro). Peso corporal, assistência e elástico não entram.</p></div>`;

  // 6. Recordes de carga e 1RM estimado (Epley), sempre com todo o histórico
  const recordes = {};
  for (const s of db.sessoes) for (const id in s.series) {
    const ex = exInfo(id, s);
    if (!['total', 'halter', 'unico'].includes(ex.carga)) continue;
    for (const x of s.series[id].filter((y) => y.ok)) {
      const kg = num(x.kg), reps = num(x.reps);
      if (!kg || !reps) continue;
      const r = (recordes[id] ??= { ex, kg: 0, data: '', rm: 0 });
      if (kg > r.kg) { r.kg = kg; r.data = s.data; }
      r.rm = Math.max(r.rm, kg * (1 + reps / 30));
    }
  }
  const listaRec = Object.values(recordes).sort((a, b) => (a.ex.grupo || '').localeCompare(b.ex.grupo || '') || b.rm - a.rm);
  if (listaRec.length) {
    h += `<h3>Recordes de carga</h3><div class="card"><table>
      <tr><th>Exercício</th><th class="num">Maior carga</th><th class="num">1RM est.</th></tr>
      ${listaRec.map((r) => `<tr><td><a href="#/exercicio/${r.ex.id}">${esc(r.ex.nome)}</a><div class="muted small">${esc(r.ex.grupo || '')} · ${fmtData(r.data)}</div></td>
        <td class="num">${fmtKg(r.kg)} ${r.ex.carga === 'halter' ? 'kg/h' : 'kg'}</td><td class="num">${fmtKg(Math.round(r.rm * 2) / 2)}</td></tr>`).join('')}
    </table><p class="muted small">1RM estimado = carga máxima teórica para 1 repetição (fórmula de Epley). É só uma referência: não teste cargas máximas sem orientação.</p></div>`;
  }

  // 7. Progressão: prontos para subir e estagnados (últimos 3 registros com a mesma carga)
  const subir = [], parados = [];
  for (const f of fichasIds()) for (const ex of exerciciosDe(fichaDe(f))) {
    const pts = pontosExercicio(ex);
    if (!pts.length) continue;
    const ult = pts[pts.length - 1];
    if (statusProgressao(ex, ult.series) === 'subir') subir.push({ ex, f });
    else if (pts.length >= 3 && ex.carga !== 'elastico') {
      const ult3 = pts.slice(-3).map((p) => p.kg);
      if (ult3.every((v) => v === ult3[0])) parados.push({ ex, f, v: ult3[0] });
    }
  }
  h += `<h3>Progressão</h3><div class="card">
    <p class="small"><b>Prontos para progredir (${subir.length})</b></p>
    ${subir.length ? subir.map(({ ex, f }) => `<div class="linha entre small" style="padding:6px 0;border-top:1px solid var(--line)"><a href="#/exercicio/${ex.id}">${esc(ex.nome)}</a><span class="tag up">${f} · ${rotuloSubir(ex)}</span></div>`).join('')
    : '<p class="muted small">Nenhum por enquanto.</p>'}
    <p class="small" style="margin-top:12px"><b>Sem evolução nos últimos 3 treinos (${parados.length})</b></p>
    ${parados.length ? parados.map(({ ex, f, v }) => `<div class="linha entre small" style="padding:6px 0;border-top:1px solid var(--line)"><a href="#/exercicio/${ex.id}">${esc(ex.nome)}</a><span class="muted">${f} · ${fmtKg(v)} ${SEM_CARGA(ex) ? 'reps' : 'kg'}</span></div>`).join('')
    : '<p class="muted small">Nenhum. Bom sinal!</p>'}
  </div>`;

  return h + rodapeRel();
}

// 8. Corpo: peso, IMC e evolução do peso
function rodapeRel() {
  const p = db.perfil;
  const peso = pesoEm();
  let h = '';
  if (peso) {
    const i = imc();
    const faixa = !i ? '' : i < 18.5 ? 'abaixo do peso' : i < 25 ? 'peso adequado' : i < 30 ? 'sobrepeso' : 'obesidade';
    const pesos = [...(p.pesos || [])].sort((a, b) => a.data.localeCompare(b.data)).map((x) => ({ data: x.data, kg: x.kg }));
    const idade = idadeEm(p.nascimento);
    h += `<h3>Corpo</h3><div class="kpis">
      <div class="kpi"><b>${fmtKg(peso)} kg</b><span>peso atual</span></div>
      <div class="kpi"><b>${i ? fmtNum(i, 1) : '–'}</b><span>IMC${faixa ? ` · ${faixa} (OMS)` : ''}</span></div>
      ${idade !== null ? `<div class="kpi"><b>${idade}</b><span>anos</span></div>` : ''}
      ${p.altura ? `<div class="kpi"><b>${esc(p.altura)} cm</b><span>altura</span></div>` : ''}
    </div>
    ${pesos.length >= 2 ? `<div class="card"><p class="small muted">Evolução do peso (${fmtData(pesos[0].data)} a ${fmtData(pesos[pesos.length - 1].data)})</p>${grafico(pesos, 100)}</div>`
      : '<p class="muted small" style="margin-top:6px">Registre o peso de tempos em tempos em Ajustes para ver a evolução aqui.</p>'}`;
  }
  return h + `<p class="muted small" style="margin-top:16px">Calorias são estimativas pelo método MET (Compendium of Physical Activities), usando seu peso na data do treino,
    a duração, o cardio feito e o esforço informado. O gasto real varia de pessoa para pessoa.</p>`;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao="rel-periodo"]');
  if (!el) return;
  e.preventDefault();
  periodoRel = el.dataset.p;
  render();
});
