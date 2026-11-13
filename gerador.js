'use strict';

// Criação de programas: assistente de perguntas, gerador por regras e montagem manual pelo catálogo.
// O gerador escolhe exercícios do catálogo (catalogo.js) pelo padrão de movimento, respeitando
// equipamentos disponíveis, exercícios a evitar, limitações e o tempo de cada treino.

const OBJETIVOS = [['hipertrofia', 'Ganhar massa muscular'], ['forca', 'Ganhar força'], ['emagrecimento', 'Emagrecer e condicionar'], ['saude', 'Saúde e bem-estar']];
const NIVEIS = [['iniciante', 'Iniciante', 'Menos de 6 meses de treino, ou voltando agora'], ['intermediario', 'Intermediário', '6 meses a 2 anos de treino regular'], ['avancado', 'Avançado', 'Mais de 2 anos de treino regular']];
const DIVISOES = [['auto', 'O app escolhe', 'Pela frequência e pela experiência'], ['fullbody', 'Corpo inteiro', 'Todos os grupos em cada treino'], ['ab', 'AB', 'Superiores e inferiores'], ['abc', 'ABC', 'Empurrar, puxar e pernas'], ['abcd', 'ABCD', 'Peito, costas, pernas, ombros e braços']];
const MODALIDADES = [['circuito', 'Circuito (em voltas)', 'Uma série de cada exercício do bloco, descanso ao fim da volta'], ['tradicional', 'Séries tradicionais', 'Todas as séries de um exercício, depois o próximo']];
const LOCAIS = [['completa', 'Academia completa', EQUIPAMENTOS], ['predio', 'Academia de prédio', ['Máquina', 'Polia', 'Halteres', 'Peso corporal', 'Elástico']], ['casa', 'Em casa', ['Halteres', 'Peso corporal', 'Elástico']]];
const LIMITACOES = [['joelho', 'Joelho'], ['ombro', 'Ombro'], ['lombar', 'Lombar / coluna']];
const APARELHOS_CARDIO = [['Esteira', 'Esteira'], ['Bicicleta', 'Bicicleta'], ['Elíptico', 'Elíptico'], ['Escada', 'Escada']];

// Exercícios que o gerador evita para cada limitação informada
const EVITAR_POR_LIMITACAO = {
  joelho: ['b2-afundo-reverso', 'cat-agachamento-bulgaro', 'b3-subida-degrau', 'b3-agachamento-smith', 'b2-agachamento-hack', 'cat-agachamento-livre'],
  ombro: ['cat-triceps-mergulho-banco', 'a1-triceps-frances', 'a2-triceps-acima-cabeca-polia', 'a1-pullover-polia', 'cat-pullover-halter', 'a2-supino-reto-barra', 'cat-flexao-de-braco'],
  lombar: ['b-terra-romeno-barra', 'cat-stiff-halteres', 'cat-remada-curvada-barra', 'b3-agachamento-smith', 'b1-agachamento-goblet', 'cat-agachamento-livre'],
};

