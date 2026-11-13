// Guarda o app no celular para funcionar sem internet.
// Ao publicar uma nova versão, aumente o número abaixo.
const VERSAO = 'meutreino-v8';
const ARQUIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'treinos.js', 'catalogo.js', 'importacao.js', 'editor.js', 'relatorios.js', 'auth.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Rede primeiro (pega atualizações quando há internet), cache como reserva.
self.addEventListener('fetch', (e) => {
  // Vídeos e miniaturas do YouTube não ficam no cache
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
