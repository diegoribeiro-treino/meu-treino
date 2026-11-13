'use strict';

// Importar um treino pronto: PDF (lido no próprio aparelho com pdf.js) ou texto colado.
// O texto é dividido em fichas ("Treino A", "Ficha B"...) e blocos ("Bloco 1"); cada linha é comparada
// com os nomes do catálogo. Séries, repetições e descanso vêm dos números próximos ao exercício.
// O usuário revisa tudo antes de criar o programa.

const PDFJS = 'vendor/pdfjs-6.4.299/';
const importacao = { etapa: 'origem', texto: '', fichas: [], nome: '', modalidade: 'circuito', complementos: true, periodoTipo: 'livre', periodoValor: 0, erro: '' };

const PALAVRAS_VAZIAS = new Set(['com', 'na', 'no', 'nas', 'nos', 'de', 'do', 'da', 'dos', 'das', 'em', 'e', 'a', 'o', 'as', 'os', 'ao', 'para', 'por', 'um', 'uma', 'pegada']);
function tokens(s) {
  return normal(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)
    .filter((t) => t && !PALAVRAS_VAZIAS.has(t) && !/^\d+$/.test(t))
    .map((t) => (t.length > 4 ? t.replace(/(es|s)$/, '') : t)); // halteres/halter, séries/série
}
// O que está entre parênteses no nome é opcional ("Crucifixo na máquina (peck deck)");
// a primeira palavra (remada, supino, rosca...) é obrigatória para evitar falsos positivos em descrições.
const TOKENS_CATALOGO = CATALOGO.map((c) => {
  const t = tokens(c.nome.replace(/\(.*?\)/g, ' '));
  return { c, t: new Set(t), cabeca: t[0] };
});

// Quanto do nome do exercício aparece no texto (0 a 1); exige a palavra principal e 2 palavras em comum.
// Equipamento que falta no texto ("Puxada frontal" x "Puxada frontal na polia") pesa só metade.
const EQUIP_PALAVRAS = new Set(['polia', 'maquina', 'halter', 'barra', 'smith', 'cabo', 'banco']);
function pontuar(textoTokens, item) {
  if (!textoTokens.has(item.cabeca)) return 0;
  let comuns = 0, faltaEquip = 0;
  for (const t of item.t) {
    if (textoTokens.has(t)) comuns++;
    else if (EQUIP_PALAVRAS.has(t)) faltaEquip++;
  }
  if (comuns < Math.min(2, item.t.size)) return 0;
  return comuns / (item.t.size - faltaEquip / 2) - (textoTokens.size > item.t.size + 6 ? 0.1 : 0);
}
function melhoresParecidos(texto, n = 5) {
  const tk = new Set(tokens(texto));
  return TOKENS_CATALOGO.map((it) => ({ c: it.c, s: pontuar(tk, it), n: it.t.size, cabeca: it.cabeca })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.n - a.n).slice(0, n); // empate: o nome mais específico
}
const LIMIAR = 0.6;
// Linhas que são só rótulo de grupo ("PANTURRILHAS", "PEITO") não são exercício nem se emendam com a seguinte
const ROTULOS = new Set([...GRUPOS.flatMap((g) => tokens(g)), 'terra', 'quadricep']);

