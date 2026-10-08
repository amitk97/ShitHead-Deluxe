/* Responsive lobby and host/guest behavior, with network writes confined to an in-memory room. */
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']}: {})});
try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='game.local'){
  const file=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2'};
  return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]}):route.fulfill({status:404,body:''});
 }
 if(u.pathname==='/privateBurnArt')return route.fulfill({contentType:'application/json',body:JSON.stringify({css:'.private-burn{position:absolute;width:280px;height:240px;pointer-events:none;animation:pb-life 3100ms linear forwards}@keyframes pb-life{0%{opacity:1}100%{opacity:0}}',html:'<span class="pb-letter">fixture</span>'})});
 if(u.pathname==='/privateTableArt')return route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=','base64'),contentType:'image/png'});
 if(u.pathname==='/privateAvatarArt')return process.env.SH_PRIVATE_PREVIEW?route.fulfill({body:fs.readFileSync(process.env.SH_PRIVATE_PREVIEW),contentType:'image/png'}):route.fulfill({status:404,body:''});
 const sdk=u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
 if(sdk && process.env.SH_VIDEO_DEPS)return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/firebase',sdk[1])),contentType:'application/javascript'});
 if(sdk || u.pathname.includes('canvas-confetti'))return route.continue();
 return route.abort();
});
await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.ShFriendsLobby);


