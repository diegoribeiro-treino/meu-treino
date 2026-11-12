'use strict';

// ---------- Armazenamento ----------
const STORE_KEY = 'meutreino:v1';
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const UNIDADE = { halter: 'kg/halter', total: 'kg', unico: 'kg', assist: 'kg de assistência', corporal: '', elastico: '' };
const UNIDADE_CURTA = { halter: 'kg/h', total: 'kg', unico: 'kg', assist: 'assist', elastico: '' };
const SEM_CARGA = (ex) => ex.carga === 'corporal';

function novoDb() {
  return {
    versao: 1, sessoes: [], ativa: null, config: { telaLigada: true },
    fichas: {}, // fichas editadas no app (substituem as de treinos.js)
    perfil: { nascimento: '', altura: '', pesos: [] }, // pesos: [{ data, kg }]
  };
}
function carregar() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(novoDb(), JSON.parse(raw));
  } catch (e) { /* dados ilegíveis: começa do zero */ }
  return novoDb();
}
let db = carregar();
function salvar() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch (e) { toast('Não foi possível salvar no aparelho'); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- Utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const isoDia = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dataDeIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtData = (iso) => { const d = dataDeIso(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const fmtDataLonga = (iso) => { const d = dataDeIso(iso); return `${DIAS_LONGOS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtSeg = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const fmtCron = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); return h ? `${h}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtKg = (v) => { const n = num(v); return n === null ? '–' : String(n).replace('.', ','); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200);
}

// ---------- Regras de treino ----------
const exerciciosDe = (t) => t.blocos.flatMap((b) => b.exercicios);
// Ficha em uso: a versão editada no app, se houver; senão a original de treinos.js
const fichaDe = (id) => (db.fichas && db.fichas[id]) || TREINOS[id];

// Dados de um exercício pelo id: fichas atuais, depois as originais, depois a cópia guardada na sessão
// (para exercícios que foram removidos ou trocados depois do treino).
function exInfo(id, sessao) {
  for (const f of FICHAS) { const e = exerciciosDe(fichaDe(f)).find((x) => x.id === id); if (e) return e; }
  for (const f of FICHAS) { const e = exerciciosDe(TREINOS[f]).find((x) => x.id === id); if (e) return e; }
  const n = sessao && sessao.nomes && sessao.nomes[id];
  return n ? { id, ...n } : { id, nome: id, grupo: '', carga: 'total', reps: [0, 0] };
}

// Garante que a sessão em andamento tem séries para todos os exercícios da ficha
// (a ficha pode ter sido editada no meio do treino).
function sincronizarSeries(a, t) {
  for (const b of t.blocos) for (const ex of b.exercicios) {
    const s = (a.series[ex.id] ??= []);
    while (s.length < b.voltas) s.push({ kg: s.length ? s[s.length - 1].kg : '', reps: '', ok: false });
    while (s.length > b.voltas && !s[s.length - 1].ok) s.pop();
  }
}
// Sugestão: a ficha seguinte à última feita, na ordem de FICHAS (A1 quando ainda não há treinos)
function proximaFicha() {
  const ult = sessoesOrdenadas()[0];
  if (!ult) return FICHAS[0];
  return FICHAS[(FICHAS.indexOf(ult.treino) + 1) % FICHAS.length];
}
let fichaEscolhida = null; // escolha feita na tela Hoje (vale até recarregar o app)
const sessoesOrdenadas = () => [...db.sessoes].sort((a, b) => b.inicio - a.inicio);

function ultimoRegistro(exId, excetoId) {
  for (const s of sessoesOrdenadas()) {
    if (s.id === excetoId) continue;
    const series = s.series[exId];
    if (series && series.some((x) => x.ok)) return { sessao: s, series };
  }
  return null;
}

// Regra da ficha: topo da faixa em todas as séries => subir a carga.
function statusProgressao(ex, series) {
  if (!series || !series.length || !series.every((x) => x.ok)) return null;
  return series.every((x) => num(x.reps) >= ex.reps[1]) ? 'subir' : 'manter';
}

const ROTULO_SUBIR = { assist: '↓ Reduzir assistência', corporal: '↑ Progredir', elastico: '↑ Elástico mais forte' };
const rotuloSubir = (ex) => ROTULO_SUBIR[ex.carga] || '↑ Subir carga';
const faixaReps = (ex) => `${ex.reps[0]}-${ex.reps[1]} ${ex.lado ? 'reps ' + ex.lado : 'reps'}`;

function fmtCarga(ex, v) {
  if (ex.carga === 'elastico') return esc(v || '–');
  return fmtKg(v);
}
function resumoSeries(series, ex) {
  return series.filter((x) => x.ok)
    .map((x) => (SEM_CARGA(ex) ? `${x.reps} reps` : `${fmtCarga(ex, x.kg)}×${x.reps}`)).join(' · ');
}
// Valor usado nos gráficos: maior carga, ou maior nº de reps para exercícios sem carga.
// Elástico não tem gráfico (a carga é uma cor/nível).
function metrica(ex, series) {
  const feitas = series.filter((x) => x.ok);
  if (ex.carga === 'elastico' || !feitas.length) return null;
  const vals = feitas.map((x) => num(SEM_CARGA(ex) ? x.reps : x.kg)).filter((v) => v !== null);
  return vals.length ? Math.max(...vals) : null;
}

function contarSeries(t, series) {
  let total = 0, feitas = 0;
  for (const b of t.blocos) total += b.voltas * b.exercicios.length;
  for (const id in series) feitas += series[id].filter((x) => x.ok).length;
  return { total, feitas };
}

// ---------- Sessão ativa ----------
// dataManual (YYYY-MM-DD): registro de um treino feito fora do app, sem cronômetro nem descanso
function iniciarTreino(fichaId, dataManual = null) {
  const t = fichaDe(fichaId);
  if (!t) return toast(`Ficha ${fichaId} ainda não cadastrada`);
  if (db.ativa) {
    if (db.ativa.treino === fichaId && (db.ativa.dataManual || null) === dataManual) return (location.hash = '#/treino');
    if (!confirm(`Há um treino ${db.ativa.treino} em andamento. Descartar e iniciar o ${fichaId}?`)) return;
  }
  const series = {}, extras = {};
  for (const b of t.blocos) for (const ex of b.exercicios) {
    const ult = ultimoRegistro(ex.id);
    series[ex.id] = Array.from({ length: b.voltas }, (_, i) => {
      const ant = ult && (ult.series[i] || ult.series[ult.series.length - 1]);
      return { kg: ant && !SEM_CARGA(ex) ? ant.kg : '', reps: '', ok: false };
    });
    if (ex.extra) extras[ex.id] = (ult && ult.sessao.extras && ult.sessao.extras[ex.id]) || '';
  }
  db.ativa = {
    id: uid(), treino: fichaId, inicio: Date.now(), series, extras,
    checks: { cardioIni: false, prep: t.preparacao.map(() => false), core: (t.core || []).map(() => false), mob: t.mobilidade.map(() => false) },
    descanso: null, dataManual,
  };
  salvar();
  location.hash = '#/treino';
}

function iniciarDescanso(bloco, rotulo) {
  if (db.ativa.dataManual) return;
  db.ativa.descanso = { inicio: Date.now(), min: bloco.descanso[0], max: bloco.descanso[1], rotulo };
  avisos.min = avisos.max = false;
  salvar();
  tick();
}

// ---------- Som e tela ligada ----------
let audioCtx = null;
function destravarAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function bip(vezes = 1) {
  if (!audioCtx) return;
  for (let i = 0; i < vezes; i++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    const t0 = audioCtx.currentTime + i * 0.25;
    o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    o.start(t0); o.stop(t0 + 0.2);
  }
  if (navigator.vibrate) navigator.vibrate(200);
}

let wakeLock = null;
async function atualizarTelaLigada() {
  const querer = db.config.telaLigada && db.ativa && rotaAtual().pag === 'treino' && document.visibilityState === 'visible';
  try {
    if (querer && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!querer && wakeLock) {
      await wakeLock.release(); wakeLock = null;
    }
  } catch (e) { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => { atualizarTelaLigada(); tick(); });

// ---------- Relógio (cronômetro do treino e descanso) ----------
const avisos = { min: false, max: false };
function tick() {
  const a = db.ativa;
  const cron = $('#cron');
  if (cron && a) cron.textContent = a.dataManual ? `Registro de ${fmtData(a.dataManual)}` : fmtCron(Date.now() - a.inicio);

  const barra = $('#descanso');
  const d = a && a.descanso;
  if (!d) { barra.hidden = true; document.body.classList.remove('com-descanso'); return; }
  const passado = (Date.now() - d.inicio) / 1000;
  const faltaMin = d.min - passado;
  let estado, tempo, info;
  if (faltaMin > 0) {
    estado = ''; tempo = fmtSeg(faltaMin); info = `Descanso ${d.min}-${d.max} s`;
  } else if (passado < d.max) {
    estado = 'pronto'; tempo = fmtSeg(d.max - passado); info = 'Já pode ir · até o máximo';
    if (!avisos.min) { avisos.min = true; bip(2); }
  } else {
    estado = 'passou'; tempo = '+' + fmtSeg(passado - d.max); info = 'Descanso máximo atingido';
    if (!avisos.max) { avisos.max = true; bip(3); }
  }
  barra.className = 'descanso ' + estado;
  barra.innerHTML = `<div class="tempo">${tempo}</div>
    <div class="cresce small"><b>${esc(d.rotulo)}</b><div class="muted">${info}</div></div>
    <button class="btn-mini" data-acao="descanso-mais">+15s</button>
    <button class="btn-mini" data-acao="descanso-fim">✕</button>`;
  barra.hidden = false;
  document.body.classList.add('com-descanso');
}
setInterval(tick, 1000);

// ---------- Rotas ----------
function rotaAtual() {
  const [pag, ...args] = (location.hash.replace(/^#\/?/, '') || 'hoje').split('/').map(decodeURIComponent);
  return { pag, arg: args[0], args };
}

// As telas de editor.js (Treinos) e relatorios.js (Relatórios) são carregadas antes deste arquivo
const telas = {
  hoje: telaHoje, registrar: telaRegistrar, treino: telaTreino, finalizar: telaFinalizar, historico: telaHistorico, sessao: telaSessao,
  progresso: telaProgresso, exercicio: telaExercicio, ajustes: telaAjustes,
  treinos: telaTreinos, ficha: telaFicha, 'editar-ex': telaEditarEx, 'editar-bloco': telaEditarBloco, 'editar-textos': telaEditarTextos,
  relatorios: telaRelatorios,
};

let ultimaPag = null;
function render() {
  const { pag, arg, args } = rotaAtual();
  const fn = telas[pag] || telaHoje;
  const mesmaPag = pag === ultimaPag;
  const y = window.scrollY;
  app.innerHTML = fn(arg, args);
  window.scrollTo(0, mesmaPag ? y : 0);
  ultimaPag = pag;
  const aba = {
    treino: 'hoje', finalizar: 'hoje', registrar: 'hoje', sessao: 'historico', exercicio: 'progresso',
    ficha: 'treinos', 'editar-ex': 'treinos', 'editar-bloco': 'treinos', 'editar-textos': 'treinos',
  }[pag] || pag;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('sel', a.dataset.tab === aba));
  tick();
  atualizarTelaLigada();
}
window.addEventListener('hashchange', render);

// ---------- Tela: Hoje ----------
function telaHoje() {
  const hoje = new Date();
  const iso = isoDia(hoje);
  const sugestao = proximaFicha();
  const ficha = fichaEscolhida || sugestao;
  const feitasHoje = db.sessoes.filter((s) => s.data === iso);
  let h = `<p class="muted">${fmtDataLonga(iso)}</p><h1>Hoje</h1>`;

  if (db.ativa) {
    const t = fichaDe(db.ativa.treino);
    const { total, feitas } = contarSeries(t, db.ativa.series);
    h += `<div class="card destaque">
      <div class="linha entre"><span class="tag ac">Em andamento</span><span class="cron" id="cron"></span></div>
      <h2 style="margin-top:8px">${esc(t.titulo)} · ${esc(t.tipo)}</h2>
      <p class="muted small">${feitas} de ${total} séries feitas</p>
      <a class="btn" href="#/treino">Continuar treino</a></div>`;
  } else {
    const t = fichaDe(ficha);
    const ult = sessoesOrdenadas().find((s) => s.treino === ficha);
    const rotulo = ficha === sugestao ? 'Próximo da sequência' : 'Escolhido para hoje';
    h += `<div class="card destaque">
      <div class="linha entre"><span class="tag ac">${rotulo}</span>${feitasHoje.length ? `<span class="tag ok">✓ Hoje: ${feitasHoje.map((s) => s.treino).join(', ')}</span>` : ''}</div>
      <h2 style="margin-top:8px">${esc(t.titulo)} · ${esc(t.tipo)}</h2>
      <p class="muted small">${esc(t.resumo)}</p>
      <p class="muted small">${exerciciosDe(t).length} exercícios · ${contarSeries(t, {}).total} séries${ult ? ` · último em ${fmtData(ult.data)}` : ' · nunca feito'}</p>
      <button class="btn" data-acao="iniciar" data-ficha="${ficha}">Iniciar ${esc(ficha)}</button></div>`;
  }

  if (!db.ativa) {
    h += `<h3>Escolha o treino de hoje</h3><div class="fichas">`;
    for (const f of FICHAS) {
      const ult = sessoesOrdenadas().find((s) => s.treino === f);
      h += `<button class="ficha ${f === ficha ? 'sel' : ''}" data-acao="escolher" data-ficha="${f}">
        <b>${f}</b><span>${TIPO_FICHA[f]}</span><span>${ult ? 'Último ' + fmtData(ult.data) : 'Nunca feito'}</span>
        ${f === sugestao ? '<span class="prox">próximo</span>' : ''}</button>`;
    }
    h += `</div><p class="muted small" style="margin-top:8px">Toque numa ficha para escolher. Qualquer dia pode ser de treino ou de descanso, inclusive o domingo.</p>
      <a class="btn sec" href="#/registrar">+ Registrar treino feito fora do app</a>`;
  }

  // Semana atual (segunda a domingo): mostra o que foi feito em cada dia
  const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  h += `<h3>Esta semana</h3><div class="semana">`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(seg); d.setDate(seg.getDate() + i);
    const di = isoDia(d);
    const feitas = db.sessoes.filter((s) => s.data === di).map((s) => s.treino);
    h += `<div class="dia ${di === iso ? 'hoje' : ''} ${feitas.length ? 'feito' : ''}">${DIAS[d.getDay()]}<b>${feitas.length ? feitas.join('+') : '–'}</b></div>`;
  }
  const naSemana = db.sessoes.filter((s) => s.data >= isoDia(seg)).length;
  h += `</div><p class="muted small" style="margin-top:8px">${naSemana} treino${naSemana === 1 ? '' : 's'} nesta semana</p>`;
  return h;
}

// ---------- Tela: Registrar treino feito fora do app ----------
const registro = { data: null, ficha: null };
function telaRegistrar() {
  const hoje = isoDia();
  registro.data ??= hoje;
  let h = `<a href="#/hoje" class="small">‹ Hoje</a><h1>Registrar treino</h1>
    <p class="muted small">Para um treino feito sem o app. Ele entra no histórico e na sequência de sugestões. Anote só o que lembrar.</p>
    <div class="card"><h2>Data do treino</h2>
      <input type="date" class="input-texto" data-reg="data" value="${registro.data}" max="${hoje}"></div>
    <div class="card"><h2>Qual ficha?</h2><div class="fichas" style="margin-top:8px">`;
  for (const f of FICHAS) {
    h += `<button class="ficha ${f === registro.ficha ? 'sel' : ''}" data-acao="registro-ficha" data-ficha="${f}"><b>${f}</b><span>${TIPO_FICHA[f]}</span></button>`;
  }
  h += `</div></div>
    <button class="btn" data-acao="registro-abrir" ${registro.ficha ? '' : 'disabled style="opacity:.5"'}>${registro.ficha ? `Anotar ${registro.ficha} de ${fmtData(registro.data)}` : 'Escolha a ficha'}</button>`;
  return h;
}

// ---------- Vídeo do exercício ----------
// Mostra só a miniatura; o vídeo carrega ao tocar, em loop e sem som (como um GIF).
function videoExercicio(ex) {
  if (!ex.video) return '';
  const id = esc(ex.video);
  return `<div class="video ${ex.vertical ? 'vertical' : ''}" data-acao="video" data-video="${id}">
    <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
    <span class="play">▶</span><span class="video-rotulo">Ver execução</span></div>`;
}

function abrirVideo(el) {
  if (!navigator.onLine) return toast('Sem internet: o vídeo precisa de conexão');
  const id = el.dataset.video;
  const params = `autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1`;
  el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?${params}" title="Vídeo de execução"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  el.classList.add('aberto');
  el.removeAttribute('data-acao');
}

// ---------- Tela: Treino em execução ----------
function checkItem(grupo, i, texto, on) {
  return `<div class="check ${on ? 'on' : ''}" data-acao="check" data-grupo="${grupo}" data-i="${i}">
    <span class="caixa">✓</span><span class="txt small">${esc(texto)}</span></div>`;
}

function telaTreino() {
  const a = db.ativa;
  if (!a) return `<div class="vazio"><p>Nenhum treino em andamento.</p><a class="btn" href="#/hoje">Voltar</a></div>`;
  const t = fichaDe(a.treino);
  sincronizarSeries(a, t);
  const { total, feitas } = contarSeries(t, a.series);

  let h = `<div class="topo-treino">
    <div class="linha entre"><div><b>${esc(t.titulo)}</b> <span class="muted small">· ${esc(t.tipo)}</span></div><span class="cron" id="cron"></span></div>
    <div class="small muted" style="margin-top:2px"><span id="contador">${feitas}/${total} séries</span></div>
    <div class="progresso-barra"><i id="barra" style="width:${(feitas / total) * 100}%"></i></div></div>`;

  if (a.dataManual) {
    h += `<div class="card destaque small">Registro de <b>${fmtDataLonga(a.dataManual)}</b>: anote cargas e repetições que lembrar e marque ✓. Séries não marcadas não contam. Sem cronômetro nem descanso.</div>`;
  }
  h += `<div class="card"><details><summary class="small muted">Como executar ▾</summary><p class="small muted">${esc(t.instrucoes)}</p></details></div>`;

  h += `<div class="card"><h2>${esc(t.cardioInicial.titulo)}</h2>${checkItem('cardioIni', 0, t.cardioInicial.texto, a.checks.cardioIni)}</div>`;
  h += `<div class="card"><h2>${esc(t.tituloPreparacao || 'Preparação')}</h2>${t.preparacao.map((p, i) => checkItem('prep', i, p, a.checks.prep[i])).join('')}</div>`;

  let n = 0;
  for (const b of t.blocos) {
    const meta = b.modo === 'series'
      ? `${b.voltas} séries por exercício · descanso ${b.descanso[0]}-${b.descanso[1]} s entre séries`
      : `${b.voltas} voltas · descanso ${b.descanso[0]}-${b.descanso[1]} s após cada volta`;
    h += `<div class="card"><div class="bloco-head"><h2>${esc(b.nome)} <span class="muted small">· ${esc(b.foco)}</span></h2></div>
      <p class="muted small">${meta}</p>`;
    for (const ex of b.exercicios) {
      n++;
      const ult = ultimoRegistro(ex.id, a.id);
      const st = ult && statusProgressao(ex, ult.series);
      const unid = UNIDADE[ex.carga];
      h += `<div class="ex">
        <div class="linha entre"><span class="tag">${esc(ex.grupo)}</span><span class="small muted">${esc(faixaReps(ex))}</span></div>
        <div class="ex-nome">${n} · ${esc(ex.nome)}</div>
        ${videoExercicio(ex)}
        <details><summary>Dica de execução ▾</summary><p>${esc(ex.dica)}</p></details>
        <div class="ultima">${ult ? `Última (${fmtData(ult.sessao.data)}): ${resumoSeries(ult.series, ex)}${unid ? ' ' + unid : ''}`
          : SEM_CARGA(ex) ? 'Peso corporal: anote só as repetições' : 'Primeira vez: escolha uma carga com 2-3 reps de reserva'}
          ${st === 'subir' ? `<span class="tag up">${rotuloSubir(ex)}</span>` : ''}</div>`;
      if (ex.extra) {
        h += `<label class="campo extra"><span class="small muted">${esc(ex.extra)}</span>
          <input data-extra="${ex.id}" inputmode="decimal" value="${esc(a.extras?.[ex.id] || '')}"></label>`;
      }
      a.series[ex.id].forEach((s, i) => {
        const campoCarga = SEM_CARGA(ex) ? ''
          : ex.carga === 'elastico'
            ? `<label class="campo"><input data-campo="kg" value="${esc(s.kg)}" placeholder="cor/nível"></label>`
            : `<label class="campo"><input inputmode="decimal" data-campo="kg" value="${esc(s.kg)}" placeholder="carga"><em>${UNIDADE_CURTA[ex.carga]}</em></label>`;
        h += `<div class="serie ${s.ok ? 'feita' : ''} ${SEM_CARGA(ex) ? 'sem-carga' : ''}" data-ex="${ex.id}" data-i="${i}">
          <span class="n">S${i + 1}</span>
          ${campoCarga}
          <label class="campo"><input inputmode="numeric" data-campo="reps" value="${esc(s.reps)}" placeholder="${ex.reps[0]}-${ex.reps[1]}"><em>reps</em></label>
          <button class="ok-btn" data-acao="serie" aria-label="Concluir série">✓</button></div>`;
      });
      h += `</div>`;
    }
    h += `</div>`;
  }

  if (t.core) h += `<div class="card"><h2>Core</h2>${t.core.map((p, i) => checkItem('core', i, p, a.checks.core?.[i])).join('')}</div>`;
  h += `<div class="card"><h2>${esc(t.tituloMobilidade || 'Mobilidade')}</h2>${t.mobilidade.map((p, i) => checkItem('mob', i, p, a.checks.mob[i])).join('')}</div>`;
  h += `<div class="card"><h2>${esc(t.cardioFinal.titulo)}</h2><p class="small muted">${esc(t.cardioFinal.texto)}</p><p class="small muted">Você marca se fez ao finalizar.</p></div>`;
  h += `<a class="btn" href="#/finalizar">Finalizar treino</a>
    <button class="btn perigo" data-acao="descartar">Descartar treino</button>`;
  return h;
}

function atualizarContador() {
  const a = db.ativa; if (!a) return;
  const { total, feitas } = contarSeries(fichaDe(a.treino), a.series);
  const c = $('#contador'), b = $('#barra');
  if (c) c.textContent = `${feitas}/${total} séries`;
  if (b) b.style.width = `${(feitas / total) * 100}%`;
}

// ---------- Tela: Finalizar ----------
function telaFinalizar() {
  const a = db.ativa;
  if (!a) { location.hash = '#/hoje'; return ''; }
  const t = fichaDe(a.treino);
  a.fim ??= {};
  const f = a.fim;
  f.duracao ??= a.dataManual ? '' : Math.round((Date.now() - a.inicio) / 60000);
  const { total, feitas } = contarSeries(t, a.series);
  return `<h1>Finalizar ${esc(a.treino)}</h1>
    <p class="muted">${a.dataManual ? `Registro de ${fmtDataLonga(a.dataManual)} · ` : ''}${feitas} de ${total} séries registradas</p>
    <div class="card"><h2>Tempo total</h2>${a.dataManual ? '<p class="muted small">Opcional: deixe em branco se não lembrar.</p>' : ''}
      <label class="campo"><input inputmode="numeric" data-fim="duracao" value="${f.duracao}" placeholder="–"><em>min</em></label></div>
    <div class="card"><h2>${esc(t.cardioFinal.titulo)}</h2>
      <div class="opcoes">
        <button class="${f.cardioFinal === 'feito' ? 'sel' : ''}" data-acao="fim-opcao" data-campo="cardioFinal" data-valor="feito">15 min feitos</button>
        <button class="${f.cardioFinal === 'dispensado' ? 'sel' : ''}" data-acao="fim-opcao" data-campo="cardioFinal" data-valor="dispensado">Dispensado</button>
      </div></div>
    <div class="card"><h2>Esforço da sessão</h2><p class="muted small">0 = muito leve · 10 = máximo</p>
      <div class="opcoes">${Array.from({ length: 11 }, (_, i) => `<button class="${f.esforco === i ? 'sel' : ''}" data-acao="fim-opcao" data-campo="esforco" data-valor="${i}">${i}</button>`).join('')}</div></div>
    <div class="card"><h2>Observações</h2>
      <textarea rows="3" data-fim="notas" placeholder="Dor, ajuste de máquina, como se sentiu...">${esc(f.notas || '')}</textarea></div>
    <button class="btn" data-acao="salvar-sessao">Salvar treino</button>
    <a class="btn sec" href="#/treino">Voltar ao treino</a>`;
}

function salvarSessao() {
  const a = db.ativa;
  const f = a.fim || {};
  // Registro de outro dia entra ao meio-dia daquela data, para ficar na ordem certa do histórico
  const retroativo = a.dataManual && a.dataManual !== isoDia();
  const inicio = retroativo ? dataDeIso(a.dataManual).setHours(12) : a.inicio;
  const sessao = {
    id: a.id, treino: a.treino, data: a.dataManual || isoDia(new Date(a.inicio)), inicio, termino: retroativo ? inicio : Date.now(),
    duracaoMin: num(f.duracao) ?? (a.dataManual ? null : Math.round((Date.now() - a.inicio) / 60000)),
    registroManual: !!a.dataManual,
    series: a.series, checks: a.checks, extras: a.extras || {},
    cardioFinal: f.cardioFinal || null, esforco: f.esforco ?? null, notas: (f.notas || '').trim(),
    nomes: {}, // cópia dos dados de cada exercício, para o histórico sobreviver a edições da ficha
    planejadas: contarSeries(fichaDe(a.treino), {}).total,
  };
  for (const ex of exerciciosDe(fichaDe(a.treino))) {
    sessao.nomes[ex.id] = { nome: ex.nome, grupo: ex.grupo, carga: ex.carga, reps: ex.reps, lado: ex.lado || '' };
  }
  db.sessoes.push(sessao);
  fichaEscolhida = null;
  db.ativa = null;
  salvar();
  toast('Treino salvo 💪');
  location.hash = `#/sessao/${sessao.id}`;
}

// ---------- Tela: Histórico ----------
function telaHistorico() {
  const lista = sessoesOrdenadas();
  const botao = `<a class="btn sec" href="#/registrar">+ Registrar treino feito fora do app</a>`;
  if (!lista.length) return `<h1>Histórico</h1><div class="vazio">Nenhum treino registrado ainda.<br>Os treinos finalizados aparecem aqui.</div>${botao}`;
  let h = `<h1>Histórico</h1><p class="muted">${lista.length} treino${lista.length > 1 ? 's' : ''} registrado${lista.length > 1 ? 's' : ''}</p>${botao}<div class="card">`;
  for (const s of lista) {
    const t = fichaDe(s.treino);
    const c = t ? contarSeries(t, s.series) : null;
    const info = [s.duracaoMin != null ? `${s.duracaoMin} min` : null, c ? `${c.feitas}/${s.planejadas ?? Math.max(c.total, c.feitas)} séries` : null,
      s.esforco != null ? `esforço ${s.esforco}/10` : null, s.registroManual ? 'registrado depois' : null].filter(Boolean).join(' · ');
    h += `<a class="item" href="#/sessao/${s.id}"><span class="ficha-badge">${esc(s.treino)}</span>
      <div class="cresce"><b>${fmtDataLonga(s.data)}</b>
      <div class="muted small">${info}</div></div>
      <span class="seta">›</span></a>`;
  }
  return h + `</div>`;
}

function telaSessao(id) {
  const s = db.sessoes.find((x) => x.id === id);
  if (!s) return `<div class="vazio">Treino não encontrado.<a class="btn sec" href="#/historico">Voltar</a></div>`;
  const t = fichaDe(s.treino);
  let h = `<a href="#/historico" class="small">‹ Histórico</a><h1>${esc(s.treino)} · ${fmtData(s.data)}</h1>
    <p class="muted">${fmtDataLonga(s.data)}</p>
    <div class="card"><div class="linha entre"><span>Tempo total</span><b>${s.duracaoMin != null ? s.duracaoMin + ' min' : '–'}</b></div>
      <div class="linha entre"><span>Cardio final</span><b>${s.cardioFinal === 'feito' ? '15 min' : s.cardioFinal === 'dispensado' ? 'Dispensado' : '–'}</b></div>
      <div class="linha entre"><span>Esforço</span><b>${s.esforco ?? '–'}/10</b></div>
      ${s.notas ? `<p class="muted small" style="margin-top:8px">${esc(s.notas)}</p>` : ''}</div>`;
  if (t) {
    // Exercícios na ordem da ficha atual, seguidos dos que foram feitos mas já não estão nela
    const ids = exerciciosDe(t).map((x) => x.id);
    for (const id in s.series) if (!ids.includes(id) && s.series[id].some((x) => x.ok)) ids.push(id);
    h += `<div class="card"><table><tr><th>Exercício</th><th class="num">Séries</th></tr>`;
    for (const id of ids) {
      const ex = exInfo(id, s);
      const ser = s.series[ex.id] || [];
      const st = statusProgressao(ex, ser);
      h += `<tr><td>${esc(ex.nome)}${st === 'subir' ? ' <span class="tag up">↑</span>' : ''}</td>
        <td class="num">${ser.some((x) => x.ok) ? resumoSeries(ser, ex) : '<span class="muted">–</span>'}${ex.extra && s.extras?.[ex.id] ? `<div class="muted small">${esc(ex.extra)}: ${esc(s.extras[ex.id])}</div>` : ''}</td></tr>`;
    }
    h += `</table><p class="muted small">Carga × repetições. ↑ = topo da faixa nas séries: subir carga na próxima.</p></div>`;
  }
  h += `<button class="btn perigo" data-acao="apagar-sessao" data-id="${s.id}">Apagar este treino</button>`;
  return h;
}

// ---------- Tela: Progresso ----------
function pontosExercicio(ex) {
  return [...db.sessoes].sort((a, b) => a.inicio - b.inicio)
    .filter((s) => s.series[ex.id] && s.series[ex.id].some((x) => x.ok))
    .map((s) => ({ data: s.data, kg: metrica(ex, s.series[ex.id]), series: s.series[ex.id] }));
}

// Texto do valor atual e da variação desde o primeiro registro
function resumoAtual(ex, pts) {
  const ult = pts[pts.length - 1];
  if (ex.carga === 'elastico') {
    const kg = ult.series.filter((x) => x.ok).map((x) => x.kg).pop();
    return { atual: `Elástico: ${esc(kg || '–')}`, ganho: '' };
  }
  const unid = SEM_CARGA(ex) ? 'reps' : UNIDADE[ex.carga];
  const dif = ult.kg !== null && pts[0].kg !== null ? ult.kg - pts[0].kg : 0;
  return {
    atual: `${fmtKg(ult.kg)} ${unid}`,
    ganho: dif ? ` · ${dif > 0 ? '+' : ''}${fmtKg(dif)} ${SEM_CARGA(ex) ? 'reps' : 'kg'}` : '',
  };
}

function grafico(pontos, alto = 70) {
  pontos = pontos.filter((p) => p.kg !== null);
  if (pontos.length < 2) return '';
  const W = 300, H = alto, P = 6;
  const vals = pontos.map((p) => p.kg);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const x = (i) => P + (i * (W - 2 * P)) / (pontos.length - 1);
  const y = (v) => H - P - ((v - min) * (H - 2 * P)) / (max - min);
  const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${pontos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.kg)}" r="3" fill="var(--accent)"/>`).join('')}</svg>`;
}

function telaProgresso(fichaSel) {
  const sel = fichaSel || (sessoesOrdenadas()[0] || {}).treino || 'A1';
  let h = `<h1>Progresso</h1><div class="chips">${FICHAS.map((f) => `<a href="#/progresso/${f}" class="${f === sel ? 'sel' : ''} ${fichaDe(f) ? '' : 'vazia'}">${f}</a>`).join('')}</div>`;
  const t = fichaDe(sel);
  if (!t) return h + `<div class="vazio">Ficha ${sel} ainda não cadastrada.</div>`;
  h += `<p class="muted small" style="margin-top:12px">${esc(t.progressao)}</p>`;
  for (const ex of exerciciosDe(t)) {
    const pts = pontosExercicio(ex);
    const ult = pts[pts.length - 1];
    const st = ult && statusProgressao(ex, ult.series);
    const r = ult && resumoAtual(ex, pts);
    h += `<a class="card" href="#/exercicio/${ex.id}" style="display:block;color:inherit;text-decoration:none">
      <div class="linha entre"><span class="tag">${esc(ex.grupo)}</span>${st === 'subir' ? `<span class="tag up">${rotuloSubir(ex)}</span>` : st === 'manter' ? '<span class="tag">Manter</span>' : ''}</div>
      <div class="ex-nome">${esc(ex.nome)}</div>
      ${ult ? `<div class="linha entre small"><span class="muted">Atual: <b style="color:var(--text)">${r.atual}</b></span>
        <span class="muted">${pts.length} treino${pts.length > 1 ? 's' : ''}${r.ganho}</span></div>${grafico(pts)}`
        : '<p class="muted small">Sem registros ainda.</p>'}</a>`;
  }
  return h;
}

function telaExercicio(exId) {
  let ex, ficha;
  for (const f of FICHAS) { const t = fichaDe(f); if (!t) continue; const e = exerciciosDe(t).find((x) => x.id === exId); if (e) { ex = e; ficha = f; } }
  if (!ex) {
    // Exercício que já saiu da ficha: usa os dados guardados nas sessões
    const s = sessoesOrdenadas().find((x) => x.series[exId]);
    if (!s) return `<div class="vazio">Exercício não encontrado.</div>`;
    ex = exInfo(exId, s); ficha = s.treino;
  }
  const pts = pontosExercicio(ex);
  const unid = SEM_CARGA(ex) ? 'peso corporal' : ex.carga === 'elastico' ? 'elástico' : `carga em ${UNIDADE[ex.carga]}`;
  let h = `<a href="#/progresso/${ficha}" class="small">‹ Progresso ${ficha}</a><h1 style="font-size:22px">${esc(ex.nome)}</h1>
    <p class="muted small">${esc(ex.grupo)} · ${esc(faixaReps(ex))} · ${unid}</p>`;
  if (!pts.length) return h + `<div class="vazio">Sem registros ainda.</div>`;
  if (ex.carga !== 'elastico') {
    const titulo = SEM_CARGA(ex) ? 'Maior nº de repetições por treino' : ex.carga === 'assist' ? 'Assistência por treino (menos é melhor)' : 'Maior carga por treino';
    h += `<div class="card"><p class="small muted">${titulo}</p>${grafico(pts, 140) || '<p class="small muted">O gráfico aparece a partir do 2º treino.</p>'}</div>`;
  }
  h += `<div class="card"><table><tr><th>Data</th><th class="num">Séries</th><th></th></tr>`;
  for (const p of [...pts].reverse()) {
    const st = statusProgressao(ex, p.series);
    h += `<tr><td>${fmtData(p.data)}</td><td class="num">${resumoSeries(p.series, ex)}</td><td>${st === 'subir' ? '<span class="tag up">↑</span>' : ''}</td></tr>`;
  }
  return h + `</table></div><div class="card small muted">${esc(ex.dica)}</div>`;
}

// ---------- Tela: Ajustes ----------
// ---------- Perfil (dados pessoais) ----------
function idadeEm(nascimento, data = isoDia()) {
  if (!nascimento) return null;
  const [y, m, d] = nascimento.split('-').map(Number);
  const [Y, M, D] = data.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}
// Peso vigente numa data: o último registrado até aquele dia (ou o primeiro, para datas anteriores)
function pesoEm(data = isoDia()) {
  const pesos = [...(db.perfil.pesos || [])].sort((a, b) => a.data.localeCompare(b.data));
  if (!pesos.length) return null;
  let p = pesos[0].kg;
  for (const x of pesos) if (x.data <= data) p = x.kg;
  return p;
}
function imc() {
  const p = pesoEm(), h = num(db.perfil.altura);
  return p && h ? p / (h / 100) ** 2 : null;
}

function cartaoPerfil() {
  const p = db.perfil;
  const pesos = [...(p.pesos || [])].sort((a, b) => b.data.localeCompare(a.data));
  const idade = idadeEm(p.nascimento);
  const i = imc();
  return `<div class="card"><h2>Meus dados</h2>
    <p class="muted small">Usados nos relatórios (estimativa de calorias e IMC). Ficam só neste celular.</p>
    <div class="form">
      <label>Data de nascimento<input type="date" class="input-texto" data-perfil="nascimento" value="${esc(p.nascimento)}"></label>
      <label>Altura (cm)<input inputmode="numeric" class="input-texto" data-perfil="altura" value="${esc(p.altura)}" placeholder="ex.: 178"></label>
      <label>Peso de hoje (kg)<div class="linha"><input inputmode="decimal" class="input-texto cresce" id="novo-peso" placeholder="${pesos[0] ? fmtKg(pesos[0].kg) : 'ex.: 91'}">
        <button class="btn-mini" data-acao="registrar-peso">Registrar</button></div></label>
    </div>
    <p class="small" style="margin-top:10px">${idade !== null ? `${idade} anos` : 'Idade: –'} · ${pesoEm() ? `${fmtKg(pesoEm())} kg` : 'Peso: –'}${i ? ` · IMC ${i.toFixed(1).replace('.', ',')}` : ''}</p>
    ${pesos.length ? `<details style="margin-top:6px"><summary class="small muted">Histórico de peso (${pesos.length}) ▾</summary>
      ${pesos.map((x) => `<div class="linha entre small" style="padding:6px 0;border-top:1px solid var(--line)"><span>${fmtData(x.data)}/${x.data.slice(0, 4)}</span>
        <span>${fmtKg(x.kg)} kg <button class="btn-mini" data-acao="apagar-peso" data-data="${x.data}" aria-label="Apagar">✕</button></span></div>`).join('')}</details>` : ''}
  </div>`;
}

function telaAjustes() {
  return `<h1>Ajustes</h1>
    ${cartaoPerfil()}
    <div class="card"><div class="linha entre"><div class="cresce"><b>Manter tela ligada</b><p class="muted small">Durante o treino a tela não apaga sozinha.</p></div>
      <button class="btn-mini" data-acao="tela">${db.config.telaLigada ? 'Ligado' : 'Desligado'}</button></div></div>
    <div class="card"><h2>Backup</h2>
      <p class="muted small">Os dados ficam salvos só neste celular. Faça backup de vez em quando (ex.: salvar no app Arquivos ou iCloud Drive).</p>
      <button class="btn" data-acao="exportar">Exportar backup</button>
      <label class="btn sec">Importar backup<input type="file" accept="application/json,.json" data-acao="importar" hidden></label></div>
    <div class="card"><h2>Sequência de treinos</h2>
      <p class="small">Sequência sugerida: ${FICHAS.join(' → ')} → ${FICHAS[0]}</p>
      <p class="muted small">Não há dia fixo: o app sugere a ficha seguinte à última feita, mas você escolhe qualquer uma, em qualquer dia, inclusive domingo.</p></div>
    <div class="card"><p class="muted small">${db.sessoes.length} treinos salvos.</p>
      <button class="btn perigo" data-acao="apagar-tudo">Apagar todos os dados</button></div>`;
}

async function exportar() {
  const nome = `meu-treino-backup-${isoDia()}.json`;
  const blob = new Blob([JSON.stringify({ ...db, exportadoEm: new Date().toISOString() }, null, 2)], { type: 'application/json' });
  const arq = new File([blob], nome, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [arq] })) {
    try { await navigator.share({ files: [arq], title: 'Backup Meu Treino' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importar(input) {
  const arq = input.files && input.files[0];
  if (!arq) return;
  arq.text().then((txt) => {
    const dados = JSON.parse(txt);
    if (!Array.isArray(dados.sessoes)) throw new Error('formato');
    if (!confirm(`Substituir os dados atuais por este backup (${dados.sessoes.length} treinos)?`)) return;
    db = Object.assign(novoDb(), {
      sessoes: dados.sessoes, ativa: dados.ativa || null, config: { ...novoDb().config, ...dados.config },
      fichas: dados.fichas || {}, perfil: { ...novoDb().perfil, ...dados.perfil },
    });
    salvar(); toast('Backup importado'); render();
  }).catch(() => toast('Arquivo de backup inválido'));
  input.value = '';
}

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  destravarAudio();
  const el = e.target.closest('[data-acao]');
  if (!el || el.tagName === 'INPUT') return;
  const acao = el.dataset.acao;
  const a = db.ativa;

  if (acao === 'iniciar') iniciarTreino(el.dataset.ficha);
  else if (acao === 'escolher') { fichaEscolhida = el.dataset.ficha; render(); }
  else if (acao === 'registro-ficha') { registro.ficha = el.dataset.ficha; render(); }
  else if (acao === 'registro-abrir' && registro.ficha) {
    const { ficha, data } = registro;
    registro.ficha = null; registro.data = null;
    iniciarTreino(ficha, data);
  }
  else if (acao === 'video') abrirVideo(el);

  else if (acao === 'check') {
    const g = el.dataset.grupo, i = +el.dataset.i;
    if (g === 'cardioIni') a.checks.cardioIni = !a.checks.cardioIni;
    else { a.checks[g] ??= []; a.checks[g][i] = !a.checks[g][i]; }
    el.classList.toggle('on'); salvar();
  }

  else if (acao === 'serie') {
    const linha = el.closest('.serie');
    const exId = linha.dataset.ex, i = +linha.dataset.i;
    const s = a.series[exId][i];
    const blocos = fichaDe(a.treino).blocos;
    const bloco = blocos.find((b) => b.exercicios.some((x) => x.id === exId));
    const ex = bloco.exercicios.find((x) => x.id === exId);
    if (!s.ok) {
      const preenchido = (c) => (c === 'kg' && ex.carga === 'elastico' ? String(s.kg).trim() !== '' : num(s[c]) !== null);
      const vazio = (SEM_CARGA(ex) ? ['reps'] : ['kg', 'reps']).find((c) => !preenchido(c));
      if (vazio) {
        const inp = $(`[data-campo="${vazio}"]`, linha);
        inp.classList.remove('erro'); void inp.offsetWidth; inp.classList.add('erro'); inp.focus();
        return toast(vazio === 'kg' ? (ex.carga === 'elastico' ? 'Informe o elástico' : 'Informe a carga') : 'Informe as repetições');
      }
    }
    s.ok = !s.ok;
    linha.classList.toggle('feita', s.ok);
    if (document.activeElement) document.activeElement.blur();
    // Se a próxima série ainda não tem carga, copia a desta
    const prox = a.series[exId][i + 1];
    if (s.ok && !SEM_CARGA(ex) && prox && !prox.ok && !String(prox.kg).trim()) {
      prox.kg = s.kg;
      const inp = $(`.serie[data-ex="${exId}"][data-i="${i + 1}"] [data-campo="kg"]`);
      if (inp) inp.value = s.kg;
    }
    if (s.ok) {
      const ultimoBloco = bloco === blocos[blocos.length - 1];
      if (bloco.modo === 'series') {
        // Séries tradicionais: descansa após cada série, menos depois da última série do treino
        const ultimoEx = ex === bloco.exercicios[bloco.exercicios.length - 1];
        const ultimaSerie = i === bloco.voltas - 1;
        if (!(ultimoBloco && ultimoEx && ultimaSerie)) {
          iniciarDescanso(bloco, ultimaSerie ? 'Próximo exercício' : `${ex.nome} · série ${i + 2}`);
        } else { a.descanso = null; tick(); }
      } else if (bloco.exercicios.every((x) => a.series[x.id][i].ok)) {
        // Voltas: descansa quando todos os exercícios do bloco fecham a volta
        if (!(ultimoBloco && i === bloco.voltas - 1)) {
          iniciarDescanso(bloco, `${bloco.nome} · ${i === bloco.voltas - 1 ? 'próximo bloco' : `volta ${i + 2}`}`);
        } else { a.descanso = null; tick(); }
      }
    }
    salvar(); atualizarContador();
  }

  else if (acao === 'descanso-mais') { a.descanso.min += 15; a.descanso.max += 15; avisos.min = avisos.max = false; salvar(); tick(); }
  else if (acao === 'descanso-fim') { a.descanso = null; salvar(); tick(); }

  else if (acao === 'descartar') {
    if (confirm('Descartar este treino? As séries anotadas serão perdidas.')) { db.ativa = null; salvar(); location.hash = '#/hoje'; }
  }

  else if (acao === 'fim-opcao') {
    const campo = el.dataset.campo;
    a.fim[campo] = campo === 'esforco' ? +el.dataset.valor : el.dataset.valor;
    salvar(); render();
  }
  else if (acao === 'salvar-sessao') salvarSessao();

  else if (acao === 'apagar-sessao') {
    if (confirm('Apagar este treino do histórico? Não dá para desfazer.')) {
      db.sessoes = db.sessoes.filter((s) => s.id !== el.dataset.id); salvar(); location.hash = '#/historico';
    }
  }
  else if (acao === 'registrar-peso') {
    const kg = num($('#novo-peso').value);
    if (kg === null || kg < 30 || kg > 300) return toast('Informe um peso válido');
    const hoje = isoDia();
    db.perfil.pesos = (db.perfil.pesos || []).filter((x) => x.data !== hoje).concat({ data: hoje, kg });
    salvar(); render(); toast('Peso registrado');
  }
  else if (acao === 'apagar-peso') {
    db.perfil.pesos = db.perfil.pesos.filter((x) => x.data !== el.dataset.data); salvar(); render();
  }
  else if (acao === 'tela') { db.config.telaLigada = !db.config.telaLigada; salvar(); render(); }
  else if (acao === 'exportar') exportar();
  else if (acao === 'apagar-tudo') {
    if (confirm('Apagar TODOS os treinos e registros deste celular?') && confirm('Tem certeza? Faça um backup antes, se quiser guardar.')) {
      db = novoDb(); salvar(); render(); toast('Dados apagados');
    }
  }
});

document.addEventListener('input', (e) => {
  const el = e.target;
  const a = db.ativa;
  if (el.dataset.campo && a) {
    const linha = el.closest('.serie');
    a.series[linha.dataset.ex][+linha.dataset.i][el.dataset.campo] = el.value.trim();
    salvar();
  } else if (el.dataset.fim && a) {
    a.fim[el.dataset.fim] = el.value;
    salvar();
  } else if (el.dataset.extra && a) {
    a.extras ??= {};
    a.extras[el.dataset.extra] = el.value.trim();
    salvar();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset.acao === 'importar') importar(e.target);
  if (e.target.dataset.perfil) {
    db.perfil[e.target.dataset.perfil] = e.target.value.trim();
    salvar(); render();
  }
  if (e.target.dataset.reg === 'data') {
    const v = e.target.value;
    registro.data = v && v <= isoDia() ? v : isoDia();
    render();
  }
});

// Enter no campo de carga pula para repetições
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.dataset.campo) return;
  e.preventDefault();
  if (e.target.dataset.campo === 'kg') $('[data-campo="reps"]', e.target.closest('.serie')).focus();
  else e.target.blur();
});

// ---------- Início ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
render();
