/* Screenshots of the Dashboard. Point MAIN_DB_CSV_DIR at a snapshot and
   SHOT_DIR at somewhere outside this repository. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {ctxFor}=require('./hq-harness.js');
const OUT=process.env.SHOT_DIR||__dirname;
(async()=>{
  const b=await chromium.launch();
  for(const [w,h,tag,scale] of [[375,900,'375',2],[1440,1000,'1440',2]]){
    const ctx=await ctxFor(b,w,h);
    const p=await ctx.newPage(); const errs=[];
    p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
    await p.goto('http://localhost:8899/hq.html',{waitUntil:'load'});
    await p.waitForTimeout(400);
    await p.evaluate(()=>{document.querySelector('#login').classList.add('hidden');
      document.querySelector('#app').classList.remove('hidden');
      window.StarwellPortal.mount();});
    await p.waitForSelector('#tblMonthly',{timeout:25000});
    await p.waitForTimeout(1800);
    await p.screenshot({path:`${OUT}/dash-${tag}.png`,fullPage:true});
    console.log(tag,'errors',errs.length,
      await p.$$eval('.fig',e=>e.map(x=>x.querySelector('.fig-l').textContent+' '+x.querySelector('.fig-v').textContent.trim())));
    await ctx.close();
  }
  await b.close();
})();