// Padrões de movimento (os mesmos do catálogo)
const P = {
  supReto: 'Peito · supino reto', supInc: 'Peito · supino inclinado', cruc: 'Peito · crucifixo',
  puxV: 'Costas · puxada vertical', remada: 'Costas · remada', pullover: 'Costas · pullover',
  desenv: 'Ombros · desenvolvimento', elevLat: 'Ombros · elevação lateral', posterior: 'Ombros · posterior',
  rosca: 'Bíceps · rosca', triPolia: 'Tríceps · na polia', triCabeca: 'Tríceps · acima da cabeça', triTesta: 'Tríceps · testa e coice',
  agach: 'Quadríceps · agachamento e leg press', unilat: 'Quadríceps · unilateral', extensora: 'Quadríceps · cadeira extensora',
  terra: 'Posteriores · terra romeno / stiff', flexJoelho: 'Posteriores · flexão de joelho',
  extQuadril: 'Glúteos · extensão de quadril', abducao: 'Glúteos · abdução', pantPe: 'Panturrilhas · em pé', pantSent: 'Panturrilhas · sentado',
};
// Modelos de ficha: padrões em ordem de prioridade (o tempo disponível corta do fim para o começo)
const MODELOS = {
  superiores: { rotulo: 'Superiores', tipo: 'Membros superiores', regiao: 'sup', slots: [P.supReto, P.puxV, P.supInc, P.remada, P.desenv, P.rosca, P.triPolia, P.cruc, P.remada, P.elevLat, P.rosca, P.triCabeca] },
  inferiores: { rotulo: 'Inferiores', tipo: 'Membros inferiores', regiao: 'inf', slots: [P.agach, P.terra, P.extensora, P.flexJoelho, P.extQuadril, P.agach, P.pantPe, P.abducao, P.flexJoelho, P.pantSent] },
  corpo: { rotulo: 'Corpo inteiro', tipo: 'Corpo inteiro', regiao: 'todo', slots: [P.agach, P.supReto, P.puxV, P.terra, P.desenv, P.remada, P.extQuadril, P.supInc, P.flexJoelho, P.rosca, P.triPolia, P.pantPe] },
  empurrar: { rotulo: 'Empurrar', tipo: 'Peito, ombros e tríceps', regiao: 'sup', slots: [P.supReto, P.supInc, P.desenv, P.cruc, P.elevLat, P.triPolia, P.triCabeca, P.elevLat] },
  puxar: { rotulo: 'Puxar', tipo: 'Costas e bíceps', regiao: 'sup', slots: [P.puxV, P.remada, P.remada, P.posterior, P.rosca, P.pullover, P.rosca, P.posterior] },
  pernas: { rotulo: 'Pernas', tipo: 'Pernas e glúteos', regiao: 'inf', slots: [P.agach, P.terra, P.unilat, P.extensora, P.flexJoelho, P.extQuadril, P.pantPe, P.abducao, P.pantSent] },
  peitoTriceps: { rotulo: 'Peito e tríceps', tipo: 'Peito e tríceps', regiao: 'sup', slots: [P.supReto, P.supInc, P.cruc, P.supReto, P.triPolia, P.triCabeca, P.triTesta] },
  costasBiceps: { rotulo: 'Costas e bíceps', tipo: 'Costas e bíceps', regiao: 'sup', slots: [P.puxV, P.remada, P.remada, P.pullover, P.rosca, P.rosca, P.rosca] },
  ombrosBracos: { rotulo: 'Ombros', tipo: 'Ombros e trapézio', regiao: 'sup', slots: [P.desenv, P.elevLat, P.posterior, P.elevLat, P.desenv, P.posterior] },
};

// ---------- Estado do assistente ----------
function respostasPadrao() {
  return {
    objetivo: 'hipertrofia', nivel: 'iniciante', dias: 3, minutos: 60, divisao: 'auto', modalidade: 'circuito',
    cardio: 'inicio', cardioMin: 10, cardioAparelho: 'Esteira', local: 'completa', equip: [...EQUIPAMENTOS],
    limitacoes: [], favoritos: [], evitar: [], prep: true, core: true, mob: true,
    periodoTipo: 'semanas', periodoValor: 8, nome: '',
  };
}
const assist = { passo: 0, r: respostasPadrao() };

function divisaoEfetiva(r) {
  if (r.divisao !== 'auto') return r.divisao;
  if (r.dias <= 2) return 'fullbody';
  if (r.dias === 3) return r.nivel === 'iniciante' ? 'fullbody' : 'abc';
  if (r.dias === 4) return 'ab';
  if (r.dias === 5) return 'abc';
  return 'ab';
}
// Lista de fichas [{id, modelo}] para a divisão e a frequência
function planoDeFichas(r) {
  const div = divisaoEfetiva(r);
  const lista = [];
  if (div === 'fullbody') {
    const n = r.dias >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) lista.push({ id: 'ABC'[i], modelo: 'corpo' });
  } else if (div === 'ab') {
    const v = r.dias >= 6 ? 3 : r.dias >= 4 ? 2 : 1;
    for (let i = 1; i <= v; i++) {
      lista.push({ id: v > 1 ? `A${i}` : 'A', modelo: 'superiores' }, { id: v > 1 ? `B${i}` : 'B', modelo: 'inferiores' });
    }
  } else if (div === 'abc') {
    const v = r.dias >= 6 ? 2 : 1;
    for (let i = 1; i <= v; i++) {
      for (const [l, m] of [['A', 'empurrar'], ['B', 'puxar'], ['C', 'pernas']]) lista.push({ id: v > 1 ? `${l}${i}` : l, modelo: m });
    }
  } else {
    lista.push({ id: 'A', modelo: 'peitoTriceps' }, { id: 'B', modelo: 'costasBiceps' }, { id: 'C', modelo: 'pernas' }, { id: 'D', modelo: 'ombrosBracos' });
  }
  return lista;
}

