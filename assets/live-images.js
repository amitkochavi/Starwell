/* Live site images — fill every [data-img="<key>"] slot with the image
   uploaded for that key in the HQ dashboard (site_images table). Slots keep
   whatever the build produced (a self-hosted file or a text placeholder) until
   an upload exists, so the page never shows a broken graphic. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var slots=document.querySelectorAll('[data-img]');
  if(!slots.length)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  sb.from("site_images").select("key,url").then(function(r){
    if(r.error||!r.data)return;
    var map={};
    r.data.forEach(function(row){ if(row.url)map[row.key]=row.url; });
    for(var i=0;i<slots.length;i++){
      var el=slots[i], url=map[el.getAttribute('data-img')];
      if(!url)continue;
      var cur=el.querySelector('img');
      if(cur&&cur.getAttribute('src')===url)continue;
      var alt=(cur&&cur.getAttribute('alt'))||el.textContent.trim()||"";
      el.innerHTML='<img src="'+esc(url)+'" alt="'+esc(alt)+'" loading="lazy" decoding="async">';
    }
  }).catch(function(){});
})();
