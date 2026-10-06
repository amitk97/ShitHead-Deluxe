// Run with Playwright installed. Add --require-video for the deployment gate.
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname, '..');
const server=http.createServer((req,res)=>{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p===root+'/')p+='index.html';fs.readFile(p,(err,data)=>{if(err){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4'})[path.extname(p)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(4175,r));const browser=await chromium.launch({headless:true, ...(process.env.SH_CHROMIUM_EXECUTABLE ? {executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']} : {})});try{
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
await page.goto('http://localhost:4175/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof resetHomeUI==='function');await page.waitForTimeout(1800);
await page.evaluate(()=>{devTestSuiteRunning=true;window.shBootReveal?.();resetHomeUI();});
const focus=()=>page.locator('#modeCarousel .mc-focus').getAttribute('data-mc');
const cdp=await context.newCDPSession(page);
const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,radiusX:2,radiusY:2,id:1}]});
const reset=async()=>{await page.evaluate(()=>{resetHomeUI();document.querySelector('[data-mc-jump="first"]').click();});await page.waitForTimeout(600);};
await reset();let b=await page.locator('#modeCarousel .mc-focus').boundingBox();let x=b.x+b.width/2,y=b.y+b.height/2;
await touch('touchStart',x,y);for(let i=1;i<=6;i++)await touch('touchMove',x-i*10,y);await touch('touchEnd');assert.equal(await focus(),'2');assert.equal(await page.evaluate(()=>document.body.classList.contains('mode-page')),false);console.log('PASS real native touch single step, no navigation');
await page.waitForTimeout(600);b=await page.locator('#modeCarousel .mc-focus').boundingBox();x=b.x+b.width/2;y=b.y+b.height/2;await touch('touchStart',x,y);await touch('touchMove',x-65,y);await page.waitForFunction(()=>Number(document.querySelector('#modeCarousel .mc-focus').dataset.mc)>=4,null,{timeout:4000});await touch('touchEnd');let at=await focus();await page.waitForTimeout(700);assert.equal(await focus(),at);console.log('PASS real touch hold + stop');
await reset();await page.evaluate(()=>document.querySelector('[data-mc="4"]').click());await page.waitForTimeout(600);await page.locator('[data-mc="4"] [data-mc-go]').tap();assert.equal(await page.locator('#lobbyScreen').getAttribute('data-mode-page'),'cpu');console.log('PASS single tap Go');
await page.evaluate(()=>{setModePage('more');document.getElementById('settingsModal').classList.remove('hidden');pageTrail.settingsModal='profileModal';document.getElementById('levelLadderModal').classList.remove('hidden');});await page.waitForTimeout(100);await page.locator('#navHomeLogoBtn').tap();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>[...MENU_PAGE_IDS,...BLOCKING_OVERLAY_IDS].every(id=>document.getElementById(id)?.classList.contains('hidden')) && Object.keys(pageTrail).length===0 && !document.body.classList.contains('mode-page')),true);console.log('PASS logo clears panels/trail + root');
await page.locator('#leaveGameBtn').tap();await page.locator('#shConfirmYes').tap();assert(await page.locator('#appClosingScreen').isVisible());await page.locator('#returnFromClosingBtn').tap();assert(!await page.locator('#appClosingScreen').isVisible());console.log('PASS exit final screen + return');
const sizes=await page.evaluate(()=>{currentUser=null;refreshXpDisplays();const guest=document.getElementById('homeNameLevel').getBoundingClientRect();const old=currentUser,oldXp=playerXp,oldOn=xpFeatureOn;xpFeatureOn=true;currentUser={uid:'test'};playerXp={total:0};refreshXpDisplays();const signed=document.getElementById('homeNameLevel').getBoundingClientRect();currentUser=old;playerXp=oldXp;xpFeatureOn=oldOn;refreshXpDisplays();return {guest:{w:guest.width,h:guest.height,y:guest.y},signed:{w:signed.width,h:signed.height,y:signed.y}}});assert.deepEqual(sizes.guest,sizes.signed);console.log('PASS guest/signed badge identical geometry',sizes);

