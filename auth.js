'use strict';

// Login e perfis. Tudo fica neste aparelho: as contas em localStorage (meutreino:contas),
// cada uma com o próprio banco (ver chaveDados em app.js). As senhas nunca são guardadas:
// só um hash PBKDF2-SHA256 com sal aleatório por conta.
// Nenhuma conta pessoal fica no código. O primeiro acesso é criado no próprio celular;
// só o perfil de demonstração (admin/admin) é fixo.

const CONTAS_KEY = 'meutreino:contas';
const SESSAO_KEY = 'meutreino:sessao';
const ITERACOES = 150000;
const DEMO = { id: 'demo', login: 'admin', senha: 'admin', nome: 'Demonstração' };

let modoLogin = 'entrar'; // 'entrar' | 'criar'
let falhas = 0, bloqueadoAte = 0;

// ---------- Contas ----------
function lerContas() {
  try { return JSON.parse(localStorage.getItem(CONTAS_KEY)) || []; } catch (e) { return []; }
}
function gravarContas(contas) { localStorage.setItem(CONTAS_KEY, JSON.stringify(contas)); }
const temDono = () => lerContas().some((c) => c.dono);

// CPF pode ser digitado com ou sem pontos e traço; usuário ignora maiúsculas
function normLogin(s) {
  const t = (s || '').trim().toLowerCase();
  return /^[\d.\-\s]+$/.test(t) ? t.replace(/\D/g, '') : t;
}
function mascararLogin(login) {
  return /^\d{11}$/.test(login) ? `${login.slice(0, 3)}.***.***-${login.slice(9)}` : login;
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hashSenha(senha, salt, iteracoes = ITERACOES) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deB64(salt), iterations: iteracoes }, chave, 256);
  return b64(bits);
}
async function novaCredencial(senha) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, iteracoes: ITERACOES, hash: await hashSenha(senha, salt) };
}
async function conferirSenha(conta, senha) {
  return (await hashSenha(senha, conta.salt, conta.iteracoes)) === conta.hash;
}

async function garantirDemo() {
  const contas = lerContas();
  if (contas.some((c) => c.id === DEMO.id)) return;
  contas.push({ id: DEMO.id, login: DEMO.login, nome: DEMO.nome, demo: true, ...(await novaCredencial(DEMO.senha)) });
  gravarContas(contas);
}

function contaDaSessao() {
  const id = localStorage.getItem(SESSAO_KEY);
  return id ? lerContas().find((c) => c.id === id) || null : null;
}
function entrar(conta) {
  localStorage.setItem(SESSAO_KEY, conta.id);
  abrirConta(conta);
  falhas = 0;
  location.hash = '#/hoje';
  render();
}
function sair() {
  localStorage.removeItem(SESSAO_KEY);
  contaAtual = null;
  db = novoDb();
  modoLogin = 'entrar';
  render();
}

// ---------- Tela de login ----------
function telaLogin() {
  const criando = modoLogin === 'criar';
  const topo = `<div class="login-topo"><img src="icons/icon-192.png" alt="" class="login-logo"><h1>Meu Treino</h1>
    <p class="muted small">${criando ? 'Crie o seu acesso neste celular' : 'Entre para acessar seus treinos'}</p></div>`;
  if (criando) {
    return `<div class="login">${topo}
      <form class="card form" data-form="criar" autocomplete="on">
        <label>Seu nome<input class="input-texto" name="nome" autocomplete="name" required></label>
        <label>CPF ou usuário<input class="input-texto" name="login" autocomplete="username" autocapitalize="none" required></label>
        <label>Senha (mínimo 6 caracteres)<input class="input-texto" type="password" name="senha" autocomplete="new-password" required></label>
        <label>Confirme a senha<input class="input-texto" type="password" name="senha2" autocomplete="new-password" required></label>
        ${localStorage.getItem(CHAVE_ANTIGA) ? '<p class="muted small">Os treinos já registrados neste celular passarão para este perfil.</p>' : ''}
        <button class="btn" type="submit">Criar acesso e entrar</button>
      </form>
      <button class="btn sec" data-acao="login-modo" data-modo="entrar">Já tenho acesso</button></div>`;
  }
  return `<div class="login">${topo}
    <form class="card form" data-form="entrar" autocomplete="on">
      <label>CPF ou usuário<input class="input-texto" name="login" autocomplete="username" autocapitalize="none" required></label>
      <label>Senha<div class="linha"><input class="input-texto cresce" type="password" name="senha" autocomplete="current-password" required>
        <button type="button" class="btn-mini" data-acao="ver-senha" aria-label="Mostrar senha">👁</button></div></label>
      <p class="login-erro small" id="login-erro" hidden></p>
      <button class="btn" type="submit">Entrar</button>
    </form>
    ${temDono() ? '' : `<div class="card small">Primeiro acesso neste celular?
      <button class="btn sec" data-acao="login-modo" data-modo="criar">Criar meu acesso</button></div>`}</div>`;
}

