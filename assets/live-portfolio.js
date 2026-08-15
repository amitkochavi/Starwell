/* Live Portfolio — if Supabase is configured, replace the baked holdings in
   each [data-pillar] grid with the current portfolio_companies rows from the
   HQ dashboard, so edits (links, logos, photos, descriptions) show without a
   rebuild. Real-estate cards use the uploaded photo gallery: one photo shows
   statically, several show as a slider. Fails silently to baked content. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var grids=document.querySelectorAll("[data-pillar]");
  if(!grids.length)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  var HE=document.documentElement.lang==="he";
  var ROLE=HE?"תפקיד":"Role", WEB=HE?"אתר":"Website";
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function imgs(row){ var a=row.images; return Array.isArray(a)?a.filter(Boolean):(a?[a]:[]); }
  function plogos(row){ var a=row.partner_logos; a=Array.isArray(a)?a.filter(Boolean):(a?[a]:[]);
    return a.length?'<div class="xp-partners">'+a.map(function(u){return '<span class="pchip"><img src="'+esc(u)+'" alt="" loading="lazy" decoding="async"></span>';}).join("")+'</div>':""; }
  function web(u){return u?'<div class="pf-actions"><a href="'+esc(u)+'" target="_blank" rel="noopener" class="link-arrow on-dark" style="font-size:13px">'+WEB+' &rarr;</a></div>':"";}
  function chipImg(row){ var a=imgs(row); var logo=row.logo_url||a[0];
    return logo?'<img src="'+esc(logo)+'" alt="'+esc(row.name)+' logo" loading="lazy" decoding="async" style="max-height:34px;max-width:120px;object-fit:contain">':'<span>'+esc(row.name)+'</span>'; }
  function media(row){
    var a=imgs(row);
    if(!a.length) return '<div class="ph-img">'+esc(row.image_label||"Project")+'</div>';
    if(a.length===1) return '<div class="ph-img"><img src="'+esc(a[0])+'" alt="'+esc(row.name)+'" loading="lazy" decoding="async"></div>';
    return '<div class="ph-img xp-slider">'+
      a.map(function(u,i){return '<div class="slide'+(i===0?" active":"")+'"><img src="'+esc(u)+'" alt="'+esc(row.name)+'" loading="lazy" decoding="async"></div>';}).join("")+
      '<button class="xp-nav prev" type="button" aria-label="Previous">&#8249;</button>'+
      '<button class="xp-nav next" type="button" aria-label="Next">&#8250;</button>'+
      '<div class="xp-dots">'+a.map(function(u,i){return '<span'+(i===0?' class="on"':"")+'></span>';}).join("")+'</div></div>';
  }
  function pfCard(row){
    return '<div class="pf"><div class="logo-chip">'+chipImg(row)+'</div>'+
      '<div class="pn">'+esc(row.name)+'</div>'+
      (row.role?'<div class="meta"><span>'+ROLE+': '+esc(row.role)+'</span></div>':"")+
      (row.description?'<p class="pf-desc">'+esc(row.description)+'</p>':"")+
      plogos(row)+web(row.website_url)+'</div>';
  }
  function xpCard(row){
    return '<div class="xp">'+media(row)+'<div class="xp-body">'+
      '<div class="logos"><span class="lchip">'+esc(row.name)+'</span></div>'+
      '<div class="pn">'+esc(row.name)+'</div>'+
      (row.location?'<div class="meta"><span>&#9679;</span><span>'+esc(row.location)+'</span></div>':"")+
      (row.role?'<div class="meta"><span>&#9632;</span><span>'+esc(row.role)+'</span></div>':"")+
      (row.partner?'<div class="meta"><span>&#9651;</span><span>'+esc(row.partner)+'</span></div>':"")+
      (row.description?'<p class="xp-desc">'+esc(row.description)+'</p>':"")+
      plogos(row)+web(row.website_url)+'</div></div>';
  }
  // slider controls (delegated)
  document.addEventListener("click",function(e){
    var nav=e.target.closest(".xp-nav"); if(!nav)return;
    var sl=nav.closest(".xp-slider"); if(!sl)return;
    var slides=sl.querySelectorAll(".slide"), dots=sl.querySelectorAll(".xp-dots span"), cur=0;
    slides.forEach(function(s,i){ if(s.classList.contains("active"))cur=i; });
    var to=(cur+(nav.classList.contains("next")?1:-1)+slides.length)%slides.length;
    slides[cur].classList.remove("active"); slides[to].classList.add("active");
    if(dots.length){ dots[cur].classList.remove("on"); dots[to].classList.add("on"); }
  });
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
