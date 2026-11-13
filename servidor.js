'use strict';

// Conexão com o Supabase (login e banco na nuvem).
// A URL e a chave "publishable" são públicas por natureza: quem protege os dados são as regras
// de Row Level Security da tabela dados_app (ver supabase.sql), que só deixam cada usuário
// ler e gravar a própria linha.
const SUPABASE_URL = 'https://smywwtoxwvmgmfznevyj.supabase.co';
const SUPABASE_CHAVE = 'sb_publishable_ZGbYgGAF-kVNRm1IMUUaPg_jr-fT88w';
const TABELA = 'dados_app';

// O link de confirmação/redefinição volta com o token no endereço (#access_token=...&type=recovery).
// Guardado antes de criar o cliente, que limpa o endereço ao ler o token.
const HASH_INICIAL = location.hash;
const URL_APP = location.origin + location.pathname;

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_CHAVE, {
  auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});

// Usuário da última sessão, para abrir o app offline mesmo se o token expirou sem internet
const USUARIO_KEY = 'meutreino:sb-usuario';
const pendenteKey = (id) => `meutreino:pendente:${id}`;
const migradoKey = (id) => `meutreino:migrado-sb:${id}`;

const estadoSync = { situacao: 'ok', ultima: null, erro: '' }; // ok | enviando | pendente | erro
let timerEnvio = null;

function contaDoUsuario(u) {
  return { id: u.id, email: u.email, nome: u.user_metadata?.nome || u.nome || (u.email || '').split('@')[0], servidor: true, dono: true };
}
function lembrarUsuario(u) {
  localStorage.setItem(USUARIO_KEY, JSON.stringify({ id: u.id, email: u.email, nome: contaDoUsuario(u).nome }));
}
function usuarioLembrado() {
  try { return JSON.parse(localStorage.getItem(USUARIO_KEY)); } catch (e) { return null; }
}

// Grava a cópia local sem marcar como alteração do usuário (usado pela própria sincronização)
function gravarCache() {
  if (contaAtual) localStorage.setItem(chaveDados(contaAtual.id), JSON.stringify(db));
}

// ---------- Envio ----------
// Chamado por salvar() (app.js) a cada alteração: espera um pouco e envia tudo de uma vez.
function agendarEnvio() {
  localStorage.setItem(pendenteKey(contaAtual.id), '1');
  estadoSync.situacao = 'pendente';
  clearTimeout(timerEnvio);
  timerEnvio = setTimeout(enviarAoServidor, 2500);
}

async function enviarAoServidor() {
  if (!contaAtual?.servidor || !localStorage.getItem(pendenteKey(contaAtual.id))) return;
  const id = contaAtual.id;
  estadoSync.situacao = 'enviando';
  const { error } = await sb.from(TABELA).upsert({
    user_id: id, conteudo: db, atualizado_em: new Date(db.atualizadoEm || Date.now()).toISOString(),
  });
  if (contaAtual?.id !== id) return;
  if (error) { estadoSync.situacao = 'pendente'; estadoSync.erro = error.message; return; }
  localStorage.removeItem(pendenteKey(id));
  estadoSync.situacao = 'ok'; estadoSync.ultima = new Date(); estadoSync.erro = '';
}
window.addEventListener('online', enviarAoServidor);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviarAoServidor(); });
setInterval(enviarAoServidor, 30000);

// ---------- Ao abrir a conta: buscar, juntar e enviar ----------
// Treinos que estavam no aparelho antes do servidor (contas locais por CPF ou dados sem login)
function dadosLocaisAntigos() {
  const fontes = [];
  for (const c of lerContas()) if (c.dono && !c.demo) fontes.push(localStorage.getItem(chaveDados(c.id)));
  fontes.push(localStorage.getItem(CHAVE_ANTIGA));
  return fontes.filter(Boolean).map((raw) => { try { return JSON.parse(raw); } catch (e) { return null; } }).filter(Boolean);
}

// Junta sem perder nada: treinos por id; fichas editadas e dados pessoais só onde ainda não há
function juntar(destino, origem) {
  let mudou = false;
  for (const s of origem.sessoes || []) {
    if (!destino.sessoes.some((x) => x.id === s.id)) { destino.sessoes.push(s); mudou = true; }
  }
  for (const f of Object.keys(origem.fichas || {})) {
    if (!destino.fichas[f]) { destino.fichas[f] = origem.fichas[f]; mudou = true; }
  }
  const p = origem.perfil || {};
  if (!destino.perfil.nascimento && p.nascimento) { destino.perfil.nascimento = p.nascimento; mudou = true; }
  if (!destino.perfil.altura && p.altura) { destino.perfil.altura = p.altura; mudou = true; }
  for (const x of p.pesos || []) {
    if (!destino.perfil.pesos.some((y) => y.data === x.data)) { destino.perfil.pesos.push(x); mudou = true; }
  }
  return mudou;
}

async function sincronizarAoAbrir() {
  const id = contaAtual.id;
  const { data, error } = await sb.from(TABELA).select('conteudo').eq('user_id', id).maybeSingle();
  if (contaAtual?.id !== id) return;
  if (error) { // sem internet ou servidor indisponível: segue com a cópia local
    estadoSync.situacao = localStorage.getItem(pendenteKey(id)) ? 'pendente' : 'erro';
    estadoSync.erro = error.message;
    return;
  }
  const pendente = !!localStorage.getItem(pendenteKey(id));
  const servidor = data && data.conteudo;
  let enviar = false;
  if (servidor && !(pendente && (db.atualizadoEm || 0) > (servidor.atualizadoEm || 0))) {
    db = Object.assign(novoDb(), servidor); // o servidor tem a versão mais nova
  } else {
    enviar = true; // primeira vez no servidor, ou alterações feitas offline neste aparelho
  }
  migrarFichas();
  if (!localStorage.getItem(migradoKey(id))) {
    for (const antigo of dadosLocaisAntigos()) if (juntar(db, Object.assign(novoDb(), antigo))) enviar = true;
    localStorage.setItem(migradoKey(id), '1');
  }
  const antes = db.sessoes.length;
  importarHistorico();
  if (db.sessoes.length !== antes) enviar = true;
  gravarCache();
  if (enviar) { db.atualizadoEm = Date.now(); gravarCache(); localStorage.setItem(pendenteKey(id), '1'); await enviarAoServidor(); }
  else { estadoSync.situacao = 'ok'; estadoSync.ultima = new Date(); }
  render();
}

function textoSync() {
  const s = estadoSync;
  if (s.situacao === 'ok') return s.ultima ? `✓ Salvo no servidor às ${pad(s.ultima.getHours())}:${pad(s.ultima.getMinutes())}` : '✓ Sincronizado';
  if (s.situacao === 'enviando') return 'Enviando ao servidor...';
  if (s.situacao === 'pendente') return navigator.onLine ? 'Alterações aguardando envio' : 'Sem internet: alterações guardadas no celular e enviadas depois';
  return `Não foi possível falar com o servidor${s.erro ? ` (${s.erro})` : ''}`;
}