// ---------- Regras de prescrição ----------
const SERIES_POR_NIVEL = { iniciante: 2, intermediario: 3, avancado: 3 };
const ehComposto = (c) => /supino|puxada|remada|agachamento|terra|desenvolvimento|extensão de quadril|unilateral/i.test(c.padrao);
function repsPara(c, objetivo) {
  if (c.carga === 'elastico') return [10, 12];
  if (objetivo === 'forca') return ehComposto(c) ? [5, 8] : [8, 10];
  if (objetivo === 'emagrecimento') return [12, 15];
  if (objetivo === 'saude') return [10, 15];
  return ehComposto(c) ? [8, 12] : [10, 15];
}
function descansoPara(objetivo, primeiroBloco) {
  if (objetivo === 'forca') return [120, 180];
  if (objetivo === 'emagrecimento') return [30, 60];
  if (objetivo === 'hipertrofia' && primeiroBloco) return [90, 120];
  return [60, 90];
}
const ORDEM_EQUIP = {
  iniciante: ['Máquina', 'Polia', 'Halteres', 'Peso corporal', 'Smith', 'Barra', 'Elástico'],
  intermediario: ['Halteres', 'Máquina', 'Polia', 'Barra', 'Smith', 'Peso corporal', 'Elástico'],
  avancado: ['Barra', 'Halteres', 'Polia', 'Máquina', 'Smith', 'Peso corporal', 'Elástico'],
};

function candidatosPara(slot, r, bloqueados) {
  const permitido = (c) => r.equip.includes(c.equip) && !bloqueados.has(c.id);
  let lista = CATALOGO.filter((c) => c.padrao === slot && permitido(c));
  if (!lista.length) { // sem o equipamento desse movimento: outro exercício do mesmo grupo
    const grupo = slot.split(' · ')[0];
    lista = CATALOGO.filter((c) => c.grupo === grupo && permitido(c));
  }
  return lista;
}

// Tempo aproximado de um exercício no treino (min), para caber no tempo disponível
function minutosDoExercicio(series, descanso, modalidade) {
  const descMed = (descanso[0] + descanso[1]) / 2 / 60;
  return series * (0.8 + (modalidade === 'circuito' ? descMed / 2 : descMed)) + 0.5;
}

// ---------- Complementos (preparação, core, mobilidade) ----------
function complementosDisponiveis() {
  const porId = new Map(), pools = { prepSup: [], prepInf: [], core: [], mobSup: [], mobInf: [] };
  const add = (pool, c) => { if (!porId.has(c.id)) { porId.set(c.id, c); } if (!pools[pool].includes(porId.get(c.id))) pools[pool].push(porId.get(c.id)); };
  for (const f of FICHAS) {
    const t = TREINOS[f], inf = f.startsWith('B');
    for (const c of t.preparacao) add(inf ? 'prepInf' : 'prepSup', c);
    for (const c of t.core || []) add('core', c);
    for (const c of t.mobilidade) add(inf ? 'mobInf' : 'mobSup', c);
  }
  if (!pools.prepInf.length) pools.prepInf = pools.mobInf.slice(0, 2); // preparação de pernas: mobilidade leve
  return pools;
}
const pegarRodando = (lista, n, k) => (lista.length ? Array.from({ length: Math.min(n, lista.length) }, (_, i) => structuredClone(lista[(k * n + i) % lista.length])) : []);

function cardioDe(r, onde) {
  const usa = r.cardio === 'ambos' || r.cardio === onde;
  if (!usa) return null;
  const m = r.cardioMin, ap = r.cardioAparelho;
  if (onde === 'inicio') {
    const leve = Math.max(3, Math.round(m / 3));
    return { titulo: `Cardio inicial · ${m} min`, min: m, texto: `${ap}: ${leve} min leves + ${m - leve} min moderados (esforço 5-6/10). Sem cansar para a musculação.` };
  }
  return { titulo: `Cardio final · ${m} min`, min: m, texto: `${ap}: ${Math.max(1, m - 3)} min moderados + 3 min leves.` };
}

