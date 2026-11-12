'use strict';

// ---------- Armazenamento ----------
const STORE_KEY = 'meutreino:v1';
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const UNIDADE = { halter: 'kg/halter', total: 'kg', unico: 'kg' };

function novoDb() {
  return { versao: 1, sessoes: [], ativa: null, config: { telaLigada: true } };
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
const fichaDoDia = (d = new Date()) => PLANO_SEMANAL[d.getDay()];
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

const resumoSeries = (series) => series.filter((x) => x.ok).map((x) => `${fmtKg(x.kg)}×${x.reps}`).join(' · ');
const cargaMax = (series) => Math.max(...series.filter((x) => x.ok).map((x) => num(x.kg) ?? 0));

function contarSeries(t, series) {
  let total = 0, feitas = 0;
  for (const b of t.blocos) for (const ex of b.exercicios) {
    total += b.voltas;
    feitas += (series[ex.id] || []).filter((x) => x.ok).length;
  }
  return { total, feitas };
}

// ---------- Sessão ativa ----------
function iniciarTreino(fichaId) {
  const t = TREINOS[fichaId];
  if (!t) return toast(`Ficha ${fichaId} ainda não cadastrada`);
  if (db.ativa) {
    if (db.ativa.treino === fichaId) return (location.hash = '#/treino');
    if (!confirm(`Há um treino ${db.ativa.treino} em andamento. Descartar e iniciar o ${fichaId}?`)) return;
  }
  const series = {};
  for (const b of t.blocos) for (const ex of b.exercicios) {
    const ult = ultimoRegistro(ex.id);
    series[ex.id] = Array.from({ length: b.voltas }, (_, i) => {
      const ant = ult && (ult.series[i] || ult.series[ult.series.length - 1]);
      return { kg: ant ? ant.kg : '', reps: '', ok: false };
    });
  }
  db.ativa = {
    id: uid(), treino: fichaId, inicio: Date.now(), series,
    checks: { cardioIni: false, prep: t.preparacao.map(() => false), mob: t.mobilidade.map(() => false) },
    descanso: null,
  };
  salvar();
  location.hash = '#/treino';
}

function iniciarDescanso(bloco, voltaFeita) {
  const ultimaVolta = voltaFeita === bloco.voltas - 1;
  db.ativa.descanso = { inicio: Date.now(), min: bloco.descanso[0], max: bloco.descanso[1], rotulo: `${bloco.nome} · ${ultimaVolta ? 'próximo bloco' : `volta ${voltaFeita + 2}`}` };
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
  if (cron && a) cron.textContent = fmtCron(Date.now() - a.inicio);

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
  const [pag, arg] = (location.hash.replace(/^#\/?/, '') || 'hoje').split('/');
  return { pag, arg: arg && decodeURIComponent(arg) };
}

const telas = { hoje: telaHoje, treino: telaTreino, finalizar: telaFinalizar, historico: telaHistorico, sessao: telaSessao, progresso: telaProgresso, exercicio: telaExercicio, ajustes: telaAjustes };

let ultimaPag = null;
function render() {
  const { pag, arg } = rotaAtual();
  const fn = telas[pag] || telaHoje;
  const mesmaPag = pag === ultimaPag;
  const y = window.scrollY;
  app.innerHTML = fn(arg);
  window.scrollTo(0, mesmaPag ? y : 0);
  ultimaPag = pag;
  const aba = { treino: 'hoje', finalizar: 'hoje', sessao: 'historico', exercicio: 'progresso' }[pag] || pag;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('sel', a.dataset.tab === aba));
  tick();
  atualizarTelaLigada();
}
window.addEventListener('hashchange', render);

// ---------- Tela: Hoje ----------
function telaHoje() {
  const hoje = new Date();
  const iso = isoDia(hoje);
  const ficha = fichaDoDia(hoje);
  const feitasHoje = db.sessoes.filter((s) => s.data === iso);
  let h = `<p class="muted">${fmtDataLonga(iso)}</p><h1>Hoje</h1>`;

  if (db.ativa) {
    const t = TREINOS[db.ativa.treino];
    const { total, feitas } = contarSeries(t, db.ativa.series);
    h += `<div class="card destaque">
      <div class="linha entre"><span class="tag ac">Em andamento</span><span class="cron" id="cron"></span></div>
      <h2 style="margin-top:8px">${esc(t.titulo)} · ${esc(t.tipo)}</h2>
      <p class="muted small">${feitas} de ${total} séries feitas</p>
      <a class="btn" href="#/treino">Continuar treino</a></div>`;
  } else if (!ficha) {
    h += `<div class="card"><h2>Dia de descanso</h2><p class="muted">Recupere bem. Se quiser treinar mesmo assim, escolha uma ficha abaixo.</p></div>`;
  } else {
    const t = TREINOS[ficha];
    const feito = feitasHoje.find((s) => s.treino === ficha);
    if (!t) {
      h += `<div class="card"><span class="tag">${ficha} · ${TIPO_FICHA[ficha]}</span><h2 style="margin-top:8px">Ficha ${ficha} ainda não cadastrada</h2>
        <p class="muted small">Assim que a ficha for enviada, ela aparece aqui.</p></div>`;
    } else {
      const ult = sessoesOrdenadas().find((s) => s.treino === ficha);
      h += `<div class="card destaque">
        <div class="linha entre"><span class="tag ac">Treino do dia</span>${feito ? '<span class="tag ok">✓ Feito hoje</span>' : ''}</div>
        <h2 style="margin-top:8px">${esc(t.titulo)} · ${esc(t.tipo)}</h2>
        <p class="muted small">${esc(t.resumo)}</p>
        <p class="muted small">${exerciciosDe(t).length} exercícios · ${contarSeries(t, {}).total} séries${ult ? ` · último em ${fmtData(ult.data)}` : ''}</p>
        <button class="btn" data-acao="iniciar" data-ficha="${ficha}">${feito ? 'Treinar de novo' : 'Iniciar treino'}</button></div>`;
    }
  }

  // Semana atual (segunda a domingo)
  const seg = new Date(hoje); seg.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  h += `<h3>Esta semana</h3><div class="semana">`;
  for (let i = 0; i < 7; i++) {
    const d = new Date(seg); d.setDate(seg.getDate() + i);
    const di = isoDia(d);
    const f = PLANO_SEMANAL[d.getDay()];
    const feito = db.sessoes.some((s) => s.data === di);
    h += `<div class="dia ${di === iso ? 'hoje' : ''} ${feito ? 'feito' : ''}">${DIAS[d.getDay()]}<b>${f || '–'}</b></div>`;
  }
  h += `</div>`;

  h += `<h3>Todas as fichas</h3><div class="fichas">`;
  for (const f of FICHAS) {
    const ult = sessoesOrdenadas().find((s) => s.treino === f);
    h += `<button class="ficha ${TREINOS[f] ? '' : 'vazia'}" data-acao="iniciar" data-ficha="${f}">
      <b>${f}</b><span>${TIPO_FICHA[f]}</span><span>${TREINOS[f] ? (ult ? 'Último ' + fmtData(ult.data) : 'Nunca feito') : 'Sem ficha'}</span></button>`;
  }
  h += `</div>`;
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
  const t = TREINOS[a.treino];
  const { total, feitas } = contarSeries(t, a.series);

  let h = `<div class="topo-treino">
    <div class="linha entre"><div><b>${esc(t.titulo)}</b> <span class="muted small">· ${esc(t.tipo)}</span></div><span class="cron" id="cron"></span></div>
    <div class="small muted" style="margin-top:2px"><span id="contador">${feitas}/${total} séries</span></div>
    <div class="progresso-barra"><i id="barra" style="width:${(feitas / total) * 100}%"></i></div></div>`;

  h += `<div class="card"><details><summary class="small muted">Como executar ▾</summary><p class="small muted">${esc(t.instrucoes)}</p></details></div>`;

  h += `<div class="card"><h2>${esc(t.cardioInicial.titulo)}</h2>${checkItem('cardioIni', 0, t.cardioInicial.texto, a.checks.cardioIni)}</div>`;
  h += `<div class="card"><h2>Preparação</h2>${t.preparacao.map((p, i) => checkItem('prep', i, p, a.checks.prep[i])).join('')}</div>`;

  let n = 0;
  for (const b of t.blocos) {
    h += `<div class="card"><div class="bloco-head"><h2>${esc(b.nome)} <span class="muted small">· ${esc(b.foco)}</span></h2></div>
      <p class="muted small">${b.voltas} voltas · descanso ${b.descanso[0]}-${b.descanso[1]} s após cada volta</p>`;
    for (const ex of b.exercicios) {
      n++;
      const ult = ultimoRegistro(ex.id, a.id);
      const st = ult && statusProgressao(ex, ult.series);
      h += `<div class="ex">
        <div class="linha entre"><span class="tag">${esc(ex.grupo)}</span><span class="small muted">${ex.reps[0]}-${ex.reps[1]} reps</span></div>
        <div class="ex-nome">${n} · ${esc(ex.nome)}</div>
        ${videoExercicio(ex)}
        <details><summary>Dica de execução ▾</summary><p>${esc(ex.dica)}</p></details>
        <div class="ultima">${ult ? `Última (${fmtData(ult.sessao.data)}): ${resumoSeries(ult.series)} ${UNIDADE[ex.carga]}` : 'Primeira vez: escolha uma carga com 2-3 reps de reserva'}
          ${st === 'subir' ? '<span class="tag up">↑ Subir carga</span>' : ''}</div>`;
      a.series[ex.id].forEach((s, i) => {
        h += `<div class="serie ${s.ok ? 'feita' : ''}" data-ex="${ex.id}" data-i="${i}">
          <span class="n">S${i + 1}</span>
          <label class="campo"><input inputmode="decimal" data-campo="kg" value="${esc(s.kg)}" placeholder="carga"><em>${ex.carga === 'halter' ? 'kg/h' : 'kg'}</em></label>
          <label class="campo"><input inputmode="numeric" data-campo="reps" value="${esc(s.reps)}" placeholder="${ex.reps[0]}-${ex.reps[1]}"><em>reps</em></label>
          <button class="ok-btn" data-acao="serie" aria-label="Concluir série">✓</button></div>`;
      });
      h += `</div>`;
    }
    h += `</div>`;
  }

  h += `<div class="card"><h2>Mobilidade</h2>${t.mobilidade.map((p, i) => checkItem('mob', i, p, a.checks.mob[i])).join('')}</div>`;
  h += `<div class="card"><h2>${esc(t.cardioFinal.titulo)}</h2><p class="small muted">${esc(t.cardioFinal.texto)}</p><p class="small muted">Você marca se fez ao finalizar.</p></div>`;
  h += `<a class="btn" href="#/finalizar">Finalizar treino</a>
    <button class="btn perigo" data-acao="descartar">Descartar treino</button>`;
  return h;
}

function atualizarContador() {
  const a = db.ativa; if (!a) return;
  const { total, feitas } = contarSeries(TREINOS[a.treino], a.series);
  const c = $('#contador'), b = $('#barra');
  if (c) c.textContent = `${feitas}/${total} séries`;
  if (b) b.style.width = `${(feitas / total) * 100}%`;
}

// ---------- Tela: Finalizar ----------
function telaFinalizar() {
  const a = db.ativa;
  if (!a) { location.hash = '#/hoje'; return ''; }
  const t = TREINOS[a.treino];
  a.fim ??= {};
  const f = a.fim;
  f.duracao ??= Math.round((Date.now() - a.inicio) / 60000);
  const { total, feitas } = contarSeries(t, a.series);
  return `<h1>Finalizar ${esc(a.treino)}</h1>
    <p class="muted">${feitas} de ${total} séries registradas</p>
    <div class="card"><h2>Tempo total</h2>
      <label class="campo"><input inputmode="numeric" data-fim="duracao" value="${f.duracao}"><em>min</em></label></div>
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
  const sessao = {
    id: a.id, treino: a.treino, data: isoDia(new Date(a.inicio)), inicio: a.inicio, termino: Date.now(),
    duracaoMin: num(f.duracao) ?? Math.round((Date.now() - a.inicio) / 60000),
    series: a.series, checks: a.checks,
    cardioFinal: f.cardioFinal || null, esforco: f.esforco ?? null, notas: (f.notas || '').trim(),
  };
  db.sessoes.push(sessao);
  db.ativa = null;
  salvar();
  toast('Treino salvo 💪');
  location.hash = `#/sessao/${sessao.id}`;
}

// ---------- Tela: Histórico ----------
function telaHistorico() {
  const lista = sessoesOrdenadas();
  if (!lista.length) return `<h1>Histórico</h1><div class="vazio">Nenhum treino registrado ainda.<br>Os treinos finalizados aparecem aqui.</div>`;
  let h = `<h1>Histórico</h1><p class="muted">${lista.length} treino${lista.length > 1 ? 's' : ''} registrado${lista.length > 1 ? 's' : ''}</p><div class="card">`;
  for (const s of lista) {
    const t = TREINOS[s.treino];
    const c = t ? contarSeries(t, s.series) : null;
    h += `<a class="item" href="#/sessao/${s.id}"><span class="ficha-badge">${esc(s.treino)}</span>
      <div class="cresce"><b>${fmtDataLonga(s.data)}</b>
      <div class="muted small">${s.duracaoMin} min${c ? ` · ${c.feitas}/${c.total} séries` : ''}${s.esforco !== null ? ` · esforço ${s.esforco}/10` : ''}</div></div>
      <span class="seta">›</span></a>`;
  }
  return h + `</div>`;
}

function telaSessao(id) {
  const s = db.sessoes.find((x) => x.id === id);
  if (!s) return `<div class="vazio">Treino não encontrado.<a class="btn sec" href="#/historico">Voltar</a></div>`;
  const t = TREINOS[s.treino];
  let h = `<a href="#/historico" class="small">‹ Histórico</a><h1>${esc(s.treino)} · ${fmtData(s.data)}</h1>
    <p class="muted">${fmtDataLonga(s.data)}</p>
    <div class="card"><div class="linha entre"><span>Tempo total</span><b>${s.duracaoMin} min</b></div>
      <div class="linha entre"><span>Cardio final</span><b>${s.cardioFinal === 'feito' ? '15 min' : s.cardioFinal === 'dispensado' ? 'Dispensado' : '–'}</b></div>
      <div class="linha entre"><span>Esforço</span><b>${s.esforco ?? '–'}/10</b></div>
      ${s.notas ? `<p class="muted small" style="margin-top:8px">${esc(s.notas)}</p>` : ''}</div>`;
  if (t) {
    h += `<div class="card"><table><tr><th>Exercício</th><th class="num">Séries</th></tr>`;
    for (const ex of exerciciosDe(t)) {
      const ser = s.series[ex.id] || [];
      const st = statusProgressao(ex, ser);
      h += `<tr><td>${esc(ex.nome)}${st === 'subir' ? ' <span class="tag up">↑</span>' : ''}</td>
        <td class="num">${ser.some((x) => x.ok) ? resumoSeries(ser) : '<span class="muted">–</span>'}</td></tr>`;
    }
    h += `</table><p class="muted small">Carga × repetições. ↑ = topo da faixa nas séries: subir carga na próxima.</p></div>`;
  }
  h += `<button class="btn perigo" data-acao="apagar-sessao" data-id="${s.id}">Apagar este treino</button>`;
  return h;
}

// ---------- Tela: Progresso ----------
function pontosExercicio(exId) {
  return [...db.sessoes].sort((a, b) => a.inicio - b.inicio)
    .filter((s) => s.series[exId] && s.series[exId].some((x) => x.ok))
    .map((s) => ({ data: s.data, kg: cargaMax(s.series[exId]), series: s.series[exId] }));
}

function grafico(pontos, alto = 70) {
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
  let h = `<h1>Progresso</h1><div class="chips">${FICHAS.map((f) => `<a href="#/progresso/${f}" class="${f === sel ? 'sel' : ''} ${TREINOS[f] ? '' : 'vazia'}">${f}</a>`).join('')}</div>`;
  const t = TREINOS[sel];
  if (!t) return h + `<div class="vazio">Ficha ${sel} ainda não cadastrada.</div>`;
  h += `<p class="muted small" style="margin-top:12px">${esc(t.progressao)}</p>`;
  for (const ex of exerciciosDe(t)) {
    const pts = pontosExercicio(ex.id);
    const ult = pts[pts.length - 1];
    const st = ult && statusProgressao(ex, ult.series);
    const ini = pts[0];
    const ganho = ult && ini && ult.kg - ini.kg;
    h += `<a class="card" href="#/exercicio/${ex.id}" style="display:block;color:inherit;text-decoration:none">
      <div class="linha entre"><span class="tag">${esc(ex.grupo)}</span>${st === 'subir' ? '<span class="tag up">↑ Subir carga</span>' : st === 'manter' ? '<span class="tag">Manter</span>' : ''}</div>
      <div class="ex-nome">${esc(ex.nome)}</div>
      ${ult ? `<div class="linha entre small"><span class="muted">Atual: <b style="color:var(--text)">${fmtKg(ult.kg)} ${UNIDADE[ex.carga]}</b></span>
        <span class="muted">${pts.length} treino${pts.length > 1 ? 's' : ''}${ganho ? ` · ${ganho > 0 ? '+' : ''}${fmtKg(ganho)} kg` : ''}</span></div>${grafico(pts)}`
        : '<p class="muted small">Sem registros ainda.</p>'}</a>`;
  }
  return h;
}

function telaExercicio(exId) {
  let ex, ficha;
  for (const f of FICHAS) { const t = TREINOS[f]; if (!t) continue; const e = exerciciosDe(t).find((x) => x.id === exId); if (e) { ex = e; ficha = f; } }
  if (!ex) return `<div class="vazio">Exercício não encontrado.</div>`;
  const pts = pontosExercicio(ex.id);
  let h = `<a href="#/progresso/${ficha}" class="small">‹ Progresso ${ficha}</a><h1 style="font-size:22px">${esc(ex.nome)}</h1>
    <p class="muted small">${esc(ex.grupo)} · ${ex.reps[0]}-${ex.reps[1]} reps · carga em ${UNIDADE[ex.carga]}</p>`;
  if (!pts.length) return h + `<div class="vazio">Sem registros ainda.</div>`;
  h += `<div class="card"><p class="small muted">Maior carga por treino</p>${grafico(pts, 140) || '<p class="small muted">O gráfico aparece a partir do 2º treino.</p>'}</div>`;
  h += `<div class="card"><table><tr><th>Data</th><th class="num">Séries (kg × reps)</th><th></th></tr>`;
  for (const p of [...pts].reverse()) {
    const st = statusProgressao(ex, p.series);
    h += `<tr><td>${fmtData(p.data)}</td><td class="num">${resumoSeries(p.series)}</td><td>${st === 'subir' ? '<span class="tag up">↑</span>' : ''}</td></tr>`;
  }
  return h + `</table></div><div class="card small muted">${esc(ex.dica)}</div>`;
}

// ---------- Tela: Ajustes ----------
function telaAjustes() {
  return `<h1>Ajustes</h1>
    <div class="card"><div class="linha entre"><div class="cresce"><b>Manter tela ligada</b><p class="muted small">Durante o treino a tela não apaga sozinha.</p></div>
      <button class="btn-mini" data-acao="tela">${db.config.telaLigada ? 'Ligado' : 'Desligado'}</button></div></div>
    <div class="card"><h2>Backup</h2>
      <p class="muted small">Os dados ficam salvos só neste celular. Faça backup de vez em quando (ex.: salvar no app Arquivos ou iCloud Drive).</p>
      <button class="btn" data-acao="exportar">Exportar backup</button>
      <label class="btn sec">Importar backup<input type="file" accept="application/json,.json" data-acao="importar" hidden></label></div>
    <div class="card"><h2>Divisão semanal</h2>
      <p class="small">${[1, 2, 3, 4, 5, 6, 0].map((d) => `${DIAS[d]} ${PLANO_SEMANAL[d] || 'descanso'}`).join(' · ')}</p></div>
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
    db = Object.assign(novoDb(), { sessoes: dados.sessoes, ativa: dados.ativa || null, config: { ...novoDb().config, ...dados.config } });
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
  else if (acao === 'video') abrirVideo(el);

  else if (acao === 'check') {
    const g = el.dataset.grupo, i = +el.dataset.i;
    if (g === 'cardioIni') a.checks.cardioIni = !a.checks.cardioIni;
    else a.checks[g][i] = !a.checks[g][i];
    el.classList.toggle('on'); salvar();
  }

  else if (acao === 'serie') {
    const linha = el.closest('.serie');
    const exId = linha.dataset.ex, i = +linha.dataset.i;
    const s = a.series[exId][i];
    if (!s.ok) {
      const vazio = ['kg', 'reps'].find((c) => num(s[c]) === null);
      if (vazio) {
        const inp = $(`[data-campo="${vazio}"]`, linha);
        inp.classList.remove('erro'); void inp.offsetWidth; inp.classList.add('erro'); inp.focus();
        return toast(vazio === 'kg' ? 'Informe a carga' : 'Informe as repetições');
      }
    }
    s.ok = !s.ok;
    linha.classList.toggle('feita', s.ok);
    if (document.activeElement) document.activeElement.blur();
    // Se a próxima série ainda não tem carga, copia a desta
    const prox = a.series[exId][i + 1];
    if (s.ok && prox && !prox.ok && num(prox.kg) === null) {
      prox.kg = s.kg;
      const inp = $(`.serie[data-ex="${exId}"][data-i="${i + 1}"] [data-campo="kg"]`);
      if (inp) inp.value = s.kg;
    }
    // Volta completa (todos os exercícios do bloco com a série i feita) => descanso
    const blocos = TREINOS[a.treino].blocos;
    const bloco = blocos.find((b) => b.exercicios.some((x) => x.id === exId));
    const fimDoTreino = bloco === blocos[blocos.length - 1] && i === bloco.voltas - 1;
    if (s.ok && !fimDoTreino && bloco.exercicios.every((x) => a.series[x.id][i].ok)) iniciarDescanso(bloco, i);
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
  }
});

document.addEventListener('change', (e) => {
  if (e.target.dataset.acao === 'importar') importar(e.target);
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
