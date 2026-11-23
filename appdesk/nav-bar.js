// Small floating Home / Refresh buttons for apps opened full page inside the installed AppDesk app.
(function(){
  var st=navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
  if(!st||window.top!==window||window.__adNav)return;
  window.__adNav=1;
  var src=(document.currentScript&&document.currentScript.src)||'';
  var home=new URL('./',src||location.href).href;
  var box=document.createElement('div');
  box.setAttribute('style','position:fixed;left:10px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147483647;display:flex;gap:8px;touch-action:none;-webkit-user-select:none;user-select:none');
  function mk(t,title,fn){
    var b=document.createElement('button');b.type='button';b.textContent=t;b.title=title;
    b.setAttribute('style','width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.5);background:rgba(20,30,60,.82);color:#fff;font-size:20px;line-height:1;padding:0;box-shadow:0 3px 10px rgba(0,0,0,.35);opacity:.92;font-family:system-ui,sans-serif');
    b.addEventListener('click',function(e){if(box._moved){box._moved=false;return}fn(e)});
    return b;
  }
  box.appendChild(mk('⌂','AppDesk home',function(){location.href=home}));
  box.appendChild(mk('⟳','Refresh',function(){location.reload()}));
  try{var p=JSON.parse(localStorage.getItem('appdesk-navpos')||'null');if(p){box.style.left=p.x+'px';box.style.top=p.y+'px';box.style.bottom='auto'}}catch(e){}
  var sx,sy,ox,oy,down=false;
  box.addEventListener('pointerdown',function(e){down=true;box._moved=false;sx=e.clientX;sy=e.clientY;var r=box.getBoundingClientRect();ox=r.left;oy=r.top});
  addEventListener('pointermove',function(e){
    if(!down)return;var dx=e.clientX-sx,dy=e.clientY-sy;
    if(!box._moved&&Math.abs(dx)+Math.abs(dy)<8)return;
    box._moved=true;
    var x=Math.max(0,Math.min(innerWidth-100,ox+dx)),y=Math.max(0,Math.min(innerHeight-50,oy+dy));
    box.style.left=x+'px';box.style.top=y+'px';box.style.bottom='auto';
  });
  addEventListener('pointerup',function(){
    if(down&&box._moved){try{var r=box.getBoundingClientRect();localStorage.setItem('appdesk-navpos',JSON.stringify({x:r.left,y:r.top}))}catch(e){}}
    down=false;setTimeout(function(){box._moved=false},50);
  });
  (document.body||document.documentElement).appendChild(box);
})();