function instrucoesDe(r, series) {
  return r.modalidade === 'circuito'
    ? `${series} voltas por bloco = ${series} séries por exercício. Faça uma série de cada exercício do bloco em sequência, sem descanso entre eles; descanse ao fim da volta e repita o bloco antes de avançar. Termine cada série com 2-3 repetições de reserva.`
    : `${series} séries por exercício. Complete as séries de um exercício, descansando entre elas, antes de passar ao próximo. Termine cada série com 2-3 repetições de reserva.`;
}
function avisosDe(r) {
  const a = [];
  if (r.nivel === 'iniciante') a.push('Nas primeiras semanas, use cargas leves para aprender a técnica de cada exercício.');
  if (r.limitacoes.length) {
    const nomes = r.limitacoes.map((l) => LIMITACOES.find(([v]) => v === l)[1].toLowerCase()).join(', ');
    a.push(`Você indicou atenção com: ${nomes}. Use amplitude confortável, pare se houver dor e procure orientação de um profissional.`);
  }
  a.push('Aproximação: faça 1-2 séries leves do primeiro exercício antes de começar.');
  return a;
}
function resumoDe(exs) {
  const cont = {};
  for (const e of exs) if (e.grupo) cont[e.grupo] = (cont[e.grupo] || 0) + 1;
  return Object.entries(cont).map(([g, n]) => `${n} ${g.toLowerCase()}`).join(' · ');
}

// Agrupa os exercícios em blocos de 2 (sobrando 1, junta ao último bloco)
function montarBlocos(exs, r, series) {
  const blocos = [];
  for (let i = 0; i < exs.length; i += 2) blocos.push(exs.slice(i, i + 2));
  if (blocos.length > 1 && blocos[blocos.length - 1].length === 1) blocos[blocos.length - 2].push(blocos.pop()[0]);
  return blocos.map((lista, i) => ({
    nome: `Bloco ${i + 1}`, foco: [...new Set(lista.map((e) => e.grupo))].join(' / '),
    voltas: series, descanso: descansoPara(r.objetivo, i === 0), ...(r.modalidade === 'tradicional' ? { modo: 'series' } : {}),
    exercicios: lista,
  }));
}

// ---------- Gerador ----------
function gerarPrograma(r, { vazio = false } = {}) {
  const series = SERIES_POR_NIVEL[r.nivel];
  const bloqueados = new Set([...r.evitar, ...r.limitacoes.flatMap((l) => EVITAR_POR_LIMITACAO[l] || [])]);
  const usos = {}; // vezes que cada exercício já entrou no programa (para variar entre fichas)
  const ordemEquip = ORDEM_EQUIP[r.nivel];
  const pools = complementosDisponiveis();
  const minComp = (r.prep ? 4 : 0) + (r.core ? 5 : 0) + (r.mob ? 4 : 0);
  const minCardio = (r.cardio === 'ambos' ? 2 : r.cardio === 'nenhum' ? 0 : 1) * r.cardioMin;
  const minForca = Math.max(15, r.minutos - minComp - minCardio - 3);

  const plano = planoDeFichas(r);
  const fichas = {};
  plano.forEach(({ id, modelo }, k) => {
    const m = MODELOS[modelo];
    const exs = [];
    if (!vazio) {
      let tempo = 0;
      for (const slot of m.slots) {
        const cands = candidatosPara(slot, r, bloqueados).filter((c) => !exs.some((e) => e.id === c.id));
        if (!cands.length) continue;
        cands.sort((a, b) => ((usos[a.id] || 0) * 10 - (r.favoritos.includes(a.id) ? 20 : 0) + ordemEquip.indexOf(a.equip))
          - ((usos[b.id] || 0) * 10 - (r.favoritos.includes(b.id) ? 20 : 0) + ordemEquip.indexOf(b.equip)));
        const c = cands[0];
        const desc = descansoPara(r.objetivo, exs.length < 2);
        const t = minutosDoExercicio(series, desc, r.modalidade);
        if (exs.length >= 3 && tempo + t > minForca) break;
        tempo += t;
        usos[c.id] = (usos[c.id] || 0) + 1;
        exs.push({ ...paraFicha(c), reps: repsPara(c, r.objetivo) });
      }
    }
    const reg = m.regiao;
    const prepPool = reg === 'inf' ? pools.prepInf : pools.prepSup;
    const mobPool = reg === 'inf' ? pools.mobInf : reg === 'sup' ? pools.mobSup : [...pools.mobSup, ...pools.mobInf];
    fichas[id] = {
      titulo: `Treino ${id}`, tipo: m.tipo, tipoCurto: m.rotulo, resumo: vazio ? '' : resumoDe(exs),
      instrucoes: instrucoesDe(r, series), cardioInicial: cardioDe(r, 'inicio'), cardioFinal: cardioDe(r, 'fim'),
      preparacao: r.prep ? pegarRodando(prepPool, 2, k) : [], avisos: avisosDe(r),
      core: r.core ? pegarRodando(pools.core, 2, k) : [], mobilidade: r.mob ? pegarRodando(mobPool, 2, k) : [],
      progressao: PROGRESSAO,
      blocos: vazio
        ? [{ nome: 'Bloco 1', foco: m.rotulo, voltas: series, descanso: descansoPara(r.objetivo, true), ...(r.modalidade === 'tradicional' ? { modo: 'series' } : {}), exercicios: [] }]
        : montarBlocos(exs, r, series),
    };
  });
  return {
    id: `prog-${uid()}`, nome: r.nome || nomeSugerido(r), origem: vazio ? 'manual' : 'gerado', criadoEm: isoDia(), inicio: isoDia(), baseSessoes: 0,
    periodicidade: { tipo: r.periodoTipo, valor: r.periodoTipo === 'livre' ? 0 : r.periodoValor },
    ordem: plano.map((x) => x.id), fichas, config: structuredClone(r),
  };
}
function nomeSugerido(r) {
  const obj = { hipertrofia: 'Hipertrofia', forca: 'Força', emagrecimento: 'Condicionamento', saude: 'Saúde' }[r.objetivo];
  const div = { fullbody: 'Full body', ab: 'AB', abc: 'ABC', abcd: 'ABCD' }[divisaoEfetiva(r)];
  return `${obj} ${div}`;
}

