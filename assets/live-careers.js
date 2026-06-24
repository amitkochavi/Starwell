/* Live Careers — if Supabase is configured and there are open roles, list
   them in the Open Positions section. Fails silently to the baked empty state. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  sb.from("job_postings").select("*").eq("active",true).order("sort_order",{ascending:true}).then(function(r){
    if(r.error||!r.data||!r.data.length)return;
    var box=document.querySelector("#positions");if(!box)return;
    var empty=document.querySelector("#posEmpty");if(empty)empty.style.display="none";
    box.innerHTML=r.data.map(function(j){
      var href=j.apply_url||"mailto:careers@starwellholdings.com";
      var meta=[j.category,j.location,j.employment_type].filter(Boolean).join("  ·  ");
      return '<a class="jrow" href="'+esc(href)+'" target="_blank" rel="noopener"><div class="jrow-main">'+
        '<div class="jt">'+esc(j.title)+'</div>'+(meta?'<div class="jm">'+esc(meta)+'</div>':"")+
        (j.description?'<p class="jd">'+esc(j.description)+'</p>':"")+'</div>'+
        '<span class="link-arrow">Apply &rarr;</span></a>';
    }).join("");
  }).catch(function(){});
})();
