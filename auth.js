'use strict';

// Login.
// - Conta principal: e-mail e senha no Supabase (servidor.js). Os dados sincronizam com a nuvem,
//   então o mesmo login funciona em qualquer ícone, no Safari ou em outro aparelho.
// - Demonstração: login "admin" / senha "admin", perfil só deste aparelho (não vai ao servidor).
// - Contas locais da versão anterior (por CPF) deixam de ser usadas; os treinos delas sobem para
//   a conta do servidor no primeiro login (servidor.js -> dadosLocaisAntigos).

const CONTAS_KEY = 'meutreino:contas';
const SESSAO_KEY = 'meutreino:sessao'; // só a sessão da demonstração
const ITERACOES = 150000;
const DEMO = { id: 'demo', login: 'admin', senha: 'admin', nome: 'Demonstração' };

let modoLogin = 'entrar'; // 'entrar' | 'criar' | 'redefinir' | 'nova-senha'
let avisoLogin = '';      // mensagem de sucesso mostrada na tela de login (ex.: "enviamos o e-mail")

// ---------- Contas locais (demonstração e contas antigas) ----------
function lerContas() {
  try { return JSON.parse(localStorage.getItem(CONTAS_KEY)) || []; } catch (e) { return []; }
}
function gravarContas(contas) { localStorage.setItem(CONTAS_KEY, JSON.stringify(contas)); }