// ---------- Telas do assistente ----------
const PASSOS = [
  { titulo: 'Qual é o seu objetivo principal?', html: (r) => opcoesUnicas('objetivo', OBJETIVOS.map(([v, t]) => [v, t]), r.objetivo) },
  { titulo: 'Qual é a sua experiência com musculação?', html: (r) => opcoesUnicas('nivel', NIVEIS, r.nivel) },
  { titulo: 'Quantos dias por semana e quanto tempo por treino?', html: (r) => `
      <p class="small muted">Dias por semana</p>${opcoesUnicas('dias', [2, 3, 4, 5, 6].map((d) => [d, `${d}`]), r.dias, true)}
      <p class="small muted" style="margin-top:14px">Minutos por treino (com cardio e alongamentos)</p>${opcoesUnicas('minutos', [30, 45, 60, 75, 90].map((m) => [m, `${m}`]), r.minutos, true)}` },
  { titulo: 'Como prefere dividir os treinos?', html: (r) => `${opcoesUnicas('divisao', DIVISOES, r.divisao)}
      <p class="small muted" style="margin-top:8px">Com ${r.dias} dias por semana, a sugestão é: <b>${esc(DIVISOES.find(([v]) => v === divisaoEfetiva({ ...r, divisao: 'auto' }))[1])}</b>.</p>` },
  { titulo: 'Como prefere executar os exercícios?', html: (r) => opcoesUnicas('modalidade', MODALIDADES, r.modalidade) },
  { titulo: 'Cardio no treino?', html: (r) => `${opcoesUnicas('cardio', [['nenhum', 'Sem cardio'], ['inicio', 'No início'], ['fim', 'No fim'], ['ambos', 'No início e no fim']], r.cardio)}
      ${r.cardio === 'nenhum' ? '' : `<p class="small muted" style="margin-top:14px">Minutos de cada cardio</p>${opcoesUnicas('cardioMin', [5, 10, 15, 20, 30].map((m) => [m, `${m}`]), r.cardioMin, true)}
      <p class="small muted" style="margin-top:14px">Aparelho</p>${opcoesUnicas('cardioAparelho', APARELHOS_CARDIO, r.cardioAparelho, true)}`}` },
  { titulo: 'Onde você vai treinar?', html: (r) => `${opcoesUnicas('local', LOCAIS.map(([v, t]) => [v, t]), r.local)}
      <p class="small muted" style="margin-top:14px">Equipamentos disponíveis (toque para marcar ou desmarcar)</p>
      ${opcoesMultiplas('equip', EQUIPAMENTOS.map((e) => [e, e]), r.equip)}` },
  { titulo: 'Tem alguma dor ou limitação?', html: (r) => `${opcoesMultiplas('limitacoes', LIMITACOES, r.limitacoes)}
      <p class="small muted" style="margin-top:10px">Os exercícios de mais risco para a região marcada ficam de fora. Em caso de dor, procure um profissional antes de treinar.</p>` },
  { titulo: 'Exercícios que você gosta ou quer evitar (opcional)', html: (r) => telaPreferencias(r) },
  { titulo: 'Incluir no treino', html: (r) => opcoesMultiplas('extras', [['prep', 'Preparação (aquecimento específico)'], ['core', 'Core (abdômen e lombar)'], ['mob', 'Mobilidade e alongamento']], ['prep', 'core', 'mob'].filter((k) => r[k])) },
  { titulo: 'Por quanto tempo vai seguir este programa?', html: (r) => `${opcoesUnicas('periodoTipo', TIPOS_PERIODO, r.periodoTipo)}
      ${r.periodoTipo === 'livre' ? '' : `<label class="form" style="margin-top:12px">Quantidade<input class="input-texto" inputmode="numeric" data-cr-num="periodoValor" value="${r.periodoValor}"></label>
      <p class="small muted">Ex.: 24 sessões, ou 8 semanas. No fim, o app avisa que é hora de trocar o treino.</p>`}` },
  { titulo: 'Pronto! Como quer montar as fichas?', html: (r) => `
      <label class="form">Nome do programa<input class="input-texto" data-cr-texto="nome" value="${esc(r.nome || nomeSugerido(r))}"></label>
      <div class="card small" style="margin-top:12px">${esc(DIVISOES.find(([v]) => v === divisaoEfetiva(r))[1])} · ${planoDeFichas(r).length} fichas
        (${planoDeFichas(r).map((x) => `${x.id} ${MODELOS[x.modelo].rotulo}`).join(', ')}) · ${r.minutos} min · ${esc(MODALIDADES.find(([v]) => v === r.modalidade)[1])}</div>
      <button class="btn" data-acao="cr-gerar">Gerar automaticamente</button>
      <p class="small muted">O app escolhe os exercícios; você revisa e ajusta antes de começar.</p>
      <button class="btn sec" data-acao="cr-manual">Montar eu mesmo pelo catálogo</button>
      <p class="small muted">O app cria as fichas vazias com as suas escolhas; você adiciona os exercícios.</p>` },
];

