// Makes an app follow the theme chosen in AppDesk (skin + light/dark). Load it in <head>.
(function(){
  function apply(){
    var r=document.documentElement,k='default',p={};
    try{k=localStorage.getItem('appdesk-skin')||'default';p=JSON.parse(localStorage.getItem('appdesk-prefs')||'{}')}catch(e){}
    r.dataset.skin=k;
    if(p.dark)r.dataset.theme=p.dark;else delete r.dataset.theme;
  }
  apply();
  addEventListener('storage',function(e){if(!e.key||e.key==='appdesk-skin'||e.key==='appdesk-prefs')apply()});
})();
