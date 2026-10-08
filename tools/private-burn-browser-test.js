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
// Let Firebase finish its initial signed-out callback before injecting test accounts.
await page.waitForFunction(()=>authStateResolved);


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
await page.evaluate(async()=>{await loadPrivateBurnArt();document.getElementById('lobbyScreen').classList.add('hidden');syncLobbyOpen();});
for(const rank of ['10','7']){
 const initial=await page.evaluate(async rank=>{
  const wrap=document.getElementById('discardCardsWrapper');wrap.replaceChildren();
  wrap.append(createCardElement({id:'old-bottom',rank:'4',suit:'♣'}),createCardElement({id:'old-top',rank,suit:'♦'}));
  const layer=document.getElementById('burnFxLayer'),r=document.getElementById('discardPileContainer').getBoundingClientRect();
  triggerEquippedBurnEffect(r.left+r.width/2,r.top+r.height/2,{id:state.localPlayerId,cosmetics:{burnEffect:'default'}});
  await Promise.resolve();
  const face=layer.querySelector('.private-burn-card');
  return {text:face?.textContent,hidden:[...wrap.children].every(el=>getComputedStyle(el).visibility==='hidden'),ids:face?.querySelectorAll('[id],[data-card-id]').length,rootId:face?.getAttribute('data-card-id')};
 },rank);
 assert(initial.text.includes(rank));assert(initial.hidden);assert.equal(initial.ids,0);assert.equal(initial.rootId,null);
 // The game clears the real pile before the independent visual finishes.
 await page.evaluate(()=>{
  const wrap=document.getElementById('discardCardsWrapper');wrap.replaceChildren(createCardElement({id:'new-turn-card',rank:'K',suit:'♠'}));
  const face=document.querySelector('.private-burn-card'),a=face.getAnimations()[0];a.pause();a.currentTime=600;
 });
 assert.equal(await page.locator('#discardCardsWrapper > [data-card-id]').count(),1);
 const nextCard=await page.locator('#discardCardsWrapper > [data-card-id]').evaluate(el=>{const parents=[];for(let p=el;p;p=p.parentElement)parents.push({id:p.id,visibility:getComputedStyle(p).visibility,inline:p.style.visibility});return {visibility:getComputedStyle(el).visibility,parents,body:document.body.className};});
 assert.notEqual(nextCard.visibility,'hidden',JSON.stringify(nextCard));
 assert(await page.locator('.private-burn-card').evaluate(el=>Number(getComputedStyle(el).opacity)<1));
 await page.evaluate(()=>{clearPrivateBurnInHost(document.getElementById('burnFxLayer'));});
 assert.equal(await page.locator('.private-burn-card,.private-burn-pile').count(),0);
 assert.equal(await page.evaluate(()=>privateBurnRuns.size),0);
}
const rankedCard=await page.evaluate(async()=>{
 document.getElementById('discardCardsWrapper').replaceChildren();
 const host=document.getElementById('burnFxLayer');await playPrivateBurn(host,180,400,1,{rank:'Q',suit:'♥'});
 const face=host.querySelector('.private-burn-card'),text=face.textContent;
 clearPrivateBurnInHost(host);return text;
});
assert(rankedCard.includes('Q') && rankedCard.includes('♥'));
const restore=await page.evaluate(async()=>{
 const wrap=document.getElementById('discardCardsWrapper'),card=createCardElement({id:'restore-card',rank:'10',suit:'♠'});
 card.style.setProperty('transition','opacity 1s','important');wrap.replaceChildren(card);
 document.body.classList.add('reduce-motion');
 const host=document.getElementById('burnFxLayer');await playPrivateBurn(host,180,400);
 const duration=host.querySelector('.private-burn-card').getAnimations()[0].effect.getTiming().duration;
 clearPrivateBurnInHost(host);document.body.classList.remove('reduce-motion');wrap.replaceChildren();
 return {duration,visibility:card.style.visibility,transition:card.style.transition,priority:card.style.getPropertyPriority('transition')};
});
assert.deepEqual(restore,{duration:420,visibility:'',transition:'opacity 1s',priority:'important'});
await page.evaluate(()=>{document.getElementById('lobbyScreen').classList.remove('hidden');syncLobbyOpen();});
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
console.log('PASS private burn: owner availability, private mailbox claim, no catalog/network leak, timed audio, reduced motion, real 10/four-of-a-kind card dissolve, Ranked face, new-pile safety, animationend/cancel cleanup, account-switch and signout.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
