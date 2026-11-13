'use strict';

// Programas de treino: cada usuário tem os próprios programas (conjunto de fichas + periodicidade).
// - origem 'padrao': o Treino AB de treinos.js; programa.fichas guarda só as fichas editadas pelo
//   usuário (as demais vêm de treinos.js e recebem as atualizações do app).
// - origem 'gerado' | 'manual' | 'importado': todas as fichas ficam dentro do programa.
// Cada treino salvo guarda o id do programa (sessao.programa).

const ID_PADRAO = 'prog-ab';
const TIPOS_PERIODO = [['livre', 'Sem prazo definido'], ['sessoes', 'Número de sessões'], ['dias', 'Dias'], ['semanas', 'Semanas'], ['meses', 'Meses']];

function programaPadrao(id = ID_PADRAO, fichasEditadas = {}, inicio = isoDia()) {
  return {
    id, nome: 'Treino AB', origem: 'padrao', criadoEm: isoDia(), inicio, baseSessoes: 0,
    periodicidade: { tipo: 'livre', valor: 0 }, ordem: [...FICHAS], fichas: fichasEditadas,
  };
}

// Converte bancos da versão anterior (db.fichas e treinos sem programa) para programas.
// Serve para o db atual e para dados antigos que chegam na sincronização. Devolve true se mudou algo.
function migrarProgramas(d) {
  let mudou = false;
  if (!Array.isArray(d.programas)) { d.programas = []; mudou = true; }
  const antigos = (d.sessoes || []).length || Object.keys(d.fichas || {}).length;
  if (!d.programas.length && antigos) {
    const datas = (d.sessoes || []).map((s) => s.data).sort();
    d.programas.push(programaPadrao(ID_PADRAO, d.fichas || {}, datas[0] || isoDia()));
    d.programaAtivo = ID_PADRAO;
    mudou = true;
  }
  if ('fichas' in d) { delete d.fichas; mudou = true; }
  for (const s of d.sessoes || []) if (!s.programa) { s.programa = ID_PADRAO; mudou = true; }
  if (d.programaAtivo && !d.programas.some((p) => p.id === d.programaAtivo)) { d.programaAtivo = d.programas[0]?.id || null; mudou = true; }
  return mudou;
}

const programaPorId = (id) => (db.programas || []).find((p) => p.id === id) || null;
const programaAtivo = () => programaPorId(db.programaAtivo);
const fichasIds = (p = programaAtivo()) => (p ? p.ordem : []);

// Ficha em uso: no programa padrão, a versão editada pelo usuário ou a de treinos.js
function fichaDe(id, p = programaAtivo()) {
  if (!p) return null;
  return p.fichas[id] || (p.origem === 'padrao' ? TREINOS[id] || null : null);
}
const fichaDaSessao = (s) => fichaDe(s.treino, programaPorId(s.programa));
function tipoFicha(id, p = programaAtivo()) {
  if (p?.origem === 'padrao' && TIPO_FICHA[id]) return TIPO_FICHA[id];
  const t = fichaDe(id, p);
  return t?.tipoCurto || t?.tipo || '';
}
function editavel(f) {
  const p = programaAtivo();
  return (p.fichas[f] ??= structuredClone(TREINOS[f]));
}
const foiEditada = (f) => programaAtivo()?.origem === 'padrao' && !!programaAtivo().fichas[f];

