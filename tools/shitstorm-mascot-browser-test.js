'use strict';
// Real local game UI; external services and service workers are blocked. No live writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.SH_BURN_OUT||'/tmp/shitstorm-mascot-review';
fs.mkdirSync(OUT,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.json':'application/json','.woff2':'font/woff2'};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.SH_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],checks=[],snapshots=[];const flush=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='game.local')return route.abort();const f=path.resolve(ROOT,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(f),contentType:mime[path.extname(f)]||'application/octet-stream'});});
 await page.addInitScript(()=>{localStorage.setItem('shithead_hide_helpers','1');localStorage.setItem('shithead_whats_new','0');});
 await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof startSinglePlayerGame==='function');await page.waitForTimeout(1700);
 await page.evaluate(()=>{window.shBootReveal?.();document.getElementById('eventPopupLaterBtn')?.click();startSinglePlayerGame(1,['Review Bot']);state.labDummy=true;hideHelperTip();audio.enabled=false;state.phase='PLAY';state.players.forEach(p=>p.isReady=true);state.currentTurnIndex=0;equippedCosmetics.burnEffect='burn-lvl-shitstorm';equippedCosmetics.cardBack='back-midnight';state.players[1].cosmetics={cardBack:'back-crimson',burnEffect:'burn-lvl-shitstorm'};bigEffectsOn=true;reduceMotion=false;render();document.getElementById('swapControlBar')?.classList.add('hidden');document.getElementById('playActionControls')?.classList.remove('hidden');const play=ShitstormBurn.play;ShitstormBurn.play=function(...args){window.lastBurnOpts=args[5];return play.apply(this,args);};});
 assert.equal(await page.evaluate(()=>ShitstormBurn.preload()),true,'atlas decodes');
 await page.evaluate(()=>{window.fixtureBurn=(t,rank='10',opponent=false)=>{ShLevel3D.clear();window.__burnT=t;state.burnResolving=false;state.discardPile=(rank==='10'?[{id:'review10',rank:'10',suit:'♥'}]:['♣','♦','♥','♠'].map((s,i)=>({id:'review8_'+i,rank:'8',suit:s})));render();const r=discardPileContainer.getBoundingClientRect();triggerEquippedBurnEffect(r.x+r.width/2,r.y+r.height/2,state.players[opponent?1:0]);};});
 for(const[width,height]of(process.env.SH_BURN_FUNCTIONAL?[]:[[390,844],[320,568],[844,390],[1366,768]])){
  await page.setViewportSize({width,height});await flush();
  for(const t of [.18,.64,1.05,1.50,1.90]){
   await page.evaluate(t=>fixtureBurn(t),t);await flush();
   assert.equal(await page.locator('.shitstorm-mascot').count(),1,'new character path');
   assert.equal(await page.locator('#discardCardsWrapper [data-card-id="review10"]').evaluate(e=>getComputedStyle(e).visibility),'hidden',JSON.stringify(await page.evaluate(()=>({time:__burnT,styles:[...document.querySelectorAll('style[data-shitstorm-hide]')].map(e=>e.textContent),opts:lastBurnOpts.cardEls.map(e=>({id:e.dataset.cardId,w:e.offsetWidth,connected:e.isConnected})),html:discardCardsWrapper.innerHTML.slice(0,400)}))));
   const file=`game-${width}x${height}-${t}.png`;await page.screenshot({path:path.join(OUT,file)});snapshots.push(file);
  }
  checks.push(`actual game renderer ${width}x${height}, five phases`);
 }
 await page.setViewportSize({width:390,height:844});await flush();
 await page.evaluate(()=>fixtureBurn(.18));await flush();
 assert.equal(await page.locator('.shitstorm-card-copy').innerText().then(x=>x.includes('10')),true,'exact actual card clone retained');
 const own=await page.evaluate(()=>lastBurnOpts.backClass);
 await page.evaluate(()=>fixtureBurn(1.05,'8',true));await flush();
 assert.equal(await page.locator('.shitstorm-card-copy').innerText().then(x=>x.includes('8')),true,'four-of-rank face retained');
 const other=await page.evaluate(()=>lastBurnOpts.backClass);assert.notEqual(own,other,'opponent back is separate from local back');assert(other.includes('crimson'));
 await page.screenshot({path:path.join(OUT,'game-four-of-rank.png')});checks.push('10 and four-of-rank faces; burning opponent card-back class');
 await page.evaluate(()=>{state.discardPile=[{id:'next-card',rank:'5',suit:'♦'}];render();window.__burnT=.9;});await flush();
 assert.equal(await page.locator('.shitstorm-mascot').count(),1,'effect survives pile DOM replacement');assert.equal(await page.locator('[data-card-id="next-card"]').evaluate(e=>getComputedStyle(e).visibility),'visible','new card is not hidden');
 await page.evaluate(()=>ShLevel3D.clear());assert.equal(await page.locator('.shitstorm-mascot,.shitstorm-card-copy,style[data-shitstorm-hide]').count(),0);checks.push('pile replacement, new card visibility and explicit cleanup');
 for(const setting of ['effects','motion']){await page.evaluate(setting=>{bigEffectsOn=setting!=='effects';reduceMotion=setting==='motion';fixtureBurn(.64);},setting);assert.equal(await page.locator('.shitstorm-mascot').count(),0);}await page.evaluate(()=>{bigEffectsOn=true;reduceMotion=false;});
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>fixtureBurn(.64));assert.equal(await page.locator('.shitstorm-mascot').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});await flush();checks.push('effects off and game/OS reduced motion suppress spatial effect');
 await page.evaluate(()=>{fixtureBurn(.64);fixtureBurn(.64);fixtureBurn(.64)});await flush();assert.equal(await page.locator('.shitstorm-mascot').count(),1,'replay replaces previous: '+JSON.stringify(await page.evaluate(()=>({bigEffectsOn,reduceMotion,othersEffectsOn,equippedCosmetics,hidden:document.hidden,body:document.body.className,os:matchMedia('(prefers-reduced-motion: reduce)').matches,ready:ShitstormBurn.ready,effect:burnEffectIdFor(state.players[0]),canvases:burnFxLayer.innerHTML.slice(0,150)}))));
 await page.evaluate(()=>{__burnT=2.01});await flush();assert.equal(await page.locator('.shitstorm-mascot,.shitstorm-card-copy,style[data-shitstorm-hide]').count(),0);checks.push('repeat play and normal expiry');
 await page.evaluate(()=>{fixtureBurn(.64);document.querySelector('.shitstorm-mascot').remove();});await flush();assert.equal(await page.locator('.shitstorm-card-copy,style[data-shitstorm-hide]').count(),0);checks.push('detached canvas cleanup');
 await page.evaluate(()=>{fixtureBurn(.64);document.body.classList.add('lobby-open');});await flush();assert.equal(await page.locator('.shitstorm-mascot').count(),0);await page.evaluate(()=>document.body.classList.remove('lobby-open'));checks.push('route exit cleanup');
 await page.evaluate(()=>{fixtureBurn(.64);Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});assert.equal(await page.locator('.shitstorm-mascot').count(),0);checks.push('hidden-tab cleanup');
 // Exercise the real game burn resolver, with its unchanged 600ms pile clear.
 await page.evaluate(()=>{fixtureBurn(0);ShLevel3D.clear();window.__burnT=.64;executeBurn(state.players[0],'Shitstorm review');});await page.waitForTimeout(700);
 assert.equal(await page.evaluate(()=>state.discardPile.length),0);assert.equal(await page.locator('.shitstorm-mascot').count(),1);await page.evaluate(()=>ShLevel3D.clear());checks.push('executeBurn resolves at 600ms while mascot completes independently');
 // Preview lifecycle and the reduced-motion variant used by direct rendering clients.
 await page.evaluate(()=>{const host=document.createElement('div');host.id='review-shop';host.style.cssText='position:fixed;width:240px;height:180px';host.innerHTML='<div class="shop-burn-core">10</div>';document.body.appendChild(host);__burnT=.35;ShLevel3D.play('burn-lvl-shitstorm',host,120,135,1,true);});await flush();assert.equal(await page.locator('#review-shop .shitstorm-mascot').count(),1);
 await page.evaluate(()=>{playBurnFx('burn-lvl-shitstorm',document.getElementById('review-shop'),120,135,1);});assert.equal(await page.evaluate(()=>lastBurnOpts.backClass),own,'shop uses local back after an opponent burn');
 await page.evaluate(()=>document.getElementById('review-shop').remove());await flush();assert.equal(await page.evaluate(()=>ShitstormBurn.activeCount),0);checks.push('shop detach and calm poster path');
 await page.evaluate(()=>{__burnT=.3;ShLevel3D.play('default',burnFxLayer,190,330,1,false)});await flush();assert.equal(await page.locator('[data-level-burn="default"]').count(),1);await page.evaluate(()=>ShLevel3D.clear());checks.push('unrelated default renderer still runs');
 assert.equal(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=400;return ShLevel3D.still('burn-lvl-shitstorm',c,.64,{cx:.5,cy:.8});}),true,'still delegate supports normalized coordinates');
 const sound=await page.evaluate(async()=>{const c=new OfflineAudioContext(1,48000*2.2,48000),proxy=new Proxy(c,{get:(t,p)=>p==='state'?'running':typeof t[p]==='function'?t[p].bind(t):t[p]});const fx={ctx:proxy,enabled:true,riffleEl:{volume:1},_burnKit:SoundFX.prototype._burnKit};SoundFX.prototype.playBurnSound.call(fx,'burn-lvl-shitstorm');const b=await c.startRendering(),d=b.getChannelData(0);let peak=0,sum=0,last=0;for(let i=0;i<d.length;i++){peak=Math.max(peak,Math.abs(d[i]));sum+=d[i]*d[i];if(Math.abs(d[i])>.001)last=i/48000;}return{peak,rms:Math.sqrt(sum/d.length),last,samples:Array.from(d),mutedKit:SoundFX.prototype._burnKit.call({...fx,enabled:false})===null,zeroKit:SoundFX.prototype._burnKit.call({...fx,riffleEl:{volume:0}})===null};});
 assert(sound.peak>.025&&sound.peak<.8);assert(sound.last<2.05);assert(sound.mutedKit&&sound.zeroKit);const samples=sound.samples;delete sound.samples;
 const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);samples.forEach((s,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,s))*32767),44+i*2));fs.writeFileSync(path.join(OUT,'shitstorm.wav'),wav);checks.push('actual sound recipe rendered; no clipping; silent mute/zero volume');
 // Actual game-table playback capture, sampled at 30fps. Not a source/mockup render.
 if(!process.env.SH_BURN_FUNCTIONAL){fs.mkdirSync(path.join(OUT,'frames'),{recursive:true});await page.evaluate(()=>{fixtureBurn(0);hideHelperTip();});
 for(let i=0;i<60;i++){await page.evaluate(t=>{__burnT=t;},i/30);await flush();assert.equal(await page.locator('.shitstorm-mascot').count(),1,'video frame has active effect');await page.screenshot({path:path.join(OUT,'frames',String(i).padStart(3,'0')+'.png')});}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,process.env.SH_BURN_FUNCTIONAL?'functional-validation.json':'validation.json'),JSON.stringify({baseline:'4f361b77dac296218ba4a882ed192a25f436f914',errors,checks,sound,snapshots,backClasses:{own,other},capture:'actual local game Chromium, deterministic 30fps sampling; physical phone FPS not measured'},null,2));console.log(JSON.stringify({checks,sound,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
