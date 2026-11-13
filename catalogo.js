'use strict';

// Catálogo de exercícios de musculação: todos os exercícios das fichas (treinos.js) + alternativas extras.
// Cada um tem um padrão de movimento e um equipamento; exercícios com o mesmo padrão são equivalentes
// e podem substituir um ao outro sem mudar o objetivo do treino.

const EQUIPAMENTOS = ['Máquina', 'Polia', 'Halteres', 'Barra', 'Smith', 'Peso corporal', 'Elástico'];
const GRUPOS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps', 'Posteriores', 'Glúteos', 'Panturrilhas'];

// id -> [padrão de movimento, equipamento] dos exercícios que já estão nas fichas
const META = {
  'a1-supino-reto-halteres': ['Peito · supino reto', 'Halteres'],
  'a2-supino-reto-barra': ['Peito · supino reto', 'Barra'],
  'a3-supino-horizontal-maquina': ['Peito · supino reto', 'Máquina'],
  'a1-supino-inclinado-maquina': ['Peito · supino inclinado', 'Máquina'],
  'a2-supino-inclinado-halteres': ['Peito · supino inclinado', 'Halteres'],
  'a3-supino-inclinado-smith': ['Peito · supino inclinado', 'Smith'],
  'a1-crucifixo-peck-deck': ['Peito · crucifixo', 'Máquina'],
  'a2-crossover-polia-alta': ['Peito · crucifixo', 'Polia'],
  'a3-crucifixo-polia-baixo-cima': ['Peito · crucifixo', 'Polia'],
  'a1-puxada-frontal': ['Costas · puxada vertical', 'Polia'],
  'a2-barra-fixa-assistida': ['Costas · puxada vertical', 'Máquina'],
  'a3-puxada-supinada': ['Costas · puxada vertical', 'Polia'],
  'a1-remada-baixa-neutra': ['Costas · remada', 'Polia'],
  'a2-remada-peito-apoiado': ['Costas · remada', 'Halteres'],
  'a2-remada-unilateral-maquina': ['Costas · remada', 'Máquina'],
  'a3-remada-cavalinho': ['Costas · remada', 'Máquina'],
  'a3-remada-alta-maquina-aberta': ['Costas · remada', 'Máquina'],
  'a1-pullover-polia': ['Costas · pullover', 'Polia'],
  'a1-desenvolvimento-halteres': ['Ombros · desenvolvimento', 'Halteres'],
  'a2-desenvolvimento-maquina': ['Ombros · desenvolvimento', 'Máquina'],
  'a1-elevacao-lateral': ['Ombros · elevação lateral', 'Halteres'],
  'a2-elevacao-lateral-polia': ['Ombros · elevação lateral', 'Polia'],
  'a3-crucifixo-inverso-maquina': ['Ombros · posterior', 'Máquina'],
  'a3-face-pull': ['Ombros · posterior', 'Polia'],
  'a1-rosca-inclinada': ['Bíceps · rosca', 'Halteres'],
  'a1-rosca-martelo': ['Bíceps · rosca', 'Halteres'],
  'a2-rosca-direta-barra': ['Bíceps · rosca', 'Barra'],
  'a2-rosca-scott-maquina': ['Bíceps · rosca', 'Máquina'],
  'a3-rosca-polia-braco-atras': ['Bíceps · rosca', 'Polia'],
  'a3-rosca-concentrada': ['Bíceps · rosca', 'Halteres'],
  'a1-triceps-corda': ['Tríceps · na polia', 'Polia'],
  'a2-triceps-barra-reta': ['Tríceps · na polia', 'Polia'],
  'a1-triceps-frances': ['Tríceps · acima da cabeça', 'Halteres'],
  'a2-triceps-acima-cabeca-polia': ['Tríceps · acima da cabeça', 'Polia'],
  'a3-triceps-testa-ez': ['Tríceps · testa e coice', 'Barra'],
  'a3-triceps-coice-polia': ['Tríceps · testa e coice', 'Polia'],
  'b1-leg-press-45': ['Quadríceps · agachamento e leg press', 'Máquina'],
  'b1-agachamento-goblet': ['Quadríceps · agachamento e leg press', 'Halteres'],
  'b2-agachamento-hack': ['Quadríceps · agachamento e leg press', 'Máquina'],
  'b3-agachamento-smith': ['Quadríceps · agachamento e leg press', 'Smith'],
  'b3-leg-press-horizontal': ['Quadríceps · agachamento e leg press', 'Máquina'],
  'b2-afundo-reverso': ['Quadríceps · unilateral', 'Halteres'],
  'b3-subida-degrau': ['Quadríceps · unilateral', 'Halteres'],
  'b1-extensora-bilateral': ['Quadríceps · cadeira extensora', 'Máquina'],
  'b2-extensora-unilateral': ['Quadríceps · cadeira extensora', 'Máquina'],
  'b-terra-romeno-barra': ['Posteriores · terra romeno / stiff', 'Barra'],
  'b1-cadeira-flexora': ['Posteriores · flexão de joelho', 'Máquina'],
  'b1-mesa-flexora-bilateral': ['Posteriores · flexão de joelho', 'Máquina'],
  'b3-mesa-flexora-unilateral': ['Posteriores · flexão de joelho', 'Máquina'],
  'b2-flexao-joelho-pe-polia': ['Posteriores · flexão de joelho', 'Polia'],
  'b2-flexao-joelhos-bola': ['Posteriores · flexão de joelho', 'Peso corporal'],
  'b3-flexao-joelhos-discos': ['Posteriores · flexão de joelho', 'Peso corporal'],
  'b1-hip-thrust': ['Glúteos · extensão de quadril', 'Barra'],
  'b2-extensao-quadril-polia': ['Glúteos · extensão de quadril', 'Polia'],
  'b3-ponte-unilateral': ['Glúteos · extensão de quadril', 'Peso corporal'],
  'b1-cadeira-abdutora': ['Glúteos · abdução', 'Máquina'],
  'b2-caminhada-lateral-miniband': ['Glúteos · abdução', 'Elástico'],
  'b3-abducao-polia': ['Glúteos · abdução', 'Polia'],
  'b1-panturrilha-pe-maquina': ['Panturrilhas · em pé', 'Máquina'],
  'b2-panturrilha-leg-press': ['Panturrilhas · em pé', 'Máquina'],
  'b2-panturrilha-unilateral-halter': ['Panturrilhas · em pé', 'Halteres'],
  'b3-panturrilha-pe-smith': ['Panturrilhas · em pé', 'Smith'],
  'b1-panturrilha-sentada-maquina': ['Panturrilhas · sentado', 'Máquina'],
  'b3-panturrilha-sentada-halteres': ['Panturrilhas · sentado', 'Halteres'],
};

