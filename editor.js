'use strict';

// Aba "Treinos": consulta e edição das fichas dentro do app.
// As fichas pertencem ao programa ativo (programas.js). No programa padrão (Treino AB), a primeira
// edição de uma ficha copia a versão de treinos.js para o programa; "Restaurar original" apaga a cópia.

const CARGAS = [
  ['total', 'Carga total (kg): máquina, barra ou polia'],
  ['halter', 'Por halter (kg): um em cada mão'],
  ['unico', 'Um halter só (kg)'],
  ['assist', 'Assistência (kg): menos é progresso'],
  ['corporal', 'Peso corporal: só repetições'],
  ['elastico', 'Elástico: anotar cor ou nível'],
];
const ROTULO_CARGA = Object.fromEntries(CARGAS.map(([k, v]) => [k, v.split(':')[0].split(' (')[0]]));
const LADOS = [['', 'Bilateral (normal)'], ['por lado', 'Por lado'], ['por perna', 'Por perna'], ['passos por direção', 'Passos por direção']];


// Aceita link do YouTube (watch, youtu.be, shorts, embed) ou o código de 11 caracteres
function idVideo(txt) {
  const t = (txt || '').trim();
  const m = t.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  if (m) return m[1];
  return /^[\w-]{11}$/.test(t) ? t : null;
}
const ehShort = (txt) => /shorts\//.test(txt || '');

function novoIdExercicio(f, nome) {
  const slug = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return `${f.toLowerCase()}-${slug || 'exercicio'}-${uid().slice(-4)}`;
}

function gruposConhecidos() {
  const g = new Set();
  for (const c of CATALOGO) g.add(c.grupo);
  for (const f of fichasIds()) for (const ex of exerciciosDe(fichaDe(f))) if (ex.grupo) g.add(ex.grupo);
  return [...g].sort();
}

const metaBloco = (b) => (b.modo === 'series'
  ? `${b.voltas} séries por exercício · descanso ${b.descanso[0]}-${b.descanso[1]} s entre séries`
  : `${b.voltas} voltas · descanso ${b.descanso[0]}-${b.descanso[1]} s após cada volta`);

