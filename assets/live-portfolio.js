/* Live Portfolio — if Supabase is configured, replace the baked holdings in
   each [data-pillar] grid with the current rows from the HQ dashboard, so
   edits (links, logos, descriptions) show without a rebuild. Fails silently
   to the baked content. Portfolio content is English-only in the data model;
   only the Role / Website labels are localized. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var grids=document.querySelectorAll("[data-pillar]");
  if(!grids.length)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  var HE=document.documentElement.lang==="he";
  var ROLE=HE?"תפקיד":"Role", WEB=HE?"אתר":"Website";
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function web(u){return u?'<div class="pf-actions"><a href="'+esc(u)+'" target="_blank" rel="noopener" class="link-arrow on-dark" style="font-size:13px">'+WEB+' &rarr;</a></div>':"";}
  function chipImg(row){return row.logo_url?'<img src="'+esc(row.logo_url)+'" alt="'+esc(row.name)+' logo" loading="lazy" decoding="async" style="max-height:34px;max-width:120px;object-fit:contain">':'<span>'+esc(row.name)+'</span>';}
  function pfCard(row){
    return '<div class="pf"><div class="logo-chip">'+chipImg(row)+'</div>'+
      '<div class="pn">'+esc(row.name)+'</div>'+
      (row.role?'<div class="meta"><span>'+ROLE+': '+esc(row.role)+'</span></div>':"")+
      (row.description?'<p class="pf-desc">'+esc(row.description)+'</p>':"")+
      web(row.website_url)+'</div>';
  }
  function xpCard(row){
    var media=esc(row.image_label||"Project");
    return '<div class="xp"><div class="ph-img">'+media+'</div><div class="xp-body">'+
      '<div class="logos"><span class="lchip">'+esc(row.name)+'</span></div>'+
      '<div class="pn">'+esc(row.name)+'</div>'+
      (row.location?'<div class="meta"><span>&#9679;</span><span>'+esc(row.location)+'</span></div>':"")+
      (row.role?'<div class="meta"><span>&#9632;</span><span>'+esc(row.role)+'</span></div>':"")+
      (row.partner?'<div class="meta"><span>&#9651;</span><span>'+esc(row.partner)+'</span></div>':"")+
      (row.description?'<p class="xp-desc">'+esc(row.description)+'</p>':"")+
      web(row.website_url)+'</div></div>';
  }
  sb.from("portfolio_companies").select("*").order("sort_order",{ascending:true}).then(function(r){
    if(r.error||!r.data||!r.data.length)return;
    grids.forEach(function(grid){
      var pillar=grid.getAttribute("data-pillar");
      var rows=r.data.filter(function(x){return x.pillar===pillar;});
      if(!rows.length)return;
      var xp=grid.classList.contains("xp-grid");
      grid.innerHTML=rows.map(xp?xpCard:pfCard).join("");
    });
  }).catch(function(){});
})();
