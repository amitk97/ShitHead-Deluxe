'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright' : 'playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.SH_BURN_OUT||'/tmp/level-burn-review';
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.SH_CHROMIUM || chromium.executablePath(),args:["--no-sandbox","--disable-dev-shm-usage","--no-zygote","--single-process","--in-process-gpu","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname!=='game.local')return route.abort();
  const f=path.join(ROOT,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1)));
  if(!fs.existsSync(f))return route.fulfill({status:404,body:'missing'});
  let body=fs.readFileSync(f);
  if(f.endsWith('dev-tests.js'))body=body.toString().replace('function renderDevTestReport(results) {','function renderDevTestReport(results) { window.__devResults=results;');
  return route.fulfill({body,contentType:({'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json'}[path.extname(f)]||'text/plain')});
 });
 await page.goto('https://game.local/index.html?dev-tests=1&test-filter=Level%20burns');
 await page.waitForFunction(()=>window.__devResults,{},{timeout:60000});
 const suite=await page.evaluate(()=>window.__devResults);console.log('Existing level suite:',suite);assert(suite.every(r=>r.pass));
 await page.evaluate(()=>{const overlay=document.createElement('div');overlay.id='burn-review';overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:#081222;padding:24px;color:white;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;overflow:auto';overlay.innerHTML=LEVEL_BURN_IDS.map(id=>`<section><div style="display:flex;gap:12px;align-items:center;margin:8px"><span style="width:40px;height:40px;display:block">${burnPreviewIcon(id)}</span>${id.replace('burn-lvl-','')}</div><div class="review-stage" data-id="${id}" style="position:relative;height:285px;border:1px solid #485369;background:radial-gradient(ellipse,#193324,#08131a);border-radius:14px"></div></section>`).join('');document.body.appendChild(overlay);});
 await page.evaluate(async()=>{await Promise.all(['layers.webp','concepts.webp'].map(n=>new Promise(res=>{const im=new Image();im.onload=res;im.onerror=res;im.src='art/burns/level-v294/'+n;})));});
 const show=async(time,calm=false)=>page.evaluate(({time,calm})=>{
   for(const s of document.querySelectorAll('.review-stage')){ShLevelBurns.clear(s);ShLevelBurns.play(s.dataset.id,s,s.clientWidth/2,190,1,calm);for(const a of s.getAnimations({subtree:true})){a.pause();a.currentTime=time;}}
 },{time,calm});
 await show(550);await page.screenshot({path:path.join(OUT,'desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{document.getElementById('burn-review').style.gridTemplateColumns='repeat(2,1fr)';for(const s of document.querySelectorAll('.review-stage'))s.style.height='170px';});
 await show(550);await page.screenshot({path:path.join(OUT,'mobile.png'),fullPage:true});
 await show(300,true);await page.screenshot({path:path.join(OUT,'reduced.png')});
 // Repeated playback restores preview core and leaves no layers behind.
 await page.evaluate(()=>{ShLevelBurns.clear();const s=document.querySelector('.review-stage');s.innerHTML='<div class="shop-burn-core">test</div>';for(let n=0;n<12;n++)playShopBurnPreview(s.dataset.id,s);});
 await page.waitForTimeout(2400);
 assert.equal(await page.locator('.lb294-root').count(),0);
 assert.equal(await page.locator('.review-stage .shop-burn-core').evaluate(e=>e.style.visibility),'');
 const sound=await page.evaluate(async()=>{
  const out=[];
  for(const id of LEVEL_BURN_IDS){
   const ctx=new OfflineAudioContext(1,48000*3,48000);
   // OfflineAudioContext begins suspended; use the real kit with a running-state proxy.
   const proxy=new Proxy(ctx,{get:(t,p)=>p==='state'?'running':typeof t[p]==='function'?t[p].bind(t):t[p]});
   BURN_SOUNDS[id](SoundFX.prototype._burnKit.call({ctx:proxy,enabled:true,riffleEl:{volume:1}}));
   const b=await ctx.startRendering(),d=b.getChannelData(0);let peak=0,sum=0,last=0;for(let n=0;n<d.length;n++){peak=Math.max(peak,Math.abs(d[n]));sum+=d[n]*d[n];if(Math.abs(d[n])>.001)last=n/48000;}
   out.push({id,peak,rms:Math.sqrt(sum/d.length),last});
  }return out;
 });
 for(const s of sound){assert(s.peak>.05&&s.peak<.8,JSON.stringify(s));assert(s.last<2.1);}
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({suite,sound,errors},null,2));console.log(JSON.stringify({sound,errors},null,2));

 await page.addInitScript(()=>{localStorage.setItem('shithead_whats_new','0');localStorage.setItem('shithead_tutorial_progress',JSON.stringify({quick_start:true}));localStorage.setItem('shithead_player_name','Amit');});
 await page.goto('https://game.local/index.html');
 await page.fill('#playerNameInput','Amit');await page.click('#startSingleBtn');
 await page.waitForFunction(()=>state.phase==='SWAP');await page.waitForTimeout(3500);
 await page.click('#finishSwapBtn');await page.waitForFunction(()=>state.phase==='PLAY');
 for(const width of [390,1366]){
  await page.setViewportSize({width,height:width===390?844:768});
  await page.evaluate(()=>{state.currentTurnIndex=state.players.findIndex(p=>p.id===state.localPlayerId);render();});
  for(const name of ['spark-snap','smoke-burst','inferno-sweep','hellfire-spiral','royal-incineration','shitstorm']){
   await page.evaluate(name=>{ShLevelBurns.clear();const r=document.getElementById('discardPileContainer').getBoundingClientRect();playBurnEffect('burn-lvl-'+name,r.x+r.width/2,r.y+r.height/2);for(const a of document.getElementById('burnFxLayer').getAnimations({subtree:true})){a.pause();a.currentTime=name==='spark-snap'?450:900;}},name);
   await page.screenshot({path:path.join(OUT,`game-${width}-${name}.png`)});
  }
 }
 await page.evaluate(()=>{ShLevelBurns.clear();reduceMotion=true;const s=document.getElementById('burnFxLayer');playBurnEffect('burn-lvl-shitstorm',190,400);if(s.querySelectorAll('.lb294-piece').length!==1)throw new Error('Game reduced motion not honoured');});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{ShLevelBurns.clear();reduceMotion=false;playBurnEffect('burn-lvl-royal-incineration',190,400);if(document.querySelectorAll('.lb294-piece').length!==1)throw new Error('OS reduced motion not honoured');Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));if(document.querySelector('.lb294-root'))throw new Error('Background cleanup failed');delete document.hidden;});
 assert.equal(errors.length,0);await browser.close();

})().catch(e=>{console.error(e);process.exit(1);});
