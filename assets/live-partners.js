/* Live partner marquee — rebuild the logo belt from the logos managed in the
   HQ dashboard: the "partners" table first, falling back to logos uploaded on
   portfolio companies. Keeps the carousel current without a rebuild and off
   any stale external host; falls back silently to the baked belt. */
(function(){
  if(!window.SB_URL||!window.SB_ANON||!window.supabase)return;
  var track=document.querySelector('.marquee-track');
  if(!track)return;
  var sb=window.supabase.createClient(window.SB_URL,window.SB_ANON);
  function esc(s){return (s==null?"":String(s)).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}

  function render(logos){
    if(logos.length<2)return false;
    function set(hidden){
      return logos.map(function(l){
        return '<span class="m-logo"><img src="'+esc(l.url)+'" alt="'+esc(l.name)+'" loading="lazy" decoding="async"'+(hidden?' aria-hidden="true"':'')+'></span>';
      }).join("");
    }
    // two exactly-equal halves (each holding the set twice) keeps the -50% loop seamless
    var half=set(false)+set(true);
    track.innerHTML='<span class="m-set">'+half+'</span><span class="m-set" aria-hidden="true">'+half+'</span>';
    return true;
  }

  function fromPortfolio(){
    return sb.from("portfolio_companies").select("*").order("sort_order",{ascending:true}).then(function(r){
      if(r.error||!r.data||!r.data.length)return;
      var seen={}, logos=[];
      r.data.forEach(function(row){
        var list=[];
        if(row.logo_url)list.push(row.logo_url);
        var pl=Array.isArray(row.partner_logos)?row.partner_logos:[];
        pl.forEach(function(u){if(u)list.push(u);});
        list.forEach(function(u){
          if(seen[u])return; seen[u]=1;
          logos.push({url:u,name:row.name||""});
        });
      });
      render(logos);
    }).catch(function(){});
  }

  sb.from("partners").select("name,logo_url,active,sort_order").order("sort_order",{ascending:true}).then(function(r){
    if(!r.error&&r.data){
      var l=r.data.filter(function(x){return x.active!==false&&x.logo_url;})
                  .map(function(x){return {url:x.logo_url,name:x.name||""};});
      if(render(l))return;
    }
    return fromPortfolio();
  }).catch(fromPortfolio);
})();