// Alternativas que não estão nas fichas, para ampliar as opções de troca
const EXTRAS = [
  { id: 'cat-flexao-de-braco', grupo: 'Peito', nome: 'Flexão de braço', carga: 'corporal', reps: [8, 15], padrao: 'Peito · supino reto', equip: 'Peso corporal',
    video: 'Azw6BZ8-wSM', dica: 'Corpo alinhado da cabeça aos pés; desça o peito até perto do chão com os cotovelos a cerca de 45°.' },
  { id: 'cat-puxada-triangulo', grupo: 'Costas', nome: 'Puxada frontal com triângulo (pegada neutra)', carga: 'total', reps: [10, 12], padrao: 'Costas · puxada vertical', equip: 'Polia',
    video: 'ktPLR6vCb1g', dica: 'Puxe o triângulo em direção ao peito, conduzindo os cotovelos para baixo, sem balançar o tronco.' },
  { id: 'cat-remada-curvada-barra', grupo: 'Costas', nome: 'Remada curvada com barra', carga: 'total', reps: [8, 10], padrao: 'Costas · remada', equip: 'Barra',
    video: 's4jeKLRghTM', dica: 'Tronco inclinado e coluna neutra; puxe a barra em direção ao abdome e controle a descida.' },
  { id: 'cat-pullover-halter', grupo: 'Costas', nome: 'Pullover com halter no banco', carga: 'unico', reps: [10, 12], padrao: 'Costas · pullover', equip: 'Halteres',
    video: 'TVUYI8UhahE', dica: 'Cotovelos levemente flexionados; leve o halter para trás da cabeça só até onde o ombro permitir sem dor.' },
  { id: 'cat-elevacao-lateral-maquina', grupo: 'Ombros', nome: 'Elevação lateral na máquina', carga: 'total', reps: [12, 15], padrao: 'Ombros · elevação lateral', equip: 'Máquina',
    video: '7KmaeJ4z66s', dica: 'Ombros alinhados ao eixo da máquina; eleve até a linha dos ombros e controle a descida.' },
  { id: 'cat-crucifixo-inverso-halteres', grupo: 'Ombros', nome: 'Crucifixo inverso com halteres', carga: 'halter', reps: [12, 15], padrao: 'Ombros · posterior', equip: 'Halteres',
    video: 'FtAtjWHM2jk', dica: 'Tronco inclinado e estável; abra os braços para os lados sem encolher os ombros.' },
  { id: 'cat-rosca-alternada', grupo: 'Bíceps', nome: 'Rosca alternada com halteres', carga: 'halter', reps: [10, 12], padrao: 'Bíceps · rosca', equip: 'Halteres',
    video: 'ZvHOiAVh6Bk', dica: 'Cotovelos fixos ao lado do corpo; suba um braço de cada vez sem balançar o tronco.' },
  { id: 'cat-triceps-mergulho-banco', grupo: 'Tríceps', nome: 'Tríceps mergulho no banco', carga: 'corporal', reps: [8, 12], padrao: 'Tríceps · peso corporal', equip: 'Peso corporal',
    video: 'qAKB1H2kz2g', dica: 'Mãos no banco, cotovelos apontados para trás; desça só até onde o ombro ficar confortável.' },
  { id: 'cat-agachamento-livre', grupo: 'Quadríceps', nome: 'Agachamento livre com barra', carga: 'total', reps: [8, 10], padrao: 'Quadríceps · agachamento e leg press', equip: 'Barra',
    video: 'rM6SDUdl9fs', dica: 'Barra apoiada no trapézio, pés na largura dos ombros; desça com a coluna neutra e os joelhos na direção dos pés.' },
  { id: 'cat-agachamento-bulgaro', grupo: 'Quadríceps', nome: 'Agachamento búlgaro com halteres', carga: 'halter', reps: [8, 10], lado: 'por perna', padrao: 'Quadríceps · unilateral', equip: 'Halteres',
    video: 'MzjO0-M-wns', dica: 'Pé de trás apoiado no banco; desça com o tronco firme e o joelho da frente alinhado ao pé.' },
  { id: 'cat-stiff-halteres', grupo: 'Posteriores', nome: 'Stiff com halteres', carga: 'halter', reps: [8, 10], padrao: 'Posteriores · terra romeno / stiff', equip: 'Halteres',
    video: '8R-Yz0yQIn0', dica: 'Joelhos levemente flexionados; leve o quadril para trás com os halteres perto das pernas e a coluna estável.' },
  { id: 'cat-hip-thrust-maquina', grupo: 'Glúteos', nome: 'Elevação pélvica na máquina', carga: 'total', reps: [10, 12], padrao: 'Glúteos · extensão de quadril', equip: 'Máquina',
    video: 'OCMjir2i6uU', dica: 'Escápulas apoiadas; eleve o quadril sem hiperestender a lombar e segure 1 s no topo.' },
];

