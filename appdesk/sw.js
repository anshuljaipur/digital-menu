// Network-first service worker: always tries the latest files, falls back to cache when offline.
const C='appdesk-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith(fetch(r.url,{cache:'no-cache'}).then(res=>{
    if(res.ok){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}
    return res;
  }).catch(()=>caches.match(r)));
});
