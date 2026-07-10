/* Live News — if Supabase is configured, replace the baked cards with the
   latest articles from the HQ dashboard. On the Hebrew site (/he/) it prefers
   the *_he fields and falls back to English. Fails silently to baked content. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  var HE=document.documentElement.lang==="he";
  function L(row,key){ if(HE){var v=row[key+"_he"]; if(v!=null&&String(v).trim()!=="")return v;} return row[key]; }
  var MORE=HE?"קראו עוד":"Read More", ALL=HE?"הכל":"All", DNEWS=HE?"חדשות":"News";
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  var MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var MO_HE=["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];
  function fdate(d){if(!d)return"";var p=String(d).split("-");if(p.length<3)return d;var m=(HE?MO_HE:MO)[(+p[1])-1];return HE?((+p[2])+" "+m+" "+p[0]):(m+" "+(+p[2])+", "+p[0]);}
  sb.from("news_articles").select("*").order("featured",{ascending:false}).order("publish_date",{ascending:false}).then(function(r){
    if(r.error||!r.data||!r.data.length)return;
    var grid=document.querySelector(".news-grid");if(!grid)return;
    grid.innerHTML=r.data.map(function(a){
      var title=L(a,"title"),excerpt=L(a,"excerpt"),cat=L(a,"category");
      var href=a.source_url||"#";var tgt=a.source_url?' target="_blank" rel="noopener"':"";
      var media=a.featured_image_url?'<img src="'+esc(a.featured_image_url)+'" alt="'+esc(title)+'" loading="lazy" decoding="async">':esc(cat||DNEWS);
      return '<a class="na" data-cat="'+esc(cat||"")+'" href="'+esc(href)+'"'+tgt+'>'+
        '<div class="ph-img">'+media+'</div><div class="na-body"><div class="row1">'+
        '<span class="cat">'+esc(cat||DNEWS)+'</span><span class="date">'+esc(fdate(a.publish_date))+'</span></div>'+
        '<h3>'+esc(title)+'</h3><p>'+esc(excerpt||"")+'</p>'+
        '<span class="link-arrow">'+MORE+' &rarr;</span></div></a>';
    }).join("");
    var filters=document.querySelector(".filters");
    if(filters){
      var cats=[ALL];r.data.forEach(function(a){var c=L(a,"category");if(c&&cats.indexOf(c)<0)cats.push(c);});
      filters.innerHTML=cats.map(function(c,i){return '<button class="pill'+(i===0?" active":"")+'" data-cat="'+(i===0?"all":esc(c))+'">'+esc(c)+'</button>';}).join("");
      filters.querySelectorAll(".pill").forEach(function(p){p.addEventListener("click",function(){
        filters.querySelectorAll(".pill").forEach(function(x){x.classList.remove("active");});p.classList.add("active");
        var cat=p.getAttribute("data-cat");
        grid.querySelectorAll(".na").forEach(function(card){var c=card.getAttribute("data-cat");card.style.display=(cat==="all"||c===cat)?"":"none";});
      });});
    }
  }).catch(function(){});
})();