const opcoes = (lista, sel) => lista.map(([v, t]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`).join('');

// ---------- Lista de fichas ----------
function telaTreinos() {
  const p = programaAtivo();
  let h = `<h1>Treinos</h1>`;
  if (!p) {
    h += `<div class="card destaque"><h2>Você ainda não tem um programa</h2>
      <p class="muted small">Crie com o assistente, monte pelo catálogo ou importe uma ficha pronta.</p>
      <a class="btn" href="#/criar">Criar meu treino</a></div>`;
  } else {
    const prog = progressoPrograma(p);
    h += `<a class="card destaque" href="#/programa/${p.id}" style="display:block;color:inherit;text-decoration:none">
      <div class="linha entre"><span class="tag ac">Programa ativo</span><span class="small muted">Configurar ›</span></div>
      <h2 style="margin-top:8px">${esc(p.nome)}</h2><p class="muted small">${esc(prog.texto)}</p>
      ${prog.fracao !== null ? `<div class="progresso-barra"><i style="width:${prog.fracao * 100}%"></i></div>` : ''}</a>
      <p class="muted small">Toque numa ficha para consultar ou editar exercícios, séries, descansos e a ordem.</p>`;
  }
  for (const f of fichasIds()) {
    const t = fichaDe(f);
    if (!t) continue;
    const c = contarSeries(t, {});
    h += `<a class="card" href="#/ficha/${encodeURIComponent(f)}" style="display:block;color:inherit;text-decoration:none">
      <div class="linha entre"><span class="tag ac">${esc(f)}${tipoFicha(f) ? ` · ${esc(tipoFicha(f))}` : ''}</span>${foiEditada(f) ? '<span class="tag">editada</span>' : ''}</div>
      <h2 style="margin-top:8px">${esc(t.titulo)}</h2>
      <p class="muted small">${esc(t.resumo)}</p>
      <div class="linha entre small"><span class="muted">${t.blocos.length} blocos · ${exerciciosDe(t).length} exercícios · ${c.total} séries</span><span class="seta">›</span></div></a>`;
  }
  const outros = (db.programas || []).filter((x) => x.id !== p?.id);
  if (outros.length) {
    h += `<h3>Outros programas</h3><div class="card">${outros.map((x) => `<a class="item" href="#/programa/${x.id}">
      <div class="cresce"><b>${esc(x.nome)}</b><div class="muted small">${x.ordem.length} fichas · ${esc(progressoPrograma(x).texto)}</div></div><span class="seta">›</span></a>`).join('')}</div>`;
  }
  return h + `<a class="btn" href="#/criar">+ Novo programa</a>
    <a class="btn sec" href="#/catalogo">Catálogo de exercícios (${CATALOGO.length})</a>`;
}

// ---------- Ficha: consulta e modo edição ----------
function telaFicha(f, args) {
  const t = fichaDe(f);
  if (!t) return `<div class="vazio">Ficha não encontrada.</div>`;
  const editando = args[1] === 'editar';
  let h = `<a href="#/treinos" class="small">‹ Treinos</a>
    <h1>${esc(t.titulo)}</h1><p class="muted">${esc(t.tipo)} · ${esc(t.resumo)}</p>`;

  if (!editando) {
    h += `<div class="linha" style="gap:8px"><a class="btn sec" href="#/ficha/${f}/editar">✏️ Editar ficha</a>
      <button class="btn" data-acao="iniciar" data-ficha="${f}">Iniciar ${f}</button></div>`;
    h += `${t.cardioInicial ? `<div class="card"><h2>${esc(t.cardioInicial.titulo)}</h2><p class="small muted">${esc(t.cardioInicial.texto)}</p></div>` : ''}
      ${cartaoSecaoComp(t.tituloPreparacao || 'Preparação', 'prep', t.preparacao, null, t.avisos || [])}`;
    let n = 0;
    for (const b of t.blocos) {
      h += `<div class="card"><h2>${esc(b.nome)} <span class="muted small">· ${esc(b.foco)}</span></h2><p class="muted small">${metaBloco(b)}</p>`;
      for (const ex of b.exercicios) {
        n++;
        h += `<div class="ex">
          <div class="linha entre"><span class="tag">${esc(ex.grupo)}</span><span class="small muted">${esc(faixaReps(ex))}</span></div>
          <div class="ex-nome">${n} · ${esc(ex.nome)}</div>
          <p class="small muted">${esc(ROTULO_CARGA[ex.carga] || '')}${ex.extra ? ` · anotar ${esc(ex.extra)}` : ''}</p>
          <details><summary>Dica e vídeo ▾</summary><p>${esc(ex.dica || '')}</p>${videoExercicio(ex)}</details></div>`;
      }
      h += `</div>`;
    }
    h += cartaoSecaoComp('Core', 'core', t.core || [], null);
    h += `${cartaoSecaoComp(t.tituloMobilidade || 'Mobilidade', 'mob', t.mobilidade, null)}
      ${t.cardioFinal ? `<div class="card"><h2>${esc(t.cardioFinal.titulo)}</h2><p class="small muted">${esc(t.cardioFinal.texto)}</p></div>` : ''}
      <div class="card"><h2>Carga e progressão</h2><p class="small muted">${esc(t.progressao)}</p></div>`;
    return h;
  }

  // Modo edição
  h += `<div class="card destaque small">Modo edição: use ↑ ↓ para mudar a ordem, ✎ para alterar e 🗑 para remover.
    As mudanças são salvas na hora. O histórico dos treinos já feitos não é afetado.</div>`;
  t.blocos.forEach((b, bi) => {
    h += `<div class="card ed-bloco">
      <div class="linha entre"><div class="cresce"><h2>${esc(b.nome)} <span class="muted small">· ${esc(b.foco)}</span></h2><p class="muted small">${metaBloco(b)}</p></div>
        <div class="ed-acoes">
          <button data-acao="ed-bloco-mover" data-f="${f}" data-bi="${bi}" data-dir="-1" ${bi === 0 ? 'disabled' : ''} aria-label="Subir bloco">↑</button>
          <button data-acao="ed-bloco-mover" data-f="${f}" data-bi="${bi}" data-dir="1" ${bi === t.blocos.length - 1 ? 'disabled' : ''} aria-label="Descer bloco">↓</button>
          <button data-acao="ir" data-href="#/editar-bloco/${f}/${bi}" aria-label="Editar bloco">✎</button>
          <button class="perigo" data-acao="ed-bloco-remover" data-f="${f}" data-bi="${bi}" aria-label="Remover bloco">🗑</button>
        </div></div>`;
    b.exercicios.forEach((ex, ei) => {
      h += `<div class="ed-ex"><span class="num-ex">${ei + 1}</span>
        <div class="cresce"><b class="small">${esc(ex.nome)}</b><div class="muted small">${esc(ex.grupo)} · ${esc(faixaReps(ex))} · ${esc(ROTULO_CARGA[ex.carga] || '')}</div></div>
        <div class="ed-acoes">
          <button data-acao="ir" data-href="#/trocar/ficha/${f}/${bi}/${ei}" aria-label="Trocar por equivalente">⇄</button>
          <button data-acao="ed-ex-mover" data-f="${f}" data-bi="${bi}" data-ei="${ei}" data-dir="-1" ${ei === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button data-acao="ed-ex-mover" data-f="${f}" data-bi="${bi}" data-ei="${ei}" data-dir="1" ${ei === b.exercicios.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
          <button data-acao="ir" data-href="#/editar-ex/${f}/${bi}/${ei}" aria-label="Editar">✎</button>
          <button class="perigo" data-acao="ed-ex-remover" data-f="${f}" data-bi="${bi}" data-ei="${ei}" aria-label="Remover">🗑</button>
        </div></div>`;
    });
    h += `<a class="btn-add" href="#/escolher/${f}/${bi}">+ Adicionar exercício</a></div>`;
  });
  h += `<a class="btn-add" href="#/editar-bloco/${f}/novo">+ Adicionar bloco</a>`;
  for (const [campo, titulo] of SECOES_COMP) {
    const lista = (campo === 'preparacao' ? t.preparacao : campo === 'core' ? t.core : t.mobilidade) || [];
    const tit = campo === 'preparacao' ? t.tituloPreparacao || titulo : campo === 'mobilidade' ? t.tituloMobilidade || titulo : titulo;
    h += `<div class="card ed-bloco"><h2>${esc(tit)}</h2>`;
    lista.forEach((c, i) => {
      h += `<div class="ed-ex"><span class="num-ex">${i + 1}</span>
        <div class="cresce"><b class="small">${esc(c.nome)}</b><div class="muted small">${c.series || 1} × ${esc(c.dose || '')}${c.video ? ' · ▶ vídeo' : ''}</div></div>
        <div class="ed-acoes">
          <button data-acao="ed-comp-mover" data-f="${f}" data-campo="${campo}" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button data-acao="ed-comp-mover" data-f="${f}" data-campo="${campo}" data-i="${i}" data-dir="1" ${i === lista.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
          <button data-acao="ir" data-href="#/editar-comp/${f}/${campo}/${i}" aria-label="Editar">✎</button>
          <button class="perigo" data-acao="ed-comp-remover" data-f="${f}" data-campo="${campo}" data-i="${i}" aria-label="Remover">🗑</button>
        </div></div>`;
    });
    h += `<a class="btn-add" href="#/editar-comp/${f}/${campo}/novo">+ Adicionar à ${esc(tit.toLowerCase())}</a></div>`;
  }
  h += `<a class="btn sec" href="#/editar-textos/${f}">Cardio, avisos e textos da ficha</a>
    ${foiEditada(f) ? `<button class="btn perigo" data-acao="ed-restaurar" data-f="${f}">Restaurar ficha original</button>` : ''}
    <a class="btn" href="#/ficha/${f}">Concluir edição</a>`;
  return h;
}

// ---------- Formulário de exercício ----------
// args: [f, bi, ei | 'novo', 'substituir'?]
function telaEditarEx(f, args) {
  const t = fichaDe(f);
  const bi = +args[1], novo = args[2] === 'novo', ei = novo ? -1 : +args[2], substituir = args[3] === 'substituir';
  const b = t && t.blocos[bi];
  const atual = b && !novo ? b.exercicios[ei] : null;
  if (!b || (!novo && !atual)) return `<div class="vazio">Exercício não encontrado.<a class="btn sec" href="#/ficha/${f}/editar">Voltar</a></div>`;

  const base = novo ? { grupo: b.exercicios[0]?.grupo || '', carga: 'total', reps: [10, 12] }
    : substituir ? { grupo: atual.grupo, carga: atual.carga, reps: atual.reps, lado: atual.lado }
      : atual;
  const titulo = novo ? 'Novo exercício' : substituir ? 'Trocar exercício' : 'Editar exercício';
  const aviso = novo ? `Será adicionado ao ${esc(b.nome)}.`
    : substituir ? `Substituindo <b>${esc(atual.nome)}</b>. O novo exercício começa um histórico de cargas próprio; os treinos antigos continuam no histórico.`
      : 'Ajustes aqui mantêm o histórico de cargas deste exercício. Para colocar outro exercício no lugar, use "Trocar por outro exercício".';
  const urlVideo = base.video ? (base.vertical ? `https://youtube.com/shorts/${base.video}` : `https://youtu.be/${base.video}`) : '';

  return `<a href="#/ficha/${f}/editar" class="small">‹ ${esc(t.titulo)}</a><h1>${titulo}</h1>
    <p class="muted small">${aviso}</p>
    <div class="card form">
      <label>Nome do exercício<input class="input-texto" id="f-nome" value="${esc(base.nome || '')}" placeholder="ex.: Supino reto com halteres"></label>
      <label>Grupo muscular<input class="input-texto" id="f-grupo" list="grupos" value="${esc(base.grupo || '')}" placeholder="ex.: Peito">
        <datalist id="grupos">${gruposConhecidos().map((g) => `<option value="${esc(g)}">`).join('')}</datalist></label>
      <label>Tipo de carga<select id="f-carga">${opcoes(CARGAS, base.carga)}</select></label>
      <div class="dupla">
        <label>Repetições mín.<input class="input-texto" id="f-rmin" inputmode="numeric" value="${base.reps[0]}"></label>
        <label>Repetições máx.<input class="input-texto" id="f-rmax" inputmode="numeric" value="${base.reps[1]}"></label>
      </div>
      <label>Lado<select id="f-lado">${opcoes(LADOS, base.lado || '')}</select></label>
      <label>Dica de execução<textarea id="f-dica" rows="3" placeholder="Pontos de atenção na execução">${esc(base.dica || '')}</textarea></label>
      <label>Vídeo (link do YouTube, opcional)<input class="input-texto" id="f-video" value="${esc(urlVideo)}" placeholder="Cole aqui o link do vídeo"></label>
      <div id="video-prev">${base.video ? `<img class="thumb-mini" src="https://i.ytimg.com/vi/${esc(base.video)}/hqdefault.jpg" alt="">` : ''}</div>
      <label>Anotar também (opcional)<input class="input-texto" id="f-extra" value="${esc(base.extra || '')}" placeholder="ex.: Degrau (cm), Banco (inclinação)"></label>
      ${!novo && !substituir ? `<label>Bloco<select id="f-bloco">${opcoes(t.blocos.map((x, i) => [String(i), `${x.nome} · ${x.foco}`]), String(bi))}</select></label>` : ''}
    </div>
    <div class="barra-fixa">
      <a class="btn sec" href="#/ficha/${f}/editar">Cancelar</a>
      <button class="btn" data-acao="ed-salvar-ex" data-f="${f}" data-bi="${bi}" data-ei="${ei}" data-modo="${novo ? 'novo' : substituir ? 'substituir' : 'editar'}">Salvar</button>
    </div>
    ${!novo && !substituir ? `<a class="btn sec" href="#/trocar/ficha/${f}/${bi}/${ei}">⇄ Trocar por outro exercício</a>
      <button class="btn perigo" data-acao="ed-ex-remover" data-f="${f}" data-bi="${bi}" data-ei="${ei}">Remover da ficha</button>` : ''}`;
}

function salvarExercicio(el) {
  const { f, modo } = el.dataset;
  const bi = +el.dataset.bi, ei = +el.dataset.ei;
  const val = (id) => ($(`#${id}`)?.value || '').trim();
  const nome = val('f-nome');
  const rmin = parseInt(val('f-rmin'), 10), rmax = parseInt(val('f-rmax'), 10);
  if (!nome) return toast('Dê um nome ao exercício');
  if (!(rmin >= 1 && rmax >= rmin && rmax <= 100)) return toast('Confira a faixa de repetições');
  const link = val('f-video');
  const video = link ? idVideo(link) : null;
  if (link && !video) return toast('Link de vídeo não reconhecido');

  const ex = { nome, grupo: val('f-grupo'), carga: val('f-carga') || 'total', reps: [rmin, rmax], dica: val('f-dica') };
  if (val('f-lado')) ex.lado = val('f-lado');
  if (val('f-extra')) ex.extra = val('f-extra');
  if (video) { ex.video = video; if (ehShort(link)) ex.vertical = true; }

  const t = editavel(f);
  if (modo === 'novo') {
    ex.id = novoIdExercicio(f, nome);
    t.blocos[bi].exercicios.push(ex);
  } else if (modo === 'substituir') {
    ex.id = novoIdExercicio(f, nome);
    t.blocos[bi].exercicios[ei] = ex;
  } else {
    const antigo = t.blocos[bi].exercicios[ei];
    ex.id = antigo.id; // mesmo id = mesmo histórico de cargas
    if (antigo.vertical && video === antigo.video && !ehShort(link)) ex.vertical = true;
    const destino = val('f-bloco') === '' ? bi : +val('f-bloco');
    if (destino === bi) t.blocos[bi].exercicios[ei] = ex;
    else { t.blocos[bi].exercicios.splice(ei, 1); t.blocos[destino].exercicios.push(ex); }
  }
  salvar();
  toast(modo === 'novo' ? 'Exercício adicionado' : modo === 'substituir' ? 'Exercício trocado' : 'Exercício salvo');
  location.hash = `#/ficha/${f}/editar`;
}

// ---------- Formulário de bloco ----------
function telaEditarBloco(f, args) {
  const t = fichaDe(f);
  const novo = args[1] === 'novo', bi = novo ? -1 : +args[1];
  const b = novo ? { nome: `Bloco ${t.blocos.length + 1}`, foco: '', voltas: 2, descanso: [60, 90], modo: t.blocos[t.blocos.length - 1]?.modo } : t.blocos[bi];
  if (!b) return `<div class="vazio">Bloco não encontrado.</div>`;
  return `<a href="#/ficha/${f}/editar" class="small">‹ ${esc(t.titulo)}</a><h1>${novo ? 'Novo bloco' : 'Editar bloco'}</h1>
    <div class="card form">
      <label>Nome<input class="input-texto" id="b-nome" value="${esc(b.nome)}"></label>
      <label>Foco / descrição<input class="input-texto" id="b-foco" value="${esc(b.foco)}" placeholder="ex.: Peito / costas"></label>
      <label>Formato<select id="b-modo">${opcoes([['', 'Em voltas (circuito): faz um exercício de cada e repete'], ['series', 'Séries tradicionais: termina as séries de um exercício antes do próximo']], b.modo || '')}</select></label>
      <label>Séries por exercício (ou nº de voltas)<input class="input-texto" id="b-voltas" inputmode="numeric" value="${b.voltas}"></label>
      <div class="dupla">
        <label>Descanso mín. (s)<input class="input-texto" id="b-dmin" inputmode="numeric" value="${b.descanso[0]}"></label>
        <label>Descanso máx. (s)<input class="input-texto" id="b-dmax" inputmode="numeric" value="${b.descanso[1]}"></label>
      </div>
    </div>
    <div class="barra-fixa">
      <a class="btn sec" href="#/ficha/${f}/editar">Cancelar</a>
      <button class="btn" data-acao="ed-salvar-bloco" data-f="${f}" data-bi="${bi}">Salvar</button>
    </div>`;
}

function salvarBloco(el) {
  const f = el.dataset.f, bi = +el.dataset.bi;
  const val = (id) => ($(`#${id}`)?.value || '').trim();
  const voltas = parseInt(val('b-voltas'), 10), dmin = parseInt(val('b-dmin'), 10), dmax = parseInt(val('b-dmax'), 10);
  if (!val('b-nome')) return toast('Dê um nome ao bloco');
  if (!(voltas >= 1 && voltas <= 10)) return toast('Séries: de 1 a 10');
  if (!(dmin >= 0 && dmax >= dmin && dmax <= 600)) return toast('Confira o descanso (em segundos)');
  const t = editavel(f);
  const dados = { nome: val('b-nome'), foco: val('b-foco'), voltas, descanso: [dmin, dmax] };
  if (bi < 0) {
    t.blocos.push({ ...dados, ...(val('b-modo') ? { modo: 'series' } : {}), exercicios: [] });
  } else {
    const b = t.blocos[bi];
    Object.assign(b, dados);
    if (val('b-modo')) b.modo = 'series'; else delete b.modo;
  }
  salvar(); toast('Bloco salvo');
  location.hash = `#/ficha/${f}/editar`;
}

// ---------- Textos da ficha ----------
function telaEditarTextos(f) {
  const t = fichaDe(f);
  const linhas = (arr) => esc((arr || []).join('\n'));
  return `<a href="#/ficha/${f}/editar" class="small">‹ ${esc(t.titulo)}</a><h1>Textos da ficha</h1>
    <p class="muted small">Os exercícios de preparação, core e mobilidade são editados na própria ficha. Aqui ficam os textos.</p>
    <div class="card form">
      <label>Como executar<textarea id="x-instrucoes" rows="3">${esc(t.instrucoes)}</textarea></label>
      <label>Cardio inicial: título<input class="input-texto" id="x-ci-titulo" value="${esc(t.cardioInicial?.titulo || '')}" placeholder="Deixe vazio para não ter cardio inicial"></label>
      <label>Cardio inicial: descrição<textarea id="x-ci-texto" rows="2">${esc(t.cardioInicial?.texto || '')}</textarea></label>
      <label>Preparação: título<input class="input-texto" id="x-prep-titulo" value="${esc(t.tituloPreparacao || 'Preparação')}"></label>
      <label>Avisos da preparação (um por linha)<textarea id="x-avisos" rows="4">${linhas(t.avisos)}</textarea></label>
      <label>Mobilidade: título<input class="input-texto" id="x-mob-titulo" value="${esc(t.tituloMobilidade || 'Mobilidade')}"></label>
      <label>Cardio final: título<input class="input-texto" id="x-cf-titulo" value="${esc(t.cardioFinal?.titulo || '')}" placeholder="Deixe vazio para não ter cardio final"></label>
      <label>Cardio final: descrição<textarea id="x-cf-texto" rows="2">${esc(t.cardioFinal?.texto || '')}</textarea></label>
      <label>Carga e progressão<textarea id="x-prog" rows="3">${esc(t.progressao)}</textarea></label>
    </div>
    <div class="barra-fixa">
      <a class="btn sec" href="#/ficha/${f}/editar">Cancelar</a>
      <button class="btn" data-acao="ed-salvar-textos" data-f="${f}">Salvar</button>
    </div>`;
}

function salvarTextos(el) {
  const f = el.dataset.f;
  const val = (id) => ($(`#${id}`)?.value || '').trim();
  const lista = (id) => val(id).split('\n').map((s) => s.trim()).filter(Boolean);
  const t = editavel(f);
  t.instrucoes = val('x-instrucoes');
  const minutos = (txt) => parseInt((txt.match(/(\d+)\s*min/) || [])[1], 10) || 15;
  t.cardioInicial = val('x-ci-titulo') ? { titulo: val('x-ci-titulo'), texto: val('x-ci-texto'), min: minutos(val('x-ci-titulo')) } : null;
  t.tituloPreparacao = val('x-prep-titulo');
  t.avisos = lista('x-avisos');
  t.tituloMobilidade = val('x-mob-titulo');
  t.cardioFinal = val('x-cf-titulo') ? { titulo: val('x-cf-titulo'), texto: val('x-cf-texto'), min: minutos(val('x-cf-titulo')) } : null;
  t.progressao = val('x-prog');
  salvar(); toast('Textos salvos');
  location.hash = `#/ficha/${f}/editar`;
}

// ---------- Exercício complementar (preparação, core, mobilidade) ----------
const SECOES_COMP = [['preparacao', 'Preparação'], ['core', 'Core'], ['mobilidade', 'Mobilidade']];

// args: [f, campo, i | 'novo']
function telaEditarComp(f, args) {
  const t = fichaDe(f), campo = args[1], novo = args[2] === 'novo';
  if (!SECOES_COMP.some(([c]) => c === campo)) return `<div class="vazio">Seção não encontrada.</div>`;
  const c = novo ? { nome: '', series: 1, dose: '', dica: '' } : (t[campo] || [])[+args[2]];
  if (!c) return `<div class="vazio">Exercício não encontrado.</div>`;
  const urlVideo = c.video ? (c.vertical ? `https://youtube.com/shorts/${c.video}` : `https://youtu.be/${c.video}`) : '';
  return `<a href="#/ficha/${f}/editar" class="small">‹ ${esc(t.titulo)}</a><h1>${novo ? 'Novo exercício' : 'Editar exercício'}</h1>
    <p class="muted small">${esc(SECOES_COMP.find(([x]) => x === campo)[1])}</p>
    <div class="card form">
      <label>Nome<input class="input-texto" id="c-nome" value="${esc(c.nome)}" placeholder="ex.: Prancha frontal"></label>
      <div class="dupla">
        <label>Séries<input class="input-texto" id="c-series" inputmode="numeric" value="${c.series || 1}"></label>
        <label>Por série<input class="input-texto" id="c-dose" value="${esc(c.dose || '')}" placeholder="ex.: 30 s, 10 por lado"></label>
      </div>
      <label>Dica de execução<textarea id="c-dica" rows="3">${esc(c.dica || '')}</textarea></label>
      <label>Vídeo (link do YouTube, opcional)<input class="input-texto" id="f-video" value="${esc(urlVideo)}" placeholder="Cole aqui o link do vídeo"></label>
      <div id="video-prev">${c.video ? `<img class="thumb-mini" src="https://i.ytimg.com/vi/${esc(c.video)}/hqdefault.jpg" alt="">` : ''}</div>
    </div>
    <div class="barra-fixa">
      <a class="btn sec" href="#/ficha/${f}/editar">Cancelar</a>
      <button class="btn" data-acao="ed-salvar-comp" data-f="${f}" data-campo="${campo}" data-i="${novo ? -1 : args[2]}">Salvar</button>
    </div>`;
}

function salvarComp(el) {
  const { f, campo } = el.dataset, i = +el.dataset.i;
  const val = (id) => ($(`#${id}`)?.value || '').trim();
  const series = parseInt(val('c-series'), 10);
  if (!val('c-nome')) return toast('Dê um nome ao exercício');
  if (!(series >= 1 && series <= 10)) return toast('Séries: de 1 a 10');
  const link = val('f-video'), video = link ? idVideo(link) : null;
  if (link && !video) return toast('Link de vídeo não reconhecido');
  const t = editavel(f);
  const lista = (t[campo] ??= []);
  const antigo = i >= 0 ? lista[i] : null;
  const c = { id: antigo ? antigo.id : `comp-${uid()}`, nome: val('c-nome'), series, dose: val('c-dose'), dica: val('c-dica') };
  if (video) { c.video = video; if (ehShort(link) || (antigo?.vertical && antigo.video === video)) c.vertical = true; }
  if (antigo) lista[i] = c; else lista.push(c);
  salvar(); toast('Exercício salvo');
  location.hash = `#/ficha/${f}/editar`;
}

// ---------- Ações ----------
function trocar(arr, i, j) { [arr[i], arr[j]] = [arr[j], arr[i]]; }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el) return;
  const acao = el.dataset.acao;
  if (!acao.startsWith('ed-') && acao !== 'ir') return;
  const f = el.dataset.f, bi = +el.dataset.bi, ei = +el.dataset.ei, dir = +el.dataset.dir;

  if (acao === 'ir') location.hash = el.dataset.href;
  else if (acao === 'ed-bloco-mover') {
    const t = editavel(f); trocar(t.blocos, bi, bi + dir); salvar(); render();
  } else if (acao === 'ed-ex-mover') {
    const ex = editavel(f).blocos[bi].exercicios; trocar(ex, ei, ei + dir); salvar(); render();
  } else if (acao === 'ed-ex-remover') {
    const ex = fichaDe(f).blocos[bi].exercicios[ei];
    if (!confirm(`Remover "${ex.nome}" da ficha ${f}? Os treinos já feitos continuam no histórico.`)) return;
    editavel(f).blocos[bi].exercicios.splice(ei, 1); salvar();
    toast('Exercício removido');
    if (rotaAtual().pag === 'ficha') render(); else location.hash = `#/ficha/${f}/editar`;
  } else if (acao === 'ed-bloco-remover') {
    const b = fichaDe(f).blocos[bi];
    if (fichaDe(f).blocos.length === 1) return toast('A ficha precisa de pelo menos um bloco');
    const msg = b.exercicios.length
      ? `Remover o ${b.nome} e seus ${b.exercicios.length} exercícios da ficha ${f}? Os treinos já feitos continuam no histórico.`
      : `Remover o ${b.nome}?`;
    if (!confirm(msg)) return;
    editavel(f).blocos.splice(bi, 1); salvar(); render(); toast('Bloco removido');
  } else if (acao === 'ed-salvar-ex') salvarExercicio(el);
  else if (acao === 'ed-salvar-bloco') salvarBloco(el);
  else if (acao === 'ed-salvar-textos') salvarTextos(el);
  else if (acao === 'ed-salvar-comp') salvarComp(el);
  else if (acao === 'ed-comp-mover') {
    const lista = editavel(f)[el.dataset.campo]; const i = +el.dataset.i;
    trocar(lista, i, i + dir); salvar(); render();
  } else if (acao === 'ed-comp-remover') {
    const lista = fichaDe(f)[el.dataset.campo]; const i = +el.dataset.i;
    if (!confirm(`Remover "${lista[i].nome}" da ficha ${f}?`)) return;
    editavel(f)[el.dataset.campo].splice(i, 1); salvar(); render(); toast('Exercício removido');
  }
  else if (acao === 'ed-restaurar') {
    if (!confirm(`Voltar a ficha ${f} para a versão original? Todas as alterações feitas nela serão desfeitas. O histórico de treinos não é afetado.`)) return;
    delete programaAtivo().fichas[f]; salvar(); toast('Ficha restaurada'); location.hash = `#/ficha/${f}`;
  }
});

// Prévia do vídeo enquanto o link é digitado
document.addEventListener('input', (e) => {
  if (e.target.id !== 'f-video') return;
  const id = idVideo(e.target.value);
  const prev = $('#video-prev');
  if (prev) prev.innerHTML = id ? `<img class="thumb-mini" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">`
    : e.target.value.trim() ? '<p class="small muted">Link não reconhecido</p>' : '';
});
