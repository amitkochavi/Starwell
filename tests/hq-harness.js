/* Shared Playwright context for the HQ tests: stubs Supabase so the gate
   opens, and serves Main DB from CSV fixtures. */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'), path=require('path');
const CSV=process.env.MAIN_DB_CSV_DIR||(__dirname+'/fixtures');
const TABS={'Accounts':'Accounts','Statements':'Statements','Investment Ledger':'Investment_Ledger',
 'Distributions':'Distributions','20 Vitkin Street - APT #2':'20_Vitkin_Street_APT_2',
 'Glaser Real Estate':'Glaser_Real_Estate','Jewelry ':'Jewelry'};
const names=Object.keys(TABS);
const pubhtml=names.map((n,i)=>`{name: "${n}", gid: "${100+i}"}`).join(',');
const gidName={}; names.forEach((n,i)=>gidName[String(100+i)]=n);

async function ctxFor(b,w,h){
  const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700,deviceScaleFactor:2});
  await ctx.route('**fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await ctx.route('**fonts.gstatic.com/**',r=>r.abort());
  // the real supabase bundle would overwrite the stub, so it never loads
  await ctx.route('**/supabase-js**',r=>r.abort());
  // Main DB served from the CSVs pulled from the real published workbook
  await ctx.route('**docs.google.com/**',r=>{
    const u=new URL(r.request().url());
    if(u.pathname.endsWith('/pubhtml')) return r.fulfill({status:200,contentType:'text/html',headers:{'access-control-allow-origin':'*'},body:pubhtml});
    const g=u.searchParams.get('gid'), n=gidName[g];
    if(!n) return r.fulfill({status:404,body:''});
    return r.fulfill({status:200,contentType:'text/csv',headers:{'access-control-allow-origin':'*'},body:fs.readFileSync(path.join(CSV,TABS[n]+'.csv'))});
  });
  // stub Supabase so the gate opens without a real session
  await ctx.addInitScript(()=>{
    window.supabase={createClient:()=>({
      auth:{ getSession:async()=>({data:{session:{user:{email:"amit@starwellholdings.com"}}}}),
             getUser:async()=>({data:{user:{email:"amit@starwellholdings.com"}}}),
             signOut:async()=>({}), onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
             signInWithOtp:async()=>({}), verifyOtp:async()=>({}) },
      from:()=>({ select(){return this;}, eq(){return this;}, order(){return this;},
                  maybeSingle:async()=>({data:{email:"amit@starwellholdings.com"}}),
                  then(cb){return Promise.resolve(cb({data:[],error:null}));} })
    })};
  });
  return ctx;
}
module.exports={ctxFor};
if(require.main===module)(async()=>{
  const b=await chromium.launch();
  const ctx=await ctxFor(b,1440,1000);
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,160));});
  await p.goto('http://localhost:8899/hq.html',{waitUntil:'load'});
  await p.waitForTimeout(500);
  await p.evaluate(()=>{document.querySelector('#login').classList.add('hidden');
    document.querySelector('#app').classList.remove('hidden');
    window.StarwellPortal.mount();});
  await p.waitForSelector('#tblMonthly',{timeout:20000});
  await p.waitForTimeout(1200);
  console.log('errors:',errs);
  console.log('status:', await p.textContent('#portalStatus'));
  console.log('figures:', await p.$$eval('.fig',els=>els.map(e=>e.querySelector('.fig-l').textContent+' = '+e.querySelector('.fig-v').textContent.trim())));
  console.log('sections:', await p.$$eval('.sec-h h2',e=>e.map(x=>x.textContent)));
  console.log('monthly rows:', await p.$$eval('#tblMonthly tbody tr.exp',r=>r.length));
  console.log('capital total:', await p.$$eval('tr.total',r=>r.map(x=>x.textContent.trim().replace(/\s+/g,' '))));
  console.log('data checks:', await p.textContent('details.checks summary'));
  await p.screenshot({path:__dirname+'/hq-dash-1440.png',fullPage:false});
  await b.close();
})();