function opcoesUnicas(campo, opcoes, atual, compacto = false) {
  return `<div class="${compacto ? 'opcoes' : 'escolhas'}">${opcoes.map(([v, t, d]) => `<button class="${String(v) === String(atual) ? 'sel' : ''}"
    data-acao="cr-op" data-campo="${campo}" data-valor="${esc(v)}"><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ''}</button>`).join('')}</div>`;
}
function opcoesMultiplas(campo, opcoes, marcados) {
  return `<div class="opcoes">${opcoes.map(([v, t]) => `<button class="${marcados.includes(v) ? 'sel' : ''}"
    data-acao="cr-multi" data-campo="${campo}" data-valor="${esc(v)}">${marcados.includes(v) ? '✓ ' : ''}${esc(t)}</button>`).join('')}</div>`;
}
function telaPreferencias(r) {
  const itens = CATALOGO.filter((c) => r.equip.includes(c.equip));
  let h = '<p class="small muted">♥ = prefiro · ✕ = evitar. Pode pular esta etapa.</p>';
  for (const g of GRUPOS) {
    const doGrupo = itens.filter((c) => c.grupo === g);
    if (!doGrupo.length) continue;
    const marcados = doGrupo.filter((c) => r.favoritos.includes(c.id) || r.evitar.includes(c.id)).length;
    h += `<details class="card"><summary><b>${esc(g)}</b> <span class="muted small">${doGrupo.length} exercícios${marcados ? ` · ${marcados} marcados` : ''}</span></summary>
      ${doGrupo.map((c) => `<div class="linha entre pref-item"><span class="small">${esc(c.nome)} <span class="muted">· ${esc(c.equip)}</span></span>
        <span class="linha" style="gap:6px">
          <button class="btn-mini ${r.favoritos.includes(c.id) ? 'pref-sim' : ''}" data-acao="cr-pref" data-tipo="favoritos" data-id="${c.id}" aria-label="Prefiro">♥</button>
          <button class="btn-mini ${r.evitar.includes(c.id) ? 'pref-nao' : ''}" data-acao="cr-pref" data-tipo="evitar" data-id="${c.id}" aria-label="Evitar">✕</button>
        </span></div>`).join('')}</details>`;
  }
  return h;
}

