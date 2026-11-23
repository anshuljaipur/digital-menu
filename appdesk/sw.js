// Network-first service worker. Also adds Home/Refresh buttons to apps opened full page (installed app only).
const C='appdesk-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const top=r.destination==='document'&&u.pathname.indexOf('/apps/')>-1;
  e.respondWith((async()=>{
    try{
      const res=await fetch(r.url,{cache:'no-cache'});
      if(top&&res.ok&&(res.headers.get('content-type')||'').indexOf('text/html')>-1){
        const txt=await res.text();
        const tag='<script src="'+new URL('nav-bar.js',self.registration.scope).pathname+'"><\/script>';
        const i=txt.toLowerCase().lastIndexOf('</body>');
        const out=new Response(i>-1?txt.slice(0,i)+tag+txt.slice(i):txt+tag,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
        caches.open(C).then(c=>c.put(r,out.clone()));
        return out;
      }
      if(res.ok){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}
      return res;
    }catch(err){const m=await caches.match(r);if(m)return m;throw err}
  })());
});