await reset();await page.evaluate(()=>document.querySelector('[data-mc="4"]').click());await page.waitForTimeout(600);const card=page.locator('[data-mc="4"] .mc-name');await card.tap();await card.tap();await page.waitForTimeout(850);assert.equal(await page.locator('#lobbyScreen').getAttribute('data-mode-page'),'cpu');console.log('PASS double tap card opens');
await page.evaluate(()=>resetHomeUI());await page.setViewportSize({width:1440,height:1000});await reset();b=await page.locator('#modeCarousel .mc-focus').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-70,b.y+b.height/2,{steps:5});await page.mouse.up();assert.equal(await focus(),'2');console.log('PASS desktop drag retained');
for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});await page.evaluate(()=>resetHomeUI());await page.waitForTimeout(100);
  const layout=await page.evaluate(()=>{
    const box=sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};};
    return {first:box('[data-mc-jump="first"]'),last:box('[data-mc-jump="last"]'),tutorial:box('#startTutorialBtn'),video:box('#homeTutorialVideo'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(Math.abs((layout.first.left+layout.last.right)/2-width/2)<1,'Arrows centred under carousel');
  assert(layout.first.bottom <= layout.tutorial.top,'Arrows above tutorial row');
  assert(layout.video.left>layout.tutorial.right,'Video sits to the right');
  assert(!layout.overflow && layout.video.right<=width,'No horizontal overflow');
  console.log('PASS centred arrows / video column',width);
}
// Returning from hidden mode pages must restore actual card spacing, not zero-width geometry.
await page.setViewportSize({width:390,height:844});
for (const mode of ['cpu','friends','ranked','gauntlet','more']) {
  await page.evaluate(mode => setModePage(mode), mode);
  await page.locator('#modePageInfo').click();
  assert(await page.locator('#infoPop').isVisible());
  assert((await page.locator('#infoPop').innerText()).length > 30);
  await page.evaluate(() => { hideInfoPop(); window.dispatchEvent(new Event('resize')); });
  await page.locator('#modePageBack').click();
  await page.waitForTimeout(550);
  const geometry = await page.evaluate(() => [...document.querySelectorAll('#modeCarousel .mc-card:not(.mc-gone)')].map(c=>({x:parseFloat(c.style.getPropertyValue('--mc-x')),w:c.getBoundingClientRect().width})));
  assert(geometry.length >= 3 && geometry.every(c=>c.w>0));
  assert(new Set(geometry.map(c=>c.x)).size === geometry.length, 'Distinct restored card positions');
}
console.log('PASS all mode help and return geometry after hidden resize');
await page.evaluate(() => {
  currentUser=null;
  gauntletStore.set(GAUNTLET_LAST_KEY,{owner:'device',day:localDateKey(),lives:2,round:1,mode:'easy'});
  refreshGauntletLobbyBtn();
});
assert.equal(await page.locator('[data-mc-mode="gauntlet"] [data-mc-go]').innerText(),'Continue →');
for (const patch of [{day:'2000-01-01'},{owner:'another-user'},{lives:0},{round:5}]) {
  await page.evaluate(patch=>{gauntletStore.set(GAUNTLET_LAST_KEY,{owner:'device',day:localDateKey(),lives:2,round:1,mode:'easy',...patch});refreshGauntletLobbyBtn();},patch);
  assert.equal(await page.locator('[data-mc-mode="gauntlet"] [data-mc-go]').innerText(),'Go →');
}
await page.evaluate(()=>{gauntletStore.set(GAUNTLET_LAST_KEY,null);refreshGauntletLobbyBtn();document.querySelector('[data-mc-jump="first"]').click();});
await page.waitForTimeout(550);
await page.locator('[data-mc-mode="pin1"] [data-mc-swap]').click();
await page.locator('[data-mc-pin="twos"]').click();
assert.equal(await page.locator('[data-mc-mode="pin1"] [data-mc-swap]').innerText(),'Swap');
await page.locator('[data-mc-mode="pin1"] [data-mc-preview]').click();
assert((await page.locator('#infoPop').innerText()).includes('Coming soon'));
await page.evaluate(()=>hideInfoPop());
await page.locator('[data-mc-mode="pin1"] [data-mc-swap]').click();
await page.locator('[data-mc-pin="puzzles"]').click();
assert.equal(await page.locator('[data-mc-mode="pin1"] .mc-name').innerText(),'Puzzles');
console.log('PASS shortcut Pin / Info / Swap and daily Gauntlet states');
await page.locator('#homeVideoExpand').click();
await page.waitForFunction(()=>document.fullscreenElement || document.querySelector('.video-expanded'));
await page.locator('#homeVideoExpand').click();
await page.waitForFunction(()=>!document.fullscreenElement && !document.querySelector('.video-expanded'));
await page.evaluate(()=>{document.getElementById('homeTutorialPlayer').requestFullscreen=()=>Promise.reject(new Error('unsupported'));});
await page.locator('#homeVideoExpand').click();
assert(await page.locator('#homeTutorialPlayer').evaluate(el=>el.classList.contains('video-expanded')));
await page.keyboard.press('Escape');
assert(!await page.locator('#homeTutorialPlayer').evaluate(el=>el.classList.contains('video-expanded')));
console.log('PASS native fullscreen toggle and unsupported fallback');
await page.screenshot({path:'/tmp/ui329-home.png'});
await page.evaluate(()=>{document.getElementById('settingsModal').classList.remove('hidden');syncBackgroundScrollLock();});
assert.equal(await page.locator('#navHomeLogoBtn').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
await page.evaluate(()=>resetHomeUI());
assert.equal(await page.locator('#headerShopBtn').evaluate(el=>getComputedStyle(el).opacity),'1');
console.log('PASS synchronous header switch');
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);

if (fs.existsSync(path.join(root, 'media/tutorial-reference.mp4'))) {
  await page.locator('#homeTutorialVideo').evaluate(video => new Promise((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => video.duration > 0 ? resolve() : reject(new Error('Video has no duration')), {once:true});
    video.addEventListener('error', () => reject(new Error('Reference video cannot be decoded')), {once:true});
    video.load();
  }));
  await page.locator('#homeTutorialVideo').evaluate(async video => { video.muted = true; await video.play(); });
  await page.waitForFunction(() => document.getElementById('homeTutorialVideo').currentTime > .2);
  await page.evaluate(() => setModePage('cpu'));
  assert(await page.locator('#homeTutorialVideo').evaluate(video => video.paused));
  console.log('PASS reference video playback and pause on navigation');
} else {
  if (process.argv.includes('--require-video')) throw new Error('VID-20261003-WA0017.mp4 must be supplied before deployment');
  console.log('PENDING: reference video upload; playback cannot yet be verified');
}
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
