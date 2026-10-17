const V = 'ouvir-app-v24', SHELL = ['./', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); self.skipWaiting() });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('ouvir-app') && k !== V).map(k => caches.delete(k))))); self.clients.claim() });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/compartilhar')) {
    e.respondWith((async () => {
      const f = await e.request.formData(), arq = f.get('file'), c = await caches.open('ouvir-share');
      await c.put('/share-meta', new Response(JSON.stringify({title: f.get('title') || '', text: f.get('text') || '', url: f.get('url') || '', nome: arq && arq.name})));
      if (arq && arq.size) await c.put('/share-file', new Response(arq, {headers: {'content-type': arq.type || 'application/octet-stream'}}));
      return Response.redirect('./?share=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/'))) { // HTML: rede primeiro
    e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put('index.html', cp)); return r })
      .catch(() => caches.match('index.html')));
    return;
  }
  if (u.origin !== location.origin && !u.host.includes('fonts.g')) return;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r }).catch(() => hit);
    return hit || net;
  }));
});