const normEmail = (s) => (s || '').normalize('NFKC').replace(/[​-‍﻿]/g, '').trim().toLowerCase();
const emailValido = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
function mascararEmail(e) {
  const [u, d] = (e || '').split('@');
  return d ? `${u.slice(0, 2)}***@${d}` : e || '';
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
async function contaDemo() {
  const contas = lerContas();
  let demo = contas.find((c) => c.id === DEMO.id);
  if (!demo) {
    demo = { id: DEMO.id, login: DEMO.login, nome: DEMO.nome, demo: true, ...(await novaCredencial(DEMO.senha)) };
    contas.push(demo); gravarContas(contas);
  }
  return demo;
}

// ---------- Sessão ----------
// Chamado uma vez ao abrir o app (app.js), antes da primeira tela
async function iniciarSessao() {
  if (localStorage.getItem(SESSAO_KEY) === DEMO.id) { abrirConta(await contaDemo()); return; }
  const recuperacao = /type=recovery/.test(HASH_INICIAL);
  const veioDeLink = /access_token=/.test(HASH_INICIAL);
  let sessao = null, falhou = false;
  try {
    const { data, error } = await sb.auth.getSession();
    sessao = data.session; falhou = !!error;
  } catch (e) { falhou = true; }
  if (veioDeLink) history.replaceState(null, '', `${URL_APP}#/hoje`);
  if (sessao && recuperacao) { modoLogin = 'nova-senha'; return; }
  if (sessao) { entrarServidor(sessao.user); return; }
  // Sem internet com o token vencido: abre a cópia do último usuário e sincroniza depois
  const lembrado = usuarioLembrado();
  if (lembrado && (falhou || !navigator.onLine)) { abrirConta(contaDoUsuario(lembrado)); estadoSync.situacao = 'pendente'; }
}

function entrarServidor(user) {
  lembrarUsuario(user);
  localStorage.removeItem(SESSAO_KEY);
  abrirConta(contaDoUsuario(user));
  sincronizarAoAbrir();
}

function irParaApp() {
  avisoLogin = ''; modoLogin = 'entrar';
  if (!/^#\/[a-z]/.test(location.hash)) location.hash = '#/hoje';
  render();
}

async function sair() {
  if (contaAtual?.servidor) {
    await enviarAoServidor();
    try { await sb.auth.signOut(); } catch (e) { /* offline: a sessão local é apagada mesmo assim */ }
    localStorage.removeItem(USUARIO_KEY);
  }
  localStorage.removeItem(SESSAO_KEY);
  contaAtual = null;
  db = novoDb();
  modoLogin = 'entrar';
  render();
}

// Mensagens do Supabase em português
function traduzErro(error) {
  const m = (error && error.message) || '';
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos (veja também a caixa de spam).';
  if (/already registered|already been registered/i.test(m)) return 'Já existe uma conta com esse e-mail. Use "Entrar" ou "Esqueci minha senha".';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas ou e-mails seguidos. Aguarde alguns minutos e tente de novo.';
  if (/Password should be|weak/i.test(m)) return 'Senha fraca: use pelo menos 6 caracteres.';
  if (/fetch|network|Failed to/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
  return m || 'Não foi possível concluir. Tente de novo.';
}

// ---------- Telas ----------
function telaLogin() {
  const subtitulo = {
    entrar: 'Entre para acessar seus treinos', criar: 'Crie sua conta',
    redefinir: 'Redefina a sua senha', 'nova-senha': 'Escolha a nova senha',
  }[modoLogin];
  const topo = `<div class="login-topo"><img src="icons/icon-192.png" alt="" class="login-logo"><h1>Meu Treino</h1>
    <p class="muted small">${subtitulo}</p></div>`;
  const erro = '<p class="login-erro small" id="login-erro" hidden></p>';
  const aviso = avisoLogin ? `<div class="card destaque small">${esc(avisoLogin)}</div>` : '';
  const voltar = '<button class="btn sec" data-acao="login-modo" data-modo="entrar">Voltar ao login</button>';

  if (modoLogin === 'nova-senha') {
    return `<div class="login">${topo}
      <form class="card form" data-form="nova-senha">
        <label>Nova senha (mínimo 6 caracteres)<input class="input-texto" type="password" name="senha" autocomplete="new-password" required></label>
        <label>Confirme a nova senha<input class="input-texto" type="password" name="senha2" autocomplete="new-password" required></label>
        ${erro}<button class="btn" type="submit">Salvar e entrar</button>
      </form></div>`;
  }
  if (modoLogin === 'redefinir') {
    return `<div class="login">${topo}${aviso}
      <form class="card form" data-form="redefinir">
        <label>E-mail da conta<input class="input-texto" type="email" name="email" autocomplete="email" autocapitalize="none" required></label>
        <p class="muted small" style="margin:0">Enviamos um link para criar uma nova senha. Abra o link no próprio celular.</p>
        ${erro}<button class="btn" type="submit">Enviar link</button>
      </form>${voltar}</div>`;
  }
  if (modoLogin === 'criar') {
    return `<div class="login">${topo}${aviso}
      <form class="card form" data-form="criar">
        <label>Seu nome<input class="input-texto" name="nome" autocomplete="name" required></label>
        <label>E-mail<input class="input-texto" type="email" name="email" autocomplete="email" autocapitalize="none" required></label>
        <label>Senha (mínimo 6 caracteres)<input class="input-texto" type="password" name="senha" autocomplete="new-password" required></label>
        <label>Confirme a senha<input class="input-texto" type="password" name="senha2" autocomplete="new-password" required></label>
        <p class="muted small" style="margin:0">Os treinos que já estão neste celular vão para a sua conta.</p>
        ${erro}<button class="btn" type="submit">Criar conta</button>
      </form>${voltar}</div>`;
  }
  return `<div class="login">${topo}${aviso}
    <form class="card form" data-form="entrar">
      <label>E-mail<input class="input-texto" name="email" inputmode="email" autocomplete="username" autocapitalize="none" required></label>
      <label>Senha<div class="linha"><input class="input-texto cresce" type="password" name="senha" autocomplete="current-password" required>
        <button type="button" class="btn-mini" data-acao="ver-senha" aria-label="Mostrar senha">👁</button></div></label>
      ${erro}<button class="btn" type="submit">Entrar</button>
      <button type="button" class="link-btn" data-acao="login-modo" data-modo="redefinir">Esqueci minha senha</button>
    </form>
    <div class="card small">Ainda não tem conta?
      <button class="btn sec" data-acao="login-modo" data-modo="criar">Criar conta</button></div></div>`;
}

function erroLogin(msg) {
  const el = $('#login-erro');
  if (el) { el.textContent = msg; el.hidden = false; } else toast(msg);
}
function ocupado(form, texto) {
  const b = form.querySelector('button[type=submit]');
  const original = b.textContent;
  b.disabled = true; b.textContent = texto;
  return () => { b.disabled = false; b.textContent = original; };
}

async function enviarLogin(form) {
  const email = normEmail(form.email.value), senha = form.senha.value;
  if (email === DEMO.login) {
    const demo = await contaDemo();
    if (!(await conferirSenha(demo, senha))) return erroLogin('Senha incorreta.');
    localStorage.setItem(SESSAO_KEY, DEMO.id);
    abrirConta(demo);
    return irParaApp();
  }
  if (!emailValido(email)) return erroLogin('Informe o e-mail da conta.');
  const pronto = ocupado(form, 'Entrando...');
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  pronto();
  if (error) return erroLogin(traduzErro(error));
  entrarServidor(data.user);
  irParaApp();
}

async function enviarCriacao(form) {
  const nome = form.nome.value.trim(), email = normEmail(form.email.value), senha = form.senha.value;
  if (!nome) return erroLogin('Informe seu nome.');
  if (!emailValido(email)) return erroLogin('Informe um e-mail válido.');
  if (senha.length < 6) return erroLogin('A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== form.senha2.value) return erroLogin('As senhas não conferem.');
  const pronto = ocupado(form, 'Criando...');
  const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: URL_APP } });
  pronto();
  if (error) return erroLogin(traduzErro(error));
  if (data.session) { toast(`Bem-vindo, ${nome.split(' ')[0]}!`); entrarServidor(data.user); return irParaApp(); }
  avisoLogin = `Conta criada. Enviamos um e-mail para ${email}: toque no link para confirmar e depois entre aqui.`;
  modoLogin = 'entrar'; render();
}

async function enviarRedefinicao(form) {
  const email = normEmail(form.email.value);
  if (!emailValido(email)) return erroLogin('Informe um e-mail válido.');
  const pronto = ocupado(form, 'Enviando...');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: URL_APP });
  pronto();
  if (error) return erroLogin(traduzErro(error));
  avisoLogin = `Se houver uma conta com ${email}, você vai receber um e-mail com o link para criar a nova senha (veja também o spam).`;
  render();
}

