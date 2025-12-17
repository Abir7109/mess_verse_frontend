const CACHE_NAME = 'mv-cache-v11-lux';
const ASSETS = [
  './',
  './index.html',
  './styles/tokens.css',
  './styles/main.css',
  './scripts/main.js',
  './manifest.webmanifest',
  './assets/logo.png',
  './favicon.png',
  './assets/members/abir4.jpg',
  './assets/members/abir1.jpg',
  './assets/members/abir3.jpg',
  './assets/members/junu.jpeg',
  './assets/members/m01.svg',
  './assets/members/m02.svg',
  './assets/members/m03.svg',
  './assets/members/m04.svg',
  './assets/members/m05.svg',
  './assets/members/m06.svg',
  './assets/members/m07.svg',
  './assets/members/m08.svg',
  './assets/members/m09.svg',
  './assets/members/m10.svg',
  './assets/gallery/g01.svg',
  './assets/gallery/g02.svg',
  './assets/gallery/g03.svg',
  './assets/gallery/g04.svg',
  './assets/gallery/g05.svg',
  './assets/gallery/g06.svg'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME ? caches.delete(k) : null)))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(res => {
      if(res) return res;
      return fetch(e.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return resp;
        })
        .catch(()=> caches.match('./index.html'));
    })
  );
});