function erroLogin(msg) {
  const el = $('#login-erro');
  if (el) { el.textContent = msg; el.hidden = false; } else toast(msg);
}

async function enviarLogin(form) {
  if (Date.now() < bloqueadoAte) return erroLogin(`Muitas tentativas. Aguarde ${Math.ceil((bloqueadoAte - Date.now()) / 1000)} s.`);
  const login = normLogin(form.login.value), senha = form.senha.value;
  const botao = form.querySelector('button[type=submit]');
  botao.disabled = true; botao.textContent = 'Entrando...';
  try {
    await garantirDemo();
    const conta = lerContas().find((c) => c.login === login);
    if (conta && (await conferirSenha(conta, senha))) return entrar(conta);
    falhas++;
    if (falhas >= 5) { bloqueadoAte = Date.now() + 30000; falhas = 0; }
    erroLogin('Login ou senha incorretos.');
  } finally {
    botao.disabled = false; botao.textContent = 'Entrar';
  }
}

async function enviarCriacao(form, { dono }) {
  const nome = form.nome.value.trim(), login = normLogin(form.login.value), senha = form.senha.value;
  if (!nome || !login) return toast('Preencha nome e login');
  if (login === DEMO.login) return toast('Este login é reservado para a demonstração');
  if (senha.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres');
  if (senha !== form.senha2.value) return toast('As senhas não conferem');
  const contas = lerContas();
  if (contas.some((c) => c.login === login)) return toast('Já existe um perfil com esse login');
  const conta = { id: uid(), login, nome, dono, ...(await novaCredencial(senha)) };
  contas.push(conta);
  gravarContas(contas);
  // O primeiro perfil (dono) herda os dados de antes do login
  const antigo = localStorage.getItem(CHAVE_ANTIGA);
  if (dono && antigo) { localStorage.setItem(chaveDados(conta.id), antigo); localStorage.removeItem(CHAVE_ANTIGA); }
  return conta;
}

// ---------- Ajustes: conta e perfis ----------
function cartaoConta() {
  const c = contaAtual;
  const outros = c.dono ? lerContas().filter((x) => x.id !== c.id) : [];
  return `<div class="card"><h2>Conta</h2>
    <div class="linha entre"><div><b>${esc(c.nome)}</b><div class="muted small">${esc(mascararLogin(c.login))}${c.dono ? ' · dono' : ''}${c.demo ? ' · demonstração' : ''}</div></div>
      <button class="btn-mini" data-acao="sair">Sair</button></div>
    ${c.demo ? `<p class="muted small" style="margin-top:10px">Perfil para mostrar o app. Tem banco próprio: nada aqui afeta os outros perfis.</p>
      <button class="btn sec" data-acao="demo-gerar">Carregar treinos de exemplo</button>` : `
    <details style="margin-top:10px"><summary class="small muted">Trocar senha ▾</summary>
      <form class="form" data-form="senha">
        <label>Senha atual<input class="input-texto" type="password" name="atual" autocomplete="current-password" required></label>
        <label>Nova senha<input class="input-texto" type="password" name="senha" autocomplete="new-password" required></label>
        <label>Confirme a nova senha<input class="input-texto" type="password" name="senha2" autocomplete="new-password" required></label>
        <button class="btn" type="submit">Salvar nova senha</button>
      </form></details>`}
    ${c.dono ? `<h3 style="margin-top:16px">Perfis neste celular</h3>
      ${outros.map((x) => `<div class="linha entre small" style="padding:8px 0;border-top:1px solid var(--line)">
        <span><b>${esc(x.nome)}</b> <span class="muted">· ${esc(mascararLogin(x.login))}</span></span>
        ${x.demo ? '<span class="muted">demonstração</span>' : `<button class="btn-mini" data-acao="perfil-apagar" data-id="${x.id}">Apagar</button>`}</div>`).join('')}
      <details style="margin-top:8px"><summary class="small muted">+ Criar outro perfil ▾</summary>
        <form class="form" data-form="novo-perfil">
          <label>Nome<input class="input-texto" name="nome" required></label>
          <label>CPF ou usuário<input class="input-texto" name="login" autocapitalize="none" required></label>
          <label>Senha (mínimo 6 caracteres)<input class="input-texto" type="password" name="senha" autocomplete="new-password" required></label>
          <label>Confirme a senha<input class="input-texto" type="password" name="senha2" autocomplete="new-password" required></label>
          <button class="btn" type="submit">Criar perfil</button>
        </form></details>` : ''}
  </div>`;
}

async function trocarSenha(form) {
  const contas = lerContas();
  const conta = contas.find((c) => c.id === contaAtual.id);
  if (!(await conferirSenha(conta, form.atual.value))) return toast('Senha atual incorreta');
  if (form.senha.value.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres');
  if (form.senha.value !== form.senha2.value) return toast('As senhas não conferem');
  Object.assign(conta, await novaCredencial(form.senha.value));
  gravarContas(contas);
  contaAtual = conta;
  toast('Senha alterada'); render();
}

// ---------- Perfil de demonstração: treinos de exemplo ----------
function gerarDemo() {
  const sessoes = [];
  let k = 0;
  for (let n = 21; n >= 1; n--) {
    const d = new Date(); d.setDate(d.getDate() - n);
    if (d.getDay() === 0 || n % 7 === 3) continue; // domingos e algumas folgas
    const f = FICHAS[k % FICHAS.length];
    const t = TREINOS[f];
    const semana = Math.floor((21 - n) / 7);
    const series = {}, nomes = {};
    for (const b of t.blocos) for (const ex of b.exercicios) {
      nomes[ex.id] = { nome: ex.nome, grupo: ex.grupo, carga: ex.carga, reps: ex.reps, lado: ex.lado || '' };
      const base = { halter: 12, total: 30, unico: 14, assist: 30 }[ex.carga];
      const kg = ex.carga === 'corporal' ? '' : ex.carga === 'elastico' ? 'verde'
        : String(ex.carga === 'assist' ? base - semana * 5 : base + semana * 2);
      series[ex.id] = Array.from({ length: b.voltas }, (_, i) => ({ kg, reps: String(i === 0 ? ex.reps[1] : ex.reps[0] + 1), ok: true }));
    }
    const inicio = new Date(d); inicio.setHours(7, 0, 0, 0);
    const min = 65 + (k % 3) * 5;
    sessoes.push({
      id: uid(), treino: f, data: isoDia(d), inicio: +inicio, termino: +inicio + min * 60000, duracaoMin: min,
      series, nomes, planejadas: contarSeries(t, {}).total, extras: {},
      checks: { cardioIni: true, prep: [], core: [], mob: [] },
      cardioFinal: k % 2 ? 'feito' : 'dispensado', esforco: 6 + (k % 3), notas: '',
    });
    k++;
  }
  const inicioPeso = new Date(); inicioPeso.setDate(inicioPeso.getDate() - 21);
  db = Object.assign(novoDb(), {
    sessoes,
    perfil: { nascimento: '1990-01-01', altura: '175', pesos: [{ data: isoDia(inicioPeso), kg: 80 }, { data: isoDia(), kg: 78.5 }] },
  });
  salvar();
}

// ---------- Eventos ----------
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const tipo = form.dataset.form;
  if (tipo === 'entrar') return enviarLogin(form);
  if (tipo === 'criar') {
    const conta = await enviarCriacao(form, { dono: true });
    if (conta) { toast(`Bem-vindo, ${conta.nome.split(' ')[0]}!`); entrar(conta); }
  } else if (tipo === 'novo-perfil' && contaAtual?.dono) {
    const conta = await enviarCriacao(form, { dono: false });
    if (conta) { toast('Perfil criado'); render(); }
  } else if (tipo === 'senha') trocarSenha(form);
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el) return;
  const acao = el.dataset.acao;
  if (acao === 'login-modo') { modoLogin = el.dataset.modo; render(); }
  else if (acao === 'ver-senha') {
    const inp = el.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  } else if (acao === 'sair') {
    if (confirm('Sair desta conta? Seus dados continuam salvos neste celular.')) sair();
  } else if (acao === 'perfil-apagar' && contaAtual?.dono) {
    const conta = lerContas().find((c) => c.id === el.dataset.id);
    if (!conta || conta.demo || conta.id === contaAtual.id) return;
    if (!confirm(`Apagar o perfil "${conta.nome}" e todos os treinos dele? Não dá para desfazer.`)) return;
    gravarContas(lerContas().filter((c) => c.id !== conta.id));
    localStorage.removeItem(chaveDados(conta.id));
    toast('Perfil apagado'); render();
  } else if (acao === 'demo-gerar' && contaAtual?.demo) {
    if (db.sessoes.length && !confirm('Substituir os dados deste perfil de demonstração por treinos de exemplo?')) return;
    gerarDemo(); toast('Treinos de exemplo carregados'); location.hash = '#/relatorios';
  }
});