await page.evaluate(()=>{
 devTestSuiteRunning=true;resetHomeUI();window.shBootReveal();
 currentUser={uid:PRIVATE_TABLE_OWNER,getIdToken:async()=> 'test-token'};
 cosmeticCollectionUid=currentUser.uid;cosmeticPurchaseState={[PRIVATE_BURN_ID]:{purchasedAt:Date.now(),privateGift:true}};
 db={ref:()=>({set:async()=>{}})};
 renderPersonalisationCosmetics();renderCollection();renderCosmeticShop();
});
assert.equal(await page.locator('#personalisationBurnEffects [data-equip-id="burn-private-keepsake"]').count(),1);
assert.equal(await page.locator('[data-shop-row="burn-private-keepsake"],[data-coll-id="burn-private-keepsake"]').count(),0);
assert(await page.evaluate(()=>equipCosmetic('burnEffect',PRIVATE_BURN_ID,{preview:false,sync:false})));
assert.equal(await page.evaluate(()=>getShowcaseLoadout().burnEffect),'default');
assert.equal(await page.evaluate(()=>getPublicCosmeticLoadout().burnEffect),'default');
assert.equal(await page.evaluate(()=>burnEffectIdFor({id:state.localPlayerId,cosmetics:{burnEffect:'default'}})),'burn-private-keepsake');
assert.equal(await page.evaluate(()=>burnEffectIdFor({id:'remote',cosmetics:{burnEffect:PRIVATE_BURN_ID}})),'default');
await page.evaluate(async()=>{
 await loadPrivateBurnArt();
 window.privateSoundEvents=[];
 audio._burnKit=()=>({tone:()=>privateSoundEvents.push('chime'),noise:()=>privateSoundEvents.push('breeze')});
 const host=document.createElement('div');host.id='privateBurnTestHost';host.style.cssText='position:fixed;inset:0;pointer-events:none';document.body.append(host);
 await playPrivateBurn(host,180,400);
});
assert.equal(await page.locator('.private-burn').count(),1);
assert.equal(await page.locator('.private-burn').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
await page.waitForFunction(()=>privateSoundEvents.includes('breeze'));
assert.deepEqual(await page.evaluate(()=>privateSoundEvents),['chime','chime','chime','breeze']);
await page.waitForFunction(()=>!document.querySelector('.private-burn'));
assert.equal(await page.evaluate(()=>privateBurnRuns.size),0);
const cancellation=await page.evaluate(async()=>{
 const host=document.getElementById('privateBurnTestHost');
 await playPrivateBurn(host,180,400);await playPrivateBurn(host,180,400);
 const single=host.querySelectorAll('.private-burn').length;
 const el=host.querySelector('.private-burn');el.dispatchEvent(new AnimationEvent('animationend',{animationName:'pb-life'}));
 return {single,remaining:host.querySelectorAll('.private-burn').length,runs:privateBurnRuns.size};
});
assert.deepEqual(cancellation,{single:1,remaining:0,runs:0});
await page.evaluate(async()=>{
 document.body.classList.add('reduce-motion');
 await playPrivateBurn(document.getElementById('privateBurnTestHost'),180,400);
});
assert.equal(await page.locator('.private-burn.pb-calm').count(),1);
await page.evaluate(()=>{
 currentUser={uid:'outsider',getIdToken:async()=> 'outsider-token'};applyEquippedCosmetics();renderPersonalisationCosmetics();
});
assert.equal(await page.locator('.private-burn').count(),0);
assert.equal(await page.evaluate(()=>privateBurnConfig),null);
assert.equal(await page.evaluate(()=>equippedCosmetics.burnEffect),'default');
assert.equal(await page.locator('[data-equip-id="burn-private-keepsake"]').count(),0);
assert.equal(await page.evaluate(()=>loadPrivateBurnArt()),null);
const pooja=await page.evaluate(async()=>{
 currentUser={uid:'pAB2xxrFWMhUv6AYtJMP1nSxA5l1',getIdToken:async()=> 'pooja-token'};
 cosmeticCollectionUid=currentUser.uid;cosmeticPurchaseState={};serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()-1000;
 const early=privateBurnItem(PRIVATE_BURN_ID);
 serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()+1000;
 const locked=equipCosmetic('burnEffect',PRIVATE_BURN_ID,{preview:false,sync:false});
 const gift={itemId:PRIVATE_BURN_ID,fromUid:PRIVATE_TABLE_OWNER,fromName:'Amitk',privateGift:true,sentAt:PRIVATE_RELEASE_AT,cost:0};
 const mail=inboxItemHtml({...gift,type:'giftIn',id:'private_embers_20261016'});
 db={ref:()=>({once:async()=>({val:()=>gift}),set:async()=>{}})};
 callEconomy=async()=>({itemId:PRIVATE_BURN_ID,asDiamonds:false,diamonds:250});
 const claimed=await claimGift('private_embers_20261016');
 const equipped=equipCosmetic('burnEffect',PRIVATE_BURN_ID,{preview:false,sync:false});
 renderCollection();renderCosmeticShop();
 return {early,locked,mail,claimed,equipped};
});
assert.equal(pooja.early,null);assert.equal(pooja.locked,false);assert(pooja.claimed && pooja.equipped);
assert(pooja.mail.includes('Ember &amp; Tide') || pooja.mail.includes('Ember & Tide'));assert(pooja.mail.includes('Gifted by Amitk'));
assert.equal(await page.locator('[data-shop-row="burn-private-keepsake"],[data-coll-id="burn-private-keepsake"]').count(),0);
await page.evaluate(async()=>{
 audio._burnKit=()=>null;
 await playPrivateBurn(document.getElementById('privateBurnTestHost'),180,400);
 document.querySelector('.private-burn').style.animation='none';
});
await page.waitForFunction(()=>!document.querySelector('.private-burn'));
await page.evaluate(async()=>{
 await playPrivateBurn(document.getElementById('privateBurnTestHost'),180,400);
 currentUser=null;applyEquippedCosmetics();
});
assert.equal(await page.locator('.private-burn').count(),0);
assert.equal(await page.evaluate(()=>privateBurnRuns.size),0);
assert.equal(await page.evaluate(()=>privateBurnConfig),null);
assert.deepEqual(errors,[]);
console.log('PASS private burn: owner availability, private mailbox claim, no catalog/network leak, timed audio, reduced motion, animationend/cancel cleanup, account-switch and signout.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