// ---------- Leitura do PDF ----------
async function textoDoPdf(arquivo) {
  const pdfjs = await import(`./${PDFJS}pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const linhas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const { items } = await pagina.getTextContent();
    // Linhas na ordem em que o texto foi escrito no PDF (célula por célula nas tabelas).
    // Quebra a linha quando muda a altura, volta para a esquerda ou salta para outra coluna.
    let atual = null;
    for (const it of items) {
      if (!it.str.trim()) { if (it.hasEOL && atual) { linhas.push(atual.s); atual = null; } continue; }
      const x = it.transform[4], y = it.transform[5];
      const continua = atual && Math.abs(atual.y - y) < 2 && x >= atual.fimX - 1 && x - atual.fimX < 12;
      if (continua) atual.s += (x - atual.fimX > 1 ? ' ' : '') + it.str;
      else { if (atual) linhas.push(atual.s); atual = { s: it.str, y }; }
      atual.fimX = x + (it.width || 0);
      if (it.hasEOL) { linhas.push(atual.s); atual = null; }
    }
    if (atual) linhas.push(atual.s);
  }
  return linhas.join('\n');
}

// ---------- Interpretação do texto ----------
const RE_FICHA = /\b(?:treino|ficha|dia)\s+([a-z](?:\d{1,2})?)\b/i;
const RE_BLOCO = /\bbloco\s*(\d+)/i;
const RE_SERIES_REPS = /(\d{1,2})\s*[x×]\s*(\d{1,2})(?:\s*(?:[-–a]|até)\s*(\d{1,2}))?/i;
const RE_SERIES = /(\d{1,2})\s*(?:séries|series|voltas)\b/i;
const RE_FAIXA = /(?:^|[^\d])(\d{1,2})\s*[-–]\s*(\d{1,2})(?!\s*(?:s\b|seg|min|kg|°|\d))/i;
const RE_DESCANSO = /(\d{2,3})\s*(?:[-–]\s*(\d{2,3}))?\s*(?:s|seg|segundos)\b/i;
// Seções que não são musculação: o leitor pula até a próxima parte, bloco ou ficha
const RE_SECAO_FORA = /^(core|mobilidade|cardio|prepara[cç][aã]o|aquecimento|alongamento|carga e progress|registro|refer[eê]ncias|observa)/i;
const RE_RETOMA = /^(parte\s+\d|exerc[ií]cio\s+por\s+s[eé]rie)/i;

function interpretar(texto) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  const fichas = [];
  let ficha = null, bloco = null;
  const novaFicha = (id, titulo) => { ficha = { id, titulo, blocos: [] }; fichas.push(ficha); bloco = null; };
  const novoBloco = (nome) => { if (!ficha) novaFicha('A', 'Treino A'); bloco = { nome, descanso: null, exercicios: [] }; ficha.blocos.push(bloco); };
  let ultimo = null; // último exercício reconhecido: recebe os números das linhas seguintes
  let fora = false;  // dentro de uma seção que não é musculação (core, mobilidade, cardio...)

  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const mFicha = l.match(RE_FICHA);
    if (mFicha && l.length < 80) {
      const id = mFicha[1].toUpperCase();
      if (!fichas.some((f) => f.id === id)) novaFicha(id, l.replace(/\s*[·|-].*$/, '').trim() || `Treino ${id}`);
      else ficha = fichas.find((f) => f.id === id); // cabeçalho repetido em outra página
      ultimo = null; fora = false;
      continue;
    }
    const mBloco = l.match(RE_BLOCO);
    if (mBloco) { novoBloco(`Bloco ${mBloco[1]}`); bloco.detectado = true; ultimo = null; fora = false; }
    if (RE_RETOMA.test(l)) { fora = false; ultimo = null; continue; }
    if (RE_SECAO_FORA.test(l)) { fora = true; ultimo = null; }
    if (fora) continue;
    const tl = tokens(l);
    if (tl.length && tl.every((t) => ROTULOS.has(t)) && !/\d/.test(l)) continue;

    // Exercício: a linha sozinha ou emendada com a seguinte (nomes quebrados em duas linhas)
    // (não emenda se a linha já traz séries × repetições, nem se o nome não começa nesta linha)
    const sozinha = melhoresParecidos(l, 1)[0];
    const podeEmendar = i + 1 < linhas.length && !RE_SERIES_REPS.test(l);
    const emendada = podeEmendar ? melhoresParecidos(`${l} ${linhas[i + 1]}`, 1)[0] : null;
    let achado = sozinha && sozinha.s >= LIMIAR ? sozinha : null;
    let usouProxima = false;
    if (emendada && emendada.s >= LIMIAR && new Set(tokens(l)).has(emendada.cabeca) && (!achado || emendada.s > achado.s + 0.15)) { achado = emendada; usouProxima = true; }
    if (achado) {
      if (!bloco) novoBloco(`Bloco ${(ficha?.blocos.length || 0) + 1}`);
      ultimo = { catId: achado.c.id, original: usouProxima ? `${l} ${linhas[i + 1]}` : l, series: null, reps: null };
      bloco.exercicios.push(ultimo);
      lerNumeros(usouProxima ? `${l} ${linhas[i + 1]}` : l, ultimo, bloco);
      if (usouProxima) i++;
      continue;
    }
    // Linha com "3x12" mas nome fora do catálogo: exercício personalizado
    const sr = l.match(RE_SERIES_REPS);
    if (sr && /[a-z]{3}/i.test(l.slice(0, sr.index))) {
      if (!bloco) novoBloco(`Bloco ${(ficha?.blocos.length || 0) + 1}`);
      ultimo = { catId: null, nomeLivre: l.slice(0, sr.index).replace(/^[\d.)\-•·\s]+/, '').trim(), original: l, series: null, reps: null };
      bloco.exercicios.push(ultimo);
      lerNumeros(l, ultimo, bloco);
      continue;
    }
    if (ultimo) lerNumeros(l, ultimo, bloco);
    else if (bloco) { lerDescanso(l, bloco); const s = l.match(RE_SERIES); if (s) bloco.voltas = +s[1]; }
  }
  for (const f of fichas) f.blocos = f.blocos.filter((b) => b.exercicios.length);
  return fichas.filter((f) => f.blocos.length);
}
// Descanso: só em linhas que falam de descanso/intervalo ou com faixa (ex.: "90-120 s")
function lerDescanso(l, bloco) {
  if (RE_SERIES_REPS.test(l)) return; // "3x30s" é tempo de exercício, não descanso
  const d = l.match(RE_DESCANSO);
  if (!d || bloco.descanso || +d[1] < 20) return;
  if (d[2] || /descans|interval|entre\s+s[eé]ries|ap[oó]s/i.test(l)) bloco.descanso = [+d[1], +(d[2] || d[1])];
}
function lerNumeros(l, ex, bloco) {
  const sr = l.match(RE_SERIES_REPS);
  if (sr && !ex.reps) { ex.series = +sr[1]; ex.reps = [+sr[2], +(sr[3] || sr[2])]; }
  const s = l.match(RE_SERIES);
  if (s && /voltas|por exerc/i.test(l)) bloco.voltas = +s[1]; // "2 voltas" vale para o bloco todo
  else if (s && !ex.series) ex.series = +s[1];
  const f = l.match(RE_FAIXA);
  if (f && !ex.reps && +f[1] <= +f[2] && +f[2] <= 30) ex.reps = [+f[1], +f[2]];
  lerDescanso(l, bloco);
}

// ---------- Telas ----------
function telaImportar() {
  const imp = importacao;
  if (imp.etapa === 'origem') {
    return `<a href="#/criar" class="small">‹ Novo programa</a><h1>Importar treino pronto</h1>
      <p class="muted small">O app lê a ficha, reconhece os exercícios do catálogo e você confere tudo antes de criar o programa.</p>
      <label class="escolha-grande"><b>Escolher arquivo PDF</b><span>Ficha em PDF com texto (de um personal, de outro app ou feita no computador).</span>
        <input type="file" accept="application/pdf,.pdf" data-acao="imp-pdf" hidden></label>
      <div class="card"><b class="small">Ou cole o texto da ficha</b>
        <textarea id="imp-texto" rows="8" placeholder="Ex.:&#10;Treino A&#10;Supino reto com halteres 3x10&#10;Puxada frontal 3x12&#10;Treino B&#10;Leg press 45 4x10">${esc(imp.texto)}</textarea>
        <button class="btn" data-acao="imp-texto">Reconhecer exercícios</button></div>
      ${imp.erro ? `<div class="card small" style="border-color:var(--danger)">${esc(imp.erro)}</div>` : ''}
      <p class="muted small">Fotos de fichas em papel ainda não são lidas; para isso, digite ou cole o texto.</p>`;
  }
  // Revisão
  let total = 0, h = `<button class="link-btn" style="width:auto;padding:0" data-acao="imp-recomecar">‹ Escolher outro arquivo</button>
    <h1>Revisar importação</h1>
    <p class="muted small">Confira cada exercício: troque pelo nome certo do catálogo, ajuste séries e repetições ou remova o que não for exercício.</p>`;
  imp.fichas.forEach((f, fi) => {
    h += `<div class="card"><label class="form">Ficha ${esc(f.id)}<input class="input-texto" data-imp-ficha="${fi}" value="${esc(f.titulo)}"></label>`;
    f.blocos.forEach((b, bi) => {
      h += `<h3>${esc(b.nome)}${b.descanso ? ` · descanso ${b.descanso[0]}-${b.descanso[1]} s` : ''}</h3>`;
      b.exercicios.forEach((ex, ei) => {
        total++;
        const opcoes = melhoresParecidos(ex.original, 6);
        if (ex.catId && !opcoes.some((o) => o.c.id === ex.catId)) opcoes.unshift({ c: catalogoPorId(ex.catId) });
        // Também os que têm alguma palavra em comum (ex.: "Agachamento livre" -> todos os agachamentos)
        const tk = new Set(tokens(ex.original));
        for (const it of TOKENS_CATALOGO) if (opcoes.length < 12 && !opcoes.some((o) => o.c.id === it.c.id) && [...it.t].some((t) => tk.has(t))) opcoes.push({ c: it.c });
        const c = ex.catId ? catalogoPorId(ex.catId) : null;
        const reps = ex.reps || c?.reps || [10, 12];
        h += `<div class="imp-ex">
          <p class="small muted">Lido: “${esc(ex.original.slice(0, 80))}”</p>
          <select data-imp-ex="${fi}.${bi}.${ei}">
            ${opcoes.map((o) => `<option value="${o.c.id}" ${o.c.id === ex.catId ? 'selected' : ''}>${esc(o.c.nome)} · ${esc(o.c.equip)}</option>`).join('')}
            <option value="" ${!ex.catId ? 'selected' : ''}>Personalizado: ${esc(ex.nomeLivre || ex.original.slice(0, 40))}</option>
            ${CATALOGO.filter((x) => !opcoes.some((o) => o.c.id === x.id)).map((x) => `<option value="${x.id}">${esc(x.nome)} · ${esc(x.equip)}</option>`).join('')}
          </select>
          <div class="linha" style="gap:8px;margin-top:6px">
            <label class="campo"><input inputmode="numeric" data-imp-num="${fi}.${bi}.${ei}.series" value="${ex.series || b.voltas || ''}" placeholder="3"><em>séries</em></label>
            <label class="campo"><input inputmode="numeric" data-imp-num="${fi}.${bi}.${ei}.r0" value="${reps[0]}"><em>mín</em></label>
            <label class="campo"><input inputmode="numeric" data-imp-num="${fi}.${bi}.${ei}.r1" value="${reps[1]}"><em>máx</em></label>
            <button class="btn-mini" data-acao="imp-remover" data-pos="${fi}.${bi}.${ei}" aria-label="Remover">🗑</button>
          </div></div>`;
      });
    });
    h += `</div>`;
  });
  h += `<div class="card form">
    <label>Nome do programa<input class="input-texto" id="imp-nome" value="${esc(imp.nome)}"></label>
    <label>Execução<select id="imp-modalidade">${MODALIDADES.map(([v, t]) => `<option value="${v}" ${imp.modalidade === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Duração<select id="imp-ptipo">${TIPOS_PERIODO.map(([v, t]) => `<option value="${v}" ${imp.periodoTipo === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Quantidade<input class="input-texto" id="imp-pvalor" inputmode="numeric" value="${imp.periodoValor || ''}" placeholder="ex.: 8"></label>
    <label class="check-linha"><input type="checkbox" id="imp-comp" ${imp.complementos ? 'checked' : ''}> Incluir preparação, core e mobilidade com vídeos</label>
  </div>
  <div class="barra-fixa"><button class="btn" data-acao="imp-criar">Criar programa (${imp.fichas.length} fichas, ${total} exercícios)</button></div>`;
  return h;
}

function iniciarRevisao(texto) {
  const fichas = interpretar(texto);
  if (!fichas.length) {
    importacao.erro = 'Não encontrei exercícios do catálogo nesse texto. Confira se o PDF tem texto (não é uma foto) ou cole o texto da ficha.';
    return render();
  }
  Object.assign(importacao, { etapa: 'revisao', fichas, erro: '', nome: importacao.nome || 'Treino importado' });
  if (/voltas?|circuito/i.test(texto)) importacao.modalidade = 'circuito';
  else if (/séries tradicionais|series tradicionais/i.test(texto)) importacao.modalidade = 'tradicional';
  window.scrollTo(0, 0); render();
}

function criarProgramaImportado() {
  const imp = importacao;
  imp.nome = $('#imp-nome').value.trim() || 'Treino importado';
  imp.modalidade = $('#imp-modalidade').value;
  imp.periodoTipo = $('#imp-ptipo').value;
  imp.periodoValor = parseInt($('#imp-pvalor').value, 10) || 0;
  imp.complementos = $('#imp-comp').checked;
  if (imp.periodoTipo !== 'livre' && !(imp.periodoValor >= 1)) return toast('Informe a duração do programa');
  const pools = complementosDisponiveis();
  const fichas = {}, ordem = [];
  imp.fichas.forEach((f, k) => {
    let id = f.id; while (fichas[id]) id += '2';
    const blocos = [];
    for (const b of f.blocos) {
      const exs = b.exercicios.map((ex) => {
        const c = ex.catId && catalogoPorId(ex.catId);
        const reps = ex.reps || c?.reps || [10, 12];
        return c ? { ...paraFicha(c), reps } : { id: `${id.toLowerCase()}-${uid()}`, nome: ex.nomeLivre || ex.original.slice(0, 60), grupo: '', carga: 'total', reps, dica: '' };
      });
      if (!exs.length) continue;
      const voltas = Math.max(...b.exercicios.map((ex) => ex.series || b.voltas || 3));
      const grupos = [...new Set(exs.map((e) => e.grupo).filter(Boolean))];
      // Sem blocos no texto: agrupa de 2 em 2, como o gerador
      const partes = !b.detectado ? Array.from({ length: Math.ceil(exs.length / 2) }, (_, i) => exs.slice(i * 2, i * 2 + 2)) : [exs];
      for (const parte of partes) {
        blocos.push({ nome: `Bloco ${blocos.length + 1}`, foco: [...new Set(parte.map((e) => e.grupo).filter(Boolean))].join(' / ') || grupos.join(' / '),
          voltas, descanso: b.descanso || [60, 90], ...(imp.modalidade === 'tradicional' ? { modo: 'series' } : {}), exercicios: parte });
      }
    }
    const todos = blocos.flatMap((b) => b.exercicios);
    const inf = todos.filter((e) => ['Quadríceps', 'Posteriores', 'Glúteos', 'Panturrilhas'].includes(e.grupo)).length > todos.length / 2;
    fichas[id] = {
      titulo: f.titulo, tipo: inf ? 'Membros inferiores' : 'Membros superiores', tipoCurto: inf ? 'Inferiores' : 'Superiores', resumo: resumoDe(todos),
      instrucoes: instrucoesDe({ modalidade: imp.modalidade }, blocos[0]?.voltas || 3), cardioInicial: null, cardioFinal: null,
      preparacao: imp.complementos ? pegarRodando(inf ? pools.prepInf : pools.prepSup, 2, k) : [], avisos: [],
      core: imp.complementos ? pegarRodando(pools.core, 2, k) : [], mobilidade: imp.complementos ? pegarRodando(inf ? pools.mobInf : pools.mobSup, 2, k) : [],
      progressao: PROGRESSAO, blocos,
    };
    ordem.push(id);
  });
  const p = { id: `prog-${uid()}`, nome: imp.nome, origem: 'importado', criadoEm: isoDia(), inicio: isoDia(), baseSessoes: 0,
    periodicidade: { tipo: imp.periodoTipo, valor: imp.periodoTipo === 'livre' ? 0 : imp.periodoValor }, ordem, fichas };
  Object.assign(importacao, { etapa: 'origem', texto: '', fichas: [], nome: '', erro: '' });
  criarEAbrir(p);
}

// ---------- Eventos ----------
document.addEventListener('change', async (e) => {
  if (e.target.dataset.acao === 'imp-pdf') {
    const arq = e.target.files && e.target.files[0];
    if (!arq) return;
    toast('Lendo o PDF...');
    try {
      importacao.texto = await textoDoPdf(arq);
      importacao.nome = arq.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      iniciarRevisao(importacao.texto);
    } catch (err) {
      importacao.erro = 'Não foi possível ler esse PDF. Tente outro arquivo ou cole o texto da ficha.';
      render();
    }
    e.target.value = '';
  }
  const pos = e.target.dataset.impEx;
  if (pos) {
    const [fi, bi, ei] = pos.split('.').map(Number);
    importacao.fichas[fi].blocos[bi].exercicios[ei].catId = e.target.value || null;
  }
});
document.addEventListener('input', (e) => {
  const num = e.target.dataset.impNum, fi = e.target.dataset.impFicha;
  if (fi !== undefined) importacao.fichas[+fi].titulo = e.target.value;
  if (!num) return;
  const [a, b, c, campo] = num.split('.');
  const ex = importacao.fichas[+a].blocos[+b].exercicios[+c];
  const v = parseInt(e.target.value, 10) || 0;
  if (campo === 'series') ex.series = v || null;
  else { ex.reps ??= [...(catalogoPorId(ex.catId)?.reps || [10, 12])]; ex.reps[campo === 'r0' ? 0 : 1] = v; }
});
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el || !el.dataset.acao.startsWith('imp-') || el.dataset.acao === 'imp-pdf') return;
  const acao = el.dataset.acao;
  if (acao === 'imp-texto') {
    importacao.texto = $('#imp-texto').value;
    if (!importacao.texto.trim()) return toast('Cole o texto da ficha');
    iniciarRevisao(importacao.texto);
  } else if (acao === 'imp-recomecar') { Object.assign(importacao, { etapa: 'origem', fichas: [], erro: '' }); render(); }
  else if (acao === 'imp-remover') {
    const [fi, bi, ei] = el.dataset.pos.split('.').map(Number);
    importacao.fichas[fi].blocos[bi].exercicios.splice(ei, 1);
    render();
  } else if (acao === 'imp-criar') criarProgramaImportado();
});