const CATALOGO = (() => {
  const porId = new Map();
  for (const f of FICHAS) for (const b of TREINOS[f].blocos) for (const ex of b.exercicios) {
    if (!porId.has(ex.id)) porId.set(ex.id, { ...ex, padrao: META[ex.id]?.[0] || `${ex.grupo} · outros`, equip: META[ex.id]?.[1] || '' });
  }
  for (const ex of EXTRAS) porId.set(ex.id, ex);
  return [...porId.values()].sort((a, b) => GRUPOS.indexOf(a.grupo) - GRUPOS.indexOf(b.grupo) || a.nome.localeCompare(b.nome));
})();
const catalogoPorId = (id) => CATALOGO.find((x) => x.id === id) || null;

// Exercício do catálogo pronto para entrar numa ficha (sem os campos só do catálogo).
// Ao substituir, mantém a faixa de repetições do exercício que estava no lugar.
function paraFicha(c, slot) {
  const { padrao, equip, ...ex } = c;
  return { ...ex, reps: slot ? slot.reps : c.reps };
}

// ---------- Estado das telas do catálogo ----------
const filtroCat = { busca: '', equip: '', grupo: '' };
let catSel = null;
const normal = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function passaFiltro(c, soEquipamento = false) {
  if (filtroCat.equip && c.equip !== filtroCat.equip) return false;
  if (soEquipamento) return true; // na troca, os grupos já vêm separados por equivalência
  if (filtroCat.grupo && c.grupo !== filtroCat.grupo) return false;
  const q = normal(filtroCat.busca);
  return !q || normal(`${c.nome} ${c.grupo} ${c.padrao} ${c.equip}`).includes(q);
}

