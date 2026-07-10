/* Live Careers — if Supabase is configured and there are open roles, list
   them in the Open Positions section. On the Hebrew site (/he/) it prefers the
   *_he fields and falls back to English. Fails silently to the baked state. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  var HE=document.documentElement.lang==="he";
  function L(row,key){ if(HE){var v=row[key+"_he"]; if(v!=null&&String(v).trim()!=="")return v;} return row[key]; }
  var APPLY=HE?"להגשת מועמדות":"Apply";
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  sb.from("job_postings").select("*").eq("active",true).order("sort_order",{ascending:true}).then(function(r){
    if(r.error||!r.data||!r.data.length)return;
    var box=document.querySelector("#positions");if(!box)return;
    var empty=document.querySelector("#posEmpty");if(empty)empty.style.display="none";
    box.innerHTML=r.data.map(function(j){
      var href=j.apply_url||"mailto:careers@starwellholdings.com";
      var meta=[L(j,"category"),L(j,"location"),L(j,"employment_type")].filter(Boolean).join("  ·  ");
      return '<a class="jrow" href="'+esc(href)+'" target="_blank" rel="noopener"><div class="jrow-main">'+
        '<div class="jt">'+esc(L(j,"title"))+'</div>'+(meta?'<div class="jm">'+esc(meta)+'</div>':"")+
        (L(j,"description")?'<p class="jd">'+esc(L(j,"description"))+'</p>':"")+'</div>'+
        '<span class="link-arrow">'+APPLY+' &rarr;</span></a>';
    }).join("");
  }).catch(function(){});
})();