// ---------- Periodicidade ----------
function somarData(iso, tipo, valor) {
  const d = dataDeIso(iso);
  if (tipo === 'dias') d.setDate(d.getDate() + valor);
  else if (tipo === 'semanas') d.setDate(d.getDate() + valor * 7);
  else if (tipo === 'meses') d.setMonth(d.getMonth() + valor);
  return isoDia(d);
}
function descreverPeriodo(per) {
  if (!per || per.tipo === 'livre' || !per.valor) return 'Sem prazo definido';
  const un = { sessoes: ['sessão', 'sessões'], dias: ['dia', 'dias'], semanas: ['semana', 'semanas'], meses: ['mês', 'meses'] }[per.tipo];
  return `${per.valor} ${per.valor === 1 ? un[0] : un[1]}`;
}
// { texto, concluido, fracao (0-1 ou null) }
function progressoPrograma(p) {
  const feitas = db.sessoes.filter((s) => s.programa === p.id).length - (p.baseSessoes || 0);
  const per = p.periodicidade || { tipo: 'livre' };
  const treinos = `${feitas} treino${feitas === 1 ? '' : 's'}`;
  if (per.tipo === 'livre' || !per.valor) return { texto: `${treinos} desde ${fmtData(p.inicio)}`, concluido: false, fracao: null };
  if (per.tipo === 'sessoes') {
    return { texto: `${Math.min(feitas, per.valor)} de ${per.valor} sessões`, concluido: feitas >= per.valor, fracao: Math.min(1, feitas / per.valor) };
  }
  const fim = somarData(p.inicio, per.tipo, per.valor);
  const total = Math.max(1, Math.round((dataDeIso(fim) - dataDeIso(p.inicio)) / 864e5));
  const passados = Math.round((dataDeIso(isoDia()) - dataDeIso(p.inicio)) / 864e5);
  const concluido = isoDia() >= fim;
  let texto;
  if (per.tipo === 'semanas') texto = `Semana ${Math.min(per.valor, Math.floor(passados / 7) + 1)} de ${per.valor}`;
  else if (per.tipo === 'meses') texto = `Mês ${Math.min(per.valor, Math.floor(passados / 30.44) + 1)} de ${per.valor}`;
  else texto = `Dia ${Math.min(per.valor, passados + 1)} de ${per.valor}`;
  return { texto: `${texto} · ${treinos} · até ${fmtData(fim)}`, concluido, fracao: Math.min(1, passados / total) };
}

// ---------- Criar, ativar, renovar ----------
function adicionarPrograma(p) {
  db.programas.push(p);
  db.programaAtivo = p.id;
  fichaEscolhida = null;
  salvar();
}
function podeTrocarPrograma() {
  if (db.ativa) { toast('Finalize ou descarte o treino em andamento antes de trocar de programa'); return false; }
  return true;
}
function proximoIdFicha(p) {
  const usados = new Set(p.ordem);
  for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') if (!usados.has(l)) return l;
  return `F${p.ordem.length + 1}`;
}

