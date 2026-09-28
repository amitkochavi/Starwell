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

  /* Build every <img> up front, wait for it to load, and put those exact
     elements on screen. Rendering the belt as an HTML string instead would
     start the downloads only once it is already visible, which on a phone
     leaves the strip blank until they arrive - the bug this avoids. Capped so
     a slow or dead logo can never hold the belt back. */
  function build(logos,hidden){
    var frag=document.createDocumentFragment(),pending=[];
    logos.forEach(function(l){
      var slot=document.createElement("span"); slot.className="m-logo";
      var im=new Image();
      im.decoding="async"; im.alt=l.name||"";
      if(hidden)im.setAttribute("aria-hidden","true");
      pending.push(new Promise(function(res){
        im.onload=im.onerror=function(){res();};
        im.src=l.url;
        if(im.complete)res();
      }));
      slot.appendChild(im); frag.appendChild(slot);
    });
    return {frag:frag,pending:pending};
  }

  function render(logos){
    if(logos.length<2||!window.Promise)return logos.length>=2;
    // repeat the set until each half is wider than the viewport, so the -50%
    // loop never exposes a gap; both halves must stay identical
    var reps=Math.max(1,Math.ceil(1500/Math.max(1,logos.length*150)));
    var a=document.createElement("span"); a.className="m-set";
    var b=document.createElement("span"); b.className="m-set"; b.setAttribute("aria-hidden","true");
    var pending=[],i,s;
    for(i=0;i<reps;i++){
      s=build(logos,false); a.appendChild(s.frag); pending=pending.concat(s.pending);
      s=build(logos,true);  b.appendChild(s.frag); pending=pending.concat(s.pending);
    }
    function swap(){
      if(a.parentNode)return;                       // already swapped by the cap
      track.innerHTML=""; track.appendChild(a); track.appendChild(b);
    }
    Promise.race([Promise.all(pending),new Promise(function(r){setTimeout(r,6000);})])
      .then(swap,swap);
    return true;
  }

  /* Drop duplicate logos that live at different URLs but are the same file
     (e.g. one logo uploaded both as a company logo and as a partner logo).
     Hashes the bytes the browser has already cached; on any failure the list
     is used as-is, deduped by URL only. */
  function dedupe(logos){
    if(!(window.fetch&&window.crypto&&window.crypto.subtle&&window.Promise))return Promise.resolve(logos);
    return Promise.all(logos.map(function(l){
      return fetch(l.url,{cache:"force-cache"})
        .then(function(r){return r.arrayBuffer();})
        .then(function(b){return crypto.subtle.digest("SHA-1",b);})
        .then(function(h){
          var a=new Uint8Array(h),s="";
          for(var i=0;i<a.length;i++)s+=("0"+a[i].toString(16)).slice(-2);
          return {url:l.url,name:l.name,sig:s};
        })
        .catch(function(){return {url:l.url,name:l.name,sig:null};});
    })).then(function(list){
      var seen={},out=[];
      list.forEach(function(l){
        if(l.sig){ if(seen[l.sig])return; seen[l.sig]=1; }
        out.push({url:l.url,name:l.name});
      });
      return out;
    }).catch(function(){return logos;});
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
      return dedupe(logos).then(render);
    }).catch(function(){});
  }

  sb.from("partners").select("name,logo_url,active,sort_order").order("sort_order",{ascending:true}).then(function(r){
    if(!r.error&&r.data){
      var l=r.data.filter(function(x){return x.active!==false&&x.logo_url;})
                  .map(function(x){return {url:x.logo_url,name:x.name||""};});
      if(l.length>=2)return dedupe(l).then(function(d){ if(!render(d))return fromPortfolio(); });
    }
    return fromPortfolio();
  }).catch(fromPortfolio);
})();