function chipsFiltro(campo, opcoesLista, rotuloTodos) {
  return `<div class="chips" style="margin-top:8px">
    <a href="#" data-acao="cat-filtro" data-campo="${campo}" data-valor="" class="${filtroCat[campo] ? '' : 'sel'}">${rotuloTodos}</a>
    ${opcoesLista.map((o) => `<a href="#" data-acao="cat-filtro" data-campo="${campo}" data-valor="${esc(o)}" class="${filtroCat[campo] === o ? 'sel' : ''}">${esc(o)}</a>`).join('')}</div>`;
}

function itemCatalogo(c, bloqueado) {
  const ult = ultimoRegistro(c.id);
  const sel = catSel === c.id;
  return `<div class="cat-item ${sel ? 'sel' : ''} ${bloqueado ? 'bloq' : ''}" ${bloqueado ? '' : `data-acao="cat-sel" data-id="${c.id}"`}>
    <div class="linha entre"><b class="small">${esc(c.nome)}</b><span class="tag">${esc(c.equip || '–')}</span></div>
    <div class="muted small">${esc(c.padrao)} · ${esc(faixaReps(c))}${bloqueado ? ' · já está neste treino' : ''}
      ${ult ? ` · última: ${resumoSeries(ult.series, c)}` : ''}</div>
    ${sel ? `<div class="cat-detalhe">${videoExercicio(c)}<p class="small muted">${esc(c.dica || '')}</p></div>` : ''}
  </div>`;
}

// ---------- Consulta do catálogo (aba Treinos) ----------
function telaCatalogo() {
  return `<a href="#/treinos" class="small">‹ Treinos</a><h1>Catálogo de exercícios</h1>
    <p class="muted small">${CATALOGO.length} exercícios. Toque num exercício para ver o vídeo e a dica.</p>
    <input class="input-texto" id="cat-busca" placeholder="Buscar (ex.: remada, polia, glúteo)" value="${esc(filtroCat.busca)}">
    ${chipsFiltro('grupo', GRUPOS, 'Todos os grupos')}
    ${chipsFiltro('equip', EQUIPAMENTOS, 'Todo equipamento')}
    <div id="cat-lista" class="card">${listaConsulta()}</div>`;
}
function listaConsulta() {
  const itens = CATALOGO.filter((c) => passaFiltro(c));
  if (!itens.length) return '<p class="muted small">Nenhum exercício encontrado.</p>';
  let h = '', grupo = '';
  for (const c of itens) {
    if (c.grupo !== grupo) { grupo = c.grupo; h += `<h3>${esc(grupo)}</h3>`; }
    h += itemCatalogo(c, false);
  }
  return h;
}

