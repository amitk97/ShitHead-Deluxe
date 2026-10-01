'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const ROOT=process.env.SH_GAME_ROOT||path.resolve(__dirname,'..'),OUT=process.env.SH_TABLE_OUT||path.join(ROOT,'docs/table-review-v270');
const sizes=[[390,844],[360,640],[768,1024],[1366,768],[1920,1080],[3840,2160]];
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.SH_CHROMIUM||'/workspace/scratch/5dac38859b68/chromium',args:['--single-process','--in-process-gpu','--no-zygote','--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='game.local'){
   const f=path.join(ROOT,decodeURIComponent(u.pathname==='/'?'index.html':u.pathname.slice(1)));
   if(!fs.existsSync(f))return route.fulfill({status:404,body:'not found'});
   let data=fs.readFileSync(f);if(path.basename(f)==='dev-tests.js')data=data.toString().replace('function renderDevTestReport(results) {','function renderDevTestReport(results) { window.__devResults=results;');
   return route.fulfill({body:data,contentType:({'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json'}[path.extname(f)]||'application/octet-stream')});
  }
  // Use the game's genuine offline fallback. No fake Firebase SDK or gameplay.
  if(u.pathname.includes('canvas-confetti'))return route.fulfill({body:fs.readFileSync(process.env.SH_CONFETTI||'/workspace/scratch/5dac38859b68/browser-deps/node_modules/canvas-confetti/dist/confetti.browser.js'),contentType:'text/javascript'});
  return route.abort();
 });
 await page.addInitScript(()=>{localStorage.setItem('shithead_whats_new','0');localStorage.setItem('shithead_seen_version','v270');localStorage.setItem('shithead_tutorial_progress',JSON.stringify({quick_start:true}));localStorage.setItem('shithead_player_name','Amit');});
 if(process.argv.includes('--suite')){
  await page.goto('https://game.local/index.html?dev-tests=1'+(process.argv.includes('--art-only')?'&test-filter=cosmetic-art':''));
  await page.waitForFunction(()=>window.__devResults,null,{timeout:300000});
  const results=await page.evaluate(()=>window.__devResults),report={pass:results.filter(r=>r.pass).length,total:results.length,failures:results.filter(r=>!r.pass),errors};
  fs.writeFileSync(path.join(OUT,'dev-suite.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();return;
 }
 await page.goto('https://game.local/index.html');await page.waitForTimeout(1200);
 await page.fill('#playerNameInput','Amit');await page.click('#startSingleBtn');await page.waitForFunction(()=>state.phase==='SWAP');await page.waitForTimeout(3500);await page.click('#finishSwapBtn');await page.waitForFunction(()=>state.phase==='PLAY');
 await page.evaluate(()=>{
  state.currentTurnIndex=state.players.findIndex(p=>p.id===state.localPlayerId);render();
  closeHamburgerMenu();document.getElementById('hamburgerDrawer').style.display='none';
 });
 const allTables=await page.evaluate(()=>Object.keys(ShTableScenes.themes).map(k=>'table-'+k));
 const tables=process.env.SH_TABLE_IDS?allTables.filter(id=>process.env.SH_TABLE_IDS.split(',').includes(id)):allTables,results=[];
 const matrix=process.argv.includes('--extra')?[[344,882],[2560,1080],[320,568],[1920,1080]]:sizes;
 for(const [width,height] of matrix){
  const zoom=process.argv.includes('--extra')&&width===1920?2:1;
  await page.setViewportSize({width:Math.round(width/zoom),height:Math.round(height/zoom)});
  const session=await context.newCDPSession(page);await session.send('Emulation.setDeviceMetricsOverride',{width:Math.round(width/zoom),height:Math.round(height/zoom),deviceScaleFactor:zoom,mobile:false});
  for(const id of tables){
   await page.evaluate(id=>{equippedCosmetics.tableTheme=id;applyEquippedCosmetics();ShTableScenes.refresh();},id);
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const check=await page.evaluate(()=>{
    const host=document.getElementById('gameTable'),svg=host.querySelector('.responsive-scene svg'),b=svg.getBoundingClientRect();
    const box=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
    const features=[...svg.querySelectorAll('[data-scene-feature]')].map(el=>{const m=el.getCTM();return {name:el.dataset.sceneFeature,minimum:+el.dataset.minUnit,bounds:box(el.getBoundingClientRect()),scale:[Math.hypot(m.a,m.b),Math.hypot(m.c,m.d)]};});
    return {host:box(host.getBoundingClientRect()),scene:box(b),features,viewport:[innerWidth,innerHeight],phase:state.phase};
   });
   const failures=[],b=check.scene,U=Math.min(b.width,b.height);
   if(Math.abs(check.host.width-b.width)>1||Math.abs(check.host.height-b.height)>1)failures.push('scene coverage');
   if(check.phase!=='PLAY')failures.push('game not in progress');
   for(const f of check.features){const r=f.bounds;
    if(r.left<b.left-.5||r.right>b.right+.5||r.top<b.top-.5||r.bottom>b.bottom+.5)failures.push(f.name+': clipped');
    if(Math.max(r.width,r.height)<Math.max(.12,f.minimum)*U-.6)failures.push(f.name+': too small');
    if(Math.abs(f.scale[0]-f.scale[1])>.01)failures.push(f.name+': stretched');
   }
   if(b.left<-.5||b.right>check.viewport[0]+.5||b.top<-.5||b.bottom>check.viewport[1]+.5)failures.push('table outside viewport');
   results.push({id,width,height,zoom,failures,...check});
   if(!process.argv.includes('--geometry-only')){
    const shot=await session.send('Page.captureScreenshot',{format:'jpeg',quality:92,captureBeyondViewport:false}),bytes=Buffer.from(shot.data,'base64'),meta=await require('sharp')(bytes).metadata();
    assert.equal(meta.width,width);assert.equal(meta.height,height);
    fs.writeFileSync(path.join(OUT,`${id}-${width}x${height}-z${zoom}.jpg`),bytes);
   }
  }
  console.log(`${width}x${height}@${zoom}: ${results.slice(-tables.length).filter(r=>!r.failures.length).length}/${tables.length}`);
  fs.writeFileSync(path.join(OUT,'geometry-results.json'),JSON.stringify({pass:results.filter(r=>!r.failures.length).length,total:results.length,errors,results},null,2));await session.detach();
 }
 console.log('Failures',JSON.stringify(results.filter(r=>r.failures.length).map(r=>({id:r.id,size:[r.width,r.height],failures:r.failures}))));console.log('Page errors',errors);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