// ---------- Tela do programa ----------
function telaPrograma(id) {
  const p = programaPorId(id);
  if (!p) return `<div class="vazio">Programa não encontrado.<a class="btn sec" href="#/treinos">Voltar</a></div>`;
  const ativo = db.programaAtivo === p.id;
  const prog = progressoPrograma(p);
  const per = p.periodicidade || { tipo: 'livre', valor: 0 };
  let h = `<a href="#/treinos" class="small">‹ Treinos</a><h1>${esc(p.nome)}</h1>
    <p class="muted small">${ativo ? '<span class="tag ok">Programa ativo</span> ' : ''}${esc(prog.texto)}</p>
    ${prog.fracao !== null ? `<div class="progresso-barra"><i style="width:${prog.fracao * 100}%"></i></div>` : ''}`;
  if (!ativo) h += `<button class="btn" data-acao="prog-ativar" data-id="${p.id}">Usar este programa</button>`;

  h += `<h3>Fichas</h3><div class="card">`;
  p.ordem.forEach((f, i) => {
    const t = fichaDe(f, p);
    h += `<div class="ed-ex"><span class="num-ex">${esc(f)}</span>
      <div class="cresce"><b class="small">${esc(t?.titulo || f)}</b><div class="muted small">${esc(t?.tipo || '')} · ${t ? exerciciosDe(t).length : 0} exercícios</div></div>
      <div class="ed-acoes">
        <button data-acao="prog-ficha-mover" data-id="${p.id}" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button data-acao="prog-ficha-mover" data-id="${p.id}" data-i="${i}" data-dir="1" ${i === p.ordem.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
        ${ativo ? `<button data-acao="ir" data-href="#/ficha/${encodeURIComponent(f)}/editar" aria-label="Editar">✎</button>` : ''}
        <button class="perigo" data-acao="prog-ficha-remover" data-id="${p.id}" data-f="${esc(f)}" aria-label="Remover">🗑</button>
      </div></div>`;
  });
  h += `${ativo ? `<button class="btn-add" data-acao="prog-ficha-nova" data-id="${p.id}">+ Nova ficha</button>` : '<p class="muted small">Ative o programa para editar as fichas.</p>'}</div>`;

  h += `<h3>Configuração</h3><div class="card form">
    <label>Nome do programa<input class="input-texto" id="p-nome" value="${esc(p.nome)}"></label>
    <label>Duração<select id="p-tipo">${TIPOS_PERIODO.map(([v, t]) => `<option value="${v}" ${per.tipo === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Quantidade (sessões, dias, semanas ou meses)<input class="input-texto" id="p-valor" inputmode="numeric" value="${per.valor || ''}" placeholder="ex.: 8"></label>
    <label>Início<input type="date" class="input-texto" id="p-inicio" value="${esc(p.inicio)}"></label>
    <button class="btn" data-acao="prog-salvar" data-id="${p.id}">Salvar configuração</button>
  </div>
  <button class="btn sec" data-acao="prog-renovar" data-id="${p.id}">Renovar: recomeçar a contagem hoje</button>
  <button class="btn perigo" data-acao="prog-excluir" data-id="${p.id}">Excluir programa</button>
  <p class="muted small" style="margin-top:8px">Excluir não apaga os treinos já feitos: eles continuam no histórico e nos relatórios.</p>`;
  return h;
}

// Ficha nova e vazia, com as mesmas características das outras do programa
function fichaVaziaDoPrograma(p, id) {
  const base = fichaDe(p.ordem[0], p);
  const bloco = base?.blocos?.[0];
  return {
    titulo: `Treino ${id}`, tipo: '', tipoCurto: '', resumo: '',
    instrucoes: base?.instrucoes || '', cardioInicial: base?.cardioInicial || null, cardioFinal: base?.cardioFinal || null,
    preparacao: [], avisos: [], core: [], mobilidade: [], progressao: base?.progressao || PROGRESSAO,
    blocos: [{ nome: 'Bloco 1', foco: '', voltas: bloco?.voltas || 3, descanso: bloco?.descanso || [60, 90], ...(bloco?.modo ? { modo: bloco.modo } : {}), exercicios: [] }],
  };
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el || !el.dataset.acao.startsWith('prog-')) return;
  const acao = el.dataset.acao;
  const p = programaPorId(el.dataset.id);
  if (!p) return;
  if (acao === 'prog-ativar') {
    if (!podeTrocarPrograma()) return;
    db.programaAtivo = p.id; fichaEscolhida = null; salvar();
    toast(`Programa ativo: ${p.nome}`); render();
  } else if (acao === 'prog-salvar') {
    const tipo = $('#p-tipo').value, valor = parseInt($('#p-valor').value, 10) || 0;
    if (tipo !== 'livre' && !(valor >= 1 && valor <= 400)) return toast('Informe a quantidade (ex.: 24 sessões ou 8 semanas)');
    p.nome = $('#p-nome').value.trim() || p.nome;
    p.periodicidade = { tipo, valor: tipo === 'livre' ? 0 : valor };
    if ($('#p-inicio').value) p.inicio = $('#p-inicio').value;
    salvar(); toast('Programa salvo'); render();
  } else if (acao === 'prog-renovar') {
    if (!confirm(`Recomeçar a contagem de "${p.nome}" a partir de hoje? O histórico não é apagado.`)) return;
    p.inicio = isoDia();
    p.baseSessoes = db.sessoes.filter((s) => s.programa === p.id).length;
    salvar(); toast('Contagem reiniciada'); render();
  } else if (acao === 'prog-excluir') {
    if (db.programaAtivo === p.id && !podeTrocarPrograma()) return;
    if (!confirm(`Excluir o programa "${p.nome}"? Os treinos já feitos continuam no histórico.`)) return;
    db.programas = db.programas.filter((x) => x.id !== p.id);
    if (db.programaAtivo === p.id) db.programaAtivo = db.programas[0]?.id || null;
    salvar(); toast('Programa excluído'); location.hash = '#/treinos';
  } else if (acao === 'prog-ficha-mover') {
    const i = +el.dataset.i, j = i + +el.dataset.dir;
    [p.ordem[i], p.ordem[j]] = [p.ordem[j], p.ordem[i]];
    salvar(); render();
  } else if (acao === 'prog-ficha-remover') {
    if (p.ordem.length === 1) return toast('O programa precisa de pelo menos uma ficha');
    const f = el.dataset.f;
    if (db.ativa && db.ativa.treino === f && db.programaAtivo === p.id) return toast('Essa ficha está em andamento');
    if (!confirm(`Remover a ficha ${f} deste programa? Os treinos já feitos continuam no histórico.`)) return;
    p.ordem = p.ordem.filter((x) => x !== f);
    if (p.origem !== 'padrao') delete p.fichas[f];
    salvar(); render();
  } else if (acao === 'prog-ficha-nova') {
    const id = proximoIdFicha(p);
    p.fichas[id] = fichaVaziaDoPrograma(p, id);
    p.ordem.push(id);
    salvar(); location.hash = `#/ficha/${id}/editar`;
  }
});