// ---------- Trocar exercício por um equivalente ----------
// #/trocar/sessao/<bi>/<ei>      durante o treino (só hoje ou também na ficha)
// #/trocar/ficha/<F>/<bi>/<ei>   no editor da ficha
function contextoTroca(args) {
  if (args[0] === 'sessao') {
    const a = db.ativa;
    if (!a) return null;
    const t = fichaDe(a.treino), bi = +args[1], ei = +args[2];
    const blocos = blocosEfetivos(t, a);
    const atual = blocos[bi]?.exercicios[ei];
    if (!atual) return null;
    return { modo: 'sessao', f: a.treino, bi, ei, atual, slot: t.blocos[bi].exercicios[ei], emUso: blocos.flatMap((b) => b.exercicios.map((x) => x.id)), voltar: '#/treino' };
  }
  const f = args[1], bi = +args[2], ei = +args[3];
  const t = fichaDe(f);
  const atual = t?.blocos[bi]?.exercicios[ei];
  if (!atual) return null;
  return { modo: 'ficha', f, bi, ei, atual, slot: atual, emUso: exerciciosDe(t).map((x) => x.id), voltar: `#/ficha/${f}/editar` };
}

function telaTrocar(_, args) {
  const ctx = contextoTroca(args);
  if (!ctx) return `<div class="vazio">Exercício não encontrado.<a class="btn sec" href="#/hoje">Voltar</a></div>`;
  const padrao = (catalogoPorId(ctx.atual.id) || {}).padrao || `${ctx.atual.grupo} · outros`;
  const candidatos = CATALOGO.filter((c) => c.id !== ctx.atual.id && passaFiltro(c, true));
  const iguais = candidatos.filter((c) => c.padrao === padrao);
  const doGrupo = candidatos.filter((c) => c.padrao !== padrao && c.grupo === ctx.atual.grupo);
  const lista = (l) => l.map((c) => itemCatalogo(c, ctx.emUso.includes(c.id))).join('') || '<p class="muted small">Nenhum com esse filtro.</p>';
  const selOk = catSel && candidatos.some((c) => c.id === catSel);
  return `<a href="${ctx.voltar}" class="small">‹ Voltar</a><h1>Trocar exercício</h1>
    <div class="card destaque small">Trocando <b>${esc(ctx.atual.nome)}</b>. O novo exercício mantém a prescrição da ficha
      (${esc(faixaReps(ctx.slot))}, mesmas séries e descanso) e tem histórico de cargas próprio.</div>
    ${chipsFiltro('equip', EQUIPAMENTOS, 'Todo equipamento')}
    <h3>Equivalentes · ${esc(padrao)}</h3><div class="card">${lista(iguais)}</div>
    <h3>Outros de ${esc(ctx.atual.grupo)}</h3><div class="card">${lista(doGrupo)}</div>
    ${ctx.modo === 'ficha' ? `<a class="btn sec" href="#/editar-ex/${ctx.f}/${ctx.bi}/${ctx.ei}/substituir">Criar um exercício personalizado no lugar</a>` : ''}
    ${selOk ? `<div class="barra-fixa">
      ${ctx.modo === 'sessao'
        ? `<button class="btn sec" data-acao="cat-trocar" data-onde="ficha" data-ctx="${esc(args.join('/'))}">Trocar também na ficha</button>
           <button class="btn" data-acao="cat-trocar" data-onde="hoje" data-ctx="${esc(args.join('/'))}">Trocar só hoje</button>`
        : `<button class="btn" data-acao="cat-trocar" data-onde="ficha" data-ctx="${esc(args.join('/'))}">Trocar na ficha</button>`}
    </div>` : ''}`;
}

