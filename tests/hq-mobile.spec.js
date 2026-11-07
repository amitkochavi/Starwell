/* Playwright checks for Starwell HQ on a phone: no page-level horizontal
   scroll on any view, the drawer opens and closes four ways, and every tap
   target clears 44px. Main DB is served from tests/fixtures so the suite
   does not depend on the network. Run: node tests/hq-mobile.spec.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {ctxFor}=require('./hq-harness.js');
const VIEWS=['investments','news','careers','portfolio','images','partners'];
const SIZES=[[375,667,'iPhone SE'],[393,852,'iPhone 15'],[768,1024,'iPad'],[1440,900,'desktop']];
(async()=>{
  const b=await chromium.launch();
  let fails=0;
  for(const [w,h,name] of SIZES){
    const ctx=await ctxFor(b,w,h);
    const p=await ctx.newPage(); const errs=[];
    p.on('pageerror',e=>errs.push(String(e).slice(0,140)));
    await p.goto('http://localhost:8899/hq.html',{waitUntil:'load'});
    await p.waitForTimeout(400);
    await p.evaluate(()=>{document.querySelector('#login').classList.add('hidden');
      document.querySelector('#app').classList.remove('hidden');
      window.StarwellPortal.mount();});
    await p.waitForSelector('#tblMonthly',{timeout:20000});
    await p.waitForTimeout(900);
    for(const v of VIEWS){
      await p.evaluate(view=>{
        document.querySelectorAll('.tab[data-view]').forEach(x=>x.classList.remove('active'));
        document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
        document.querySelector(`.tab[data-view="${view}"]`).classList.add('active');
        document.querySelector('#view-'+view).classList.add('active');
      },v);
      await p.waitForTimeout(220);
      const o=await p.evaluate(()=>Math.round(document.documentElement.scrollWidth-document.documentElement.clientWidth));
      const wide=await p.evaluate(()=>[...document.querySelectorAll('.view.active *')]
        .filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+1.5;})
        .slice(0,3).map(e=>e.tagName.toLowerCase()+'.'+String(e.className||'').split(' ')[0]));
      if(o>0){fails++;console.log(`  FAIL ${name} ${w}px /${v}: page scrolls ${o}px`, wide);}
    }
    // drawer behaviour below 1024
    const drawer=await p.evaluate(async()=>{
      const mb=document.getElementById('menuBtn'), side=document.getElementById('sideNav');
      const vis=getComputedStyle(document.querySelector('.topbar')).display!=='none';
      if(!vis) return {skip:true};
      mb.click(); await new Promise(r=>setTimeout(r,320));
      const open=side.classList.contains('open')&&side.getBoundingClientRect().left>=-1;
      document.getElementById('scrim').click(); await new Promise(r=>setTimeout(r,320));
      const closed=!side.classList.contains('open');
      mb.click(); await new Promise(r=>setTimeout(r,320));
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
      await new Promise(r=>setTimeout(r,320));
      const esc=!side.classList.contains('open');
      mb.click(); await new Promise(r=>setTimeout(r,320));
      document.querySelector('.tab[data-view="news"]').click();
      await new Promise(r=>setTimeout(r,320));
      const onPick=!side.classList.contains('open');
      return {open,closed,esc,onPick};
    });
    // every chart on the Dashboard has to actually draw, at both widths
    await p.evaluate(()=>{
      document.querySelectorAll('.tab[data-view]').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
      document.querySelector('.tab[data-view="investments"]').classList.add('active');
      document.querySelector('#view-investments').classList.add('active');
    });
    await p.waitForTimeout(900);
    const charts=await p.evaluate(()=>[...document.querySelectorAll('#view-investments canvas')]
      .map(c=>({id:c.id, w:Math.round(c.getBoundingClientRect().width),
                h:Math.round(c.getBoundingClientRect().height),
                drawn:!!(window.Chart&&window.Chart.getChart&&window.Chart.getChart(c))})));
    const blank=charts.filter(c=>!c.drawn||c.w<40||c.h<40);
    if(!charts.length){fails++;console.log(`  FAIL ${name}: no charts on the Dashboard`);}
    if(blank.length){fails++;console.log(`  FAIL ${name}: charts did not draw`,blank);}

    // a long table scrolls inside its own wrapper, never the page
    const wrapOverflow=await p.evaluate(()=>[...document.querySelectorAll('.view.active .tw,.view.active .cov-wrap')]
      .filter(e=>e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='visible')
      .slice(0,3).map(e=>String(e.className)));
    if(wrapOverflow.length){fails++;console.log(`  FAIL ${name}: a table overflows without its own scroll`,wrapOverflow);}

    // tap targets
    const small=await p.evaluate(()=>[...document.querySelectorAll('.view.active button, .view.active a, .side button, .topbar button, select')]
      .filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.height<44||r.width<44);})
      .slice(0,5).map(e=>(e.textContent||e.tagName).trim().slice(0,22)+' '+Math.round(e.getBoundingClientRect().height)+'x'+Math.round(e.getBoundingClientRect().width)));
    console.log(`${name} (${w}x${h}): overflow OK, charts ${charts.length} drawn, drawer ${JSON.stringify(drawer)}, small targets ${JSON.stringify(small)}, errors ${errs.length}`);
    if(small.length)fails++;
    if(!drawer.skip && !(drawer.open&&drawer.closed&&drawer.esc&&drawer.onPick)){fails++;console.log('  FAIL drawer');}
    await ctx.close();
  }
  console.log(fails? `\n${fails} FAILURES`:'\nall mobile checks passed');
  await b.close();
  process.exit(fails?1:0);
})();