function telaCriar() {
  if (assist.passo === 0) {
    return `<a href="#/treinos" class="small">‹ Treinos</a><h1>Novo programa</h1>
      <p class="muted small">Escolha como quer criar o seu treino.</p>
      <button class="escolha-grande" data-acao="cr-iniciar"><b>Criar com o assistente</b><span>Responda algumas perguntas e o app gera as fichas, ou monte você mesmo pelo catálogo.</span></button>
      <a class="escolha-grande" href="#/importar"><b>Importar um treino pronto</b><span>Envie o PDF da ficha (ou cole o texto) que o app reconhece os exercícios.</span></a>
      <button class="escolha-grande" data-acao="cr-modelo"><b>Usar o modelo AB</b><span>6 fichas em circuito (superiores e inferiores), com vídeos, para 6 dias por semana.</span></button>`;
  }
  const i = assist.passo - 1, passo = PASSOS[i];
  return `<div class="linha entre"><button class="link-btn" style="width:auto;padding:0" data-acao="cr-voltar">‹ Voltar</button>
      <span class="small muted">${i + 1} de ${PASSOS.length}</span></div>
    <div class="progresso-barra"><i style="width:${((i + 1) / PASSOS.length) * 100}%"></i></div>
    <h1 style="font-size:22px">${esc(passo.titulo)}</h1>
    <div class="assistente">${passo.html(assist.r)}</div>
    ${i < PASSOS.length - 1 ? '<div class="barra-fixa"><button class="btn" data-acao="cr-avancar">Continuar</button></div>' : ''}`;
}

function criarEAbrir(p) {
  if (!podeTrocarPrograma()) return;
  adicionarPrograma(p);
  assist.passo = 0; assist.r = respostasPadrao();
  toast(`Programa criado: ${p.nome}`);
  location.hash = `#/programa/${p.id}`;
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el || !el.dataset.acao.startsWith('cr-')) return;
  const acao = el.dataset.acao, r = assist.r;
  if (acao === 'cr-iniciar') { assist.passo = 1; render(); }
  else if (acao === 'cr-voltar') { assist.passo = Math.max(0, assist.passo - 1); render(); }
  else if (acao === 'cr-avancar') {
    if (PASSOS[assist.passo - 1].titulo.startsWith('Onde') && !r.equip.length) return toast('Marque pelo menos um equipamento');
    if (r.periodoTipo !== 'livre' && !(r.periodoValor >= 1)) return toast('Informe a duração do programa');
    assist.passo++; window.scrollTo(0, 0); render();
  } else if (acao === 'cr-op') {
    const { campo, valor } = el.dataset;
    r[campo] = ['dias', 'minutos', 'cardioMin'].includes(campo) ? +valor : valor;
    if (campo === 'local') r.equip = [...LOCAIS.find(([v]) => v === valor)[2]];
    if (campo === 'periodoTipo') r.periodoValor = { sessoes: 24, dias: 30, semanas: 8, meses: 2, livre: 0 }[valor];
    render();
  } else if (acao === 'cr-multi') {
    const { campo, valor } = el.dataset;
    if (campo === 'extras') r[valor] = !r[valor];
    else r[campo] = r[campo].includes(valor) ? r[campo].filter((x) => x !== valor) : [...r[campo], valor];
    render();
  } else if (acao === 'cr-pref') {
    const { tipo, id } = el.dataset, outro = tipo === 'favoritos' ? 'evitar' : 'favoritos';
    r[tipo] = r[tipo].includes(id) ? r[tipo].filter((x) => x !== id) : [...r[tipo], id];
    r[outro] = r[outro].filter((x) => x !== id);
    render();
  } else if (acao === 'cr-gerar') criarEAbrir(gerarPrograma(r));
  else if (acao === 'cr-manual') criarEAbrir(gerarPrograma(r, { vazio: true }));
  else if (acao === 'cr-modelo') {
    const id = programaPorId(ID_PADRAO) ? `prog-${uid()}` : ID_PADRAO;
    criarEAbrir(programaPadrao(id));
  }
});
document.addEventListener('input', (e) => {
  const num = e.target.dataset.crNum, txt = e.target.dataset.crTexto;
  if (num) assist.r[num] = parseInt(e.target.value, 10) || 0;
  if (txt) assist.r[txt] = e.target.value;
});