function aplicarTroca(args, onde) {
  const ctx = contextoTroca(args.split('/'));
  const novo = catalogoPorId(catSel);
  if (!ctx || !novo) return;
  const a = db.ativa;
  if (ctx.modo === 'sessao') {
    // Séries ainda não feitas do exercício que sai são descartadas; as feitas continuam no treino
    if (!(a.series[ctx.atual.id] || []).some((x) => x.ok)) delete a.series[ctx.atual.id];
    a.trocas ??= {};
    if (onde === 'hoje') {
      if (novo.id === ctx.slot.id) delete a.trocas[ctx.slot.id]; // voltou ao exercício da ficha
      else a.trocas[ctx.slot.id] = novo.id;
    }
  }
  if (onde === 'ficha') {
    editavel(ctx.f).blocos[ctx.bi].exercicios[ctx.ei] = paraFicha(novo, ctx.slot);
    if (a && a.trocas) delete a.trocas[ctx.slot.id];
  }
  catSel = null;
  salvar();
  toast(onde === 'hoje' ? `Trocado só neste treino: ${novo.nome}` : `Ficha ${ctx.f} atualizada: ${novo.nome}`);
  location.hash = ctx.voltar;
}

// ---------- Escolher do catálogo para adicionar a um bloco ----------
function telaEscolher(f, args) {
  const t = fichaDe(f), bi = +args[1];
  const b = t?.blocos[bi];
  if (!b) return `<div class="vazio">Bloco não encontrado.</div>`;
  const emUso = exerciciosDe(t).map((x) => x.id);
  const itens = CATALOGO.filter((c) => passaFiltro(c));
  let lista = '', grupo = '';
  for (const c of itens) {
    if (c.grupo !== grupo) { grupo = c.grupo; lista += `<h3>${esc(grupo)}</h3>`; }
    lista += itemCatalogo(c, emUso.includes(c.id));
  }
  return `<a href="#/ficha/${f}/editar" class="small">‹ ${esc(t.titulo)}</a><h1>Adicionar ao ${esc(b.nome)}</h1>
    <input class="input-texto" id="cat-busca" placeholder="Buscar exercício" value="${esc(filtroCat.busca)}">
    ${chipsFiltro('grupo', GRUPOS, 'Todos os grupos')}
    ${chipsFiltro('equip', EQUIPAMENTOS, 'Todo equipamento')}
    <div class="card">${lista || '<p class="muted small">Nenhum exercício encontrado.</p>'}</div>
    <a class="btn sec" href="#/editar-ex/${f}/${bi}/novo">Criar um exercício personalizado</a>
    ${catSel && !emUso.includes(catSel) ? `<div class="barra-fixa"><button class="btn" data-acao="cat-add" data-f="${f}" data-bi="${bi}">Adicionar ${esc(catalogoPorId(catSel)?.nome || '')}</button></div>` : ''}`;
}

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el || !el.dataset.acao.startsWith('cat-')) return;
  const acao = el.dataset.acao;
  if (acao === 'cat-filtro') {
    e.preventDefault();
    filtroCat[el.dataset.campo] = el.dataset.valor;
    render();
  } else if (acao === 'cat-sel') {
    catSel = catSel === el.dataset.id ? null : el.dataset.id;
    render();
  } else if (acao === 'cat-trocar') {
    aplicarTroca(el.dataset.ctx, el.dataset.onde);
  } else if (acao === 'cat-add') {
    const c = catalogoPorId(catSel);
    if (!c) return;
    editavel(el.dataset.f).blocos[+el.dataset.bi].exercicios.push(paraFicha(c));
    catSel = null; salvar(); toast(`${c.nome} adicionado`);
    location.hash = `#/ficha/${el.dataset.f}/editar`;
  }
});

// Busca: atualiza só a lista, para o teclado não fechar a cada letra
document.addEventListener('input', (e) => {
  if (e.target.id !== 'cat-busca') return;
  filtroCat.busca = e.target.value;
  const lista = $('#cat-lista');
  if (lista) lista.innerHTML = listaConsulta();
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'cat-busca' && !$('#cat-lista')) render(); // telas sem lista própria: atualiza ao terminar de digitar
});
// Entrar numa tela do catálogo sempre começa sem seleção
window.addEventListener('hashchange', () => { if (!/^#\/(catalogo|trocar|escolher)/.test(location.hash)) { catSel = null; } });