async function enviarNovaSenha(form) {
  const senha = form.senha.value;
  if (senha.length < 6) return erroLogin('A senha precisa ter pelo menos 6 caracteres.');
  if (senha !== form.senha2.value) return erroLogin('As senhas não conferem.');
  const pronto = ocupado(form, 'Salvando...');
  const { data, error } = await sb.auth.updateUser({ password: senha });
  pronto();
  if (error) return erroLogin(traduzErro(error));
  toast('Senha alterada');
  entrarServidor(data.user);
  irParaApp();
}

// ---------- Ajustes: conta ----------
function cartaoConta() {
  const c = contaAtual;
  if (c.demo) {
    return `<div class="card"><h2>Conta</h2>
      <div class="linha entre"><div><b>${esc(c.nome)}</b><div class="muted small">admin · demonstração</div></div>
        <button class="btn-mini" data-acao="sair">Sair</button></div>
      <p class="muted small" style="margin-top:10px">Perfil para mostrar o app. Fica só neste aparelho e não afeta a sua conta.</p>
      <button class="btn sec" data-acao="demo-gerar">Carregar treinos de exemplo</button></div>`;
  }
  return `<div class="card"><h2>Conta</h2>
    <div class="linha entre"><div><b>${esc(c.nome)}</b><div class="muted small">${esc(c.email || '')}</div></div>
      <button class="btn-mini" data-acao="sair">Sair</button></div>
    <div class="linha entre small" style="margin-top:10px"><span class="muted" id="texto-sync">${esc(textoSync())}</span>
      <button class="btn-mini" data-acao="sincronizar">Sincronizar</button></div>
    <details style="margin-top:10px"><summary class="small muted">Trocar senha ▾</summary>
      <form class="form" data-form="trocar-senha">
        <label>Nova senha<input class="input-texto" type="password" name="senha" autocomplete="new-password" required></label>
        <label>Confirme a nova senha<input class="input-texto" type="password" name="senha2" autocomplete="new-password" required></label>
        <button class="btn" type="submit">Salvar nova senha</button>
      </form></details></div>`;
}

async function trocarSenha(form) {
  if (form.senha.value.length < 6) return toast('A senha precisa ter pelo menos 6 caracteres');
  if (form.senha.value !== form.senha2.value) return toast('As senhas não conferem');
  const { error } = await sb.auth.updateUser({ password: form.senha.value });
  if (error) return toast(traduzErro(error));
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
document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  const acoes = {
    entrar: enviarLogin, criar: enviarCriacao, redefinir: enviarRedefinicao,
    'nova-senha': enviarNovaSenha, 'trocar-senha': trocarSenha,
  };
  const fn = acoes[form.dataset.form];
  if (fn) fn(form).catch((err) => erroLogin(traduzErro(err)));
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el) return;
  const acao = el.dataset.acao;
  if (acao === 'login-modo') { modoLogin = el.dataset.modo; avisoLogin = ''; render(); }
  else if (acao === 'ver-senha') {
    const inp = el.parentElement.querySelector('input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  } else if (acao === 'sair') {
    const msg = contaAtual?.servidor
      ? 'Sair desta conta? Seus treinos ficam salvos no servidor; para entrar de novo use e-mail e senha.'
      : 'Sair da demonstração?';
    if (confirm(msg)) sair();
  } else if (acao === 'sincronizar' && contaAtual?.servidor) {
    toast('Sincronizando...');
    sincronizarAoAbrir().then(() => toast(textoSync()));
  } else if (acao === 'demo-gerar' && contaAtual?.demo) {
    if (db.sessoes.length && !confirm('Substituir os dados deste perfil de demonstração por treinos de exemplo?')) return;
    gerarDemo(); toast('Treinos de exemplo carregados'); location.hash = '#/relatorios';
  }
});

// Mantém o texto de sincronização atualizado quando a tela de Ajustes está aberta
setInterval(() => { const el = $('#texto-sync'); if (el && contaAtual?.servidor) el.textContent = textoSync(); }, 2000);
