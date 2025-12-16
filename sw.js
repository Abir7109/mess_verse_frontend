const CACHE_NAME = 'mv-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles/tokens.css',
  './styles/main.css',
  './scripts/main.js',
  './manifest.webmanifest'
];
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME? caches.delete(k):null))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', (e)=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(res=> res || fetch(e.request).then(resp=>{
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(cache=> cache.put(e.request, clone));
      return resp;
    }).catch(()=> caches.match('./index.html')))
  );
});
