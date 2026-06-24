/* Live News — if Supabase is configured, replace the baked cards with the
   latest articles from the HQ dashboard. Fails silently to baked content. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  var MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function fdate(d){if(!d)return"";var p=String(d).split("-");if(p.length<3)return d;return MO[(+p[1])-1]+" "+(+p[2])+", "+p[0];}
  sb.from("news_articles").select("*").order("featured",{ascending:false}).order("publish_date",{ascending:false}).then(function(r){
    if(r.error||!r.data||!r.data.length)return;
    var grid=document.querySelector(".news-grid");if(!grid)return;
    grid.innerHTML=r.data.map(function(a){
      var href=a.source_url||"#";var tgt=a.source_url?' target="_blank" rel="noopener"':"";
      var media=a.featured_image_url?'<img src="'+esc(a.featured_image_url)+'" alt="'+esc(a.title)+'" loading="lazy" decoding="async">':esc(a.category||"News");
      return '<a class="na" data-cat="'+esc(a.category||"")+'" href="'+esc(href)+'"'+tgt+'>'+
        '<div class="ph-img">'+media+'</div><div class="na-body"><div class="row1">'+
        '<span class="cat">'+esc(a.category||"News")+'</span><span class="date">'+esc(fdate(a.publish_date))+'</span></div>'+
        '<h3>'+esc(a.title)+'</h3><p>'+esc(a.excerpt||"")+'</p>'+
        '<span class="link-arrow">Read More &rarr;</span></div></a>';
    }).join("");
    var filters=document.querySelector(".filters");
    if(filters){
      var cats=["All"];r.data.forEach(function(a){if(a.category&&cats.indexOf(a.category)<0)cats.push(a.category);});
      filters.innerHTML=cats.map(function(c,i){return '<button class="pill'+(i===0?" active":"")+'" data-cat="'+(c==="All"?"all":esc(c))+'">'+esc(c)+'</button>';}).join("");
      filters.querySelectorAll(".pill").forEach(function(p){p.addEventListener("click",function(){
        filters.querySelectorAll(".pill").forEach(function(x){x.classList.remove("active");});p.classList.add("active");
        var cat=p.getAttribute("data-cat");
        grid.querySelectorAll(".na").forEach(function(card){var c=card.getAttribute("data-cat");card.style.display=(cat==="all"||c===cat)?"":"none";});
      });});
    }
  }).catch(function(){});
})();
