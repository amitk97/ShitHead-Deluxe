/* Responsive lobby and host/guest behavior, with network writes confined to an in-memory room. */
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']}: {})});
try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
let failArtworkRequests=1,artworkRetries=0;
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='game.local'){
  const file=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2'};
  return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]}):route.fulfill({status:404,body:''});
 }
 if(u.pathname==='/privateBackArt'){
  artworkRetries++;
  if(failArtworkRequests-->0)return route.fulfill({status:503,body:''});
  return route.fulfill({body:fs.existsSync(path.join(root,'functions/private-assets/back.webp'))?fs.readFileSync(path.join(root,'functions/private-assets/back.webp')):Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=','base64'),contentType:fs.existsSync(path.join(root,'functions/private-assets/back.webp'))?'image/webp':'image/png'});
 }
 if(u.pathname==='/privateTableArt'){
  artworkRetries++;
  if(u.searchParams.get('variant')==='wide' && failArtworkRequests-->0)return route.fulfill({status:503,body:''});
  return route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=','base64'),contentType:'image/png'});
 }
 if(u.pathname==='/privateAvatarArt')return process.env.SH_PRIVATE_PREVIEW?route.fulfill({body:fs.readFileSync(process.env.SH_PRIVATE_PREVIEW),contentType:'image/png'}):route.fulfill({status:404,body:''});
 const sdk=u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
 if(sdk && process.env.SH_VIDEO_DEPS)return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/firebase',sdk[1])),contentType:'application/javascript'});
 if(sdk || u.pathname.includes('canvas-confetti'))return route.continue();
 return route.abort();
});
await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.ShFriendsLobby);
await page.waitForFunction(()=>authStateResolved);



await page.evaluate(()=>{
 devTestSuiteRunning=true;resetHomeUI();window.shBootReveal();
 currentUser={uid:PRIVATE_TABLE_OWNER,getIdToken:async()=> 'owner-token'};
 cosmeticCollectionUid=currentUser.uid;cosmeticPurchaseState={[PRIVATE_BACK_ID]:{cost:0}};
 db={ref:()=>({set:async()=>{}})};
 applyEquippedCosmetics();renderPersonalisationCosmetics();renderCollection();renderCosmeticShop();
});
await page.waitForFunction(()=>!!privateBackUrl);
assert(artworkRetries>=2,'Transient artwork failure should retry');
assert.equal(await page.locator('#personalisationCardBacks [data-equip-id="back-private-keepsake"]').count(),1);
assert.equal(await page.locator('[data-shop-row="back-private-keepsake"],[data-coll-id="back-private-keepsake"]').count(),0);
assert(await page.evaluate(()=>equipCosmetic('cardBack',PRIVATE_BACK_ID,{preview:false,sync:false})));
assert.equal(await page.evaluate(()=>getShowcaseLoadout().cardBack),'default');
assert.equal(await page.evaluate(()=>getPublicCosmeticLoadout().cardBack),'default');
await page.evaluate(()=>openBigPreview(PRIVATE_BACK_ID));
assert.equal(await page.locator('#bigPreview .cosmetic-back-private-keepsake').count(),1);
assert(await page.locator('#bigPreview .cosmetic-back-private-keepsake').evaluate(el=>getComputedStyle(el).backgroundImage.includes('blob:')));
await page.evaluate(()=>{closeBigPreview();currentUser={uid:'pAB2xxrFWMhUv6AYtJMP1nSxA5l1',getIdToken:async()=> 'recipient-token'};cosmeticCollectionUid=currentUser.uid;serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()-60000;applyEquippedCosmetics();renderPersonalisationCosmetics();});
assert.equal(await page.evaluate(()=>ownedPrivateBacks().length),0);
assert.equal(await page.evaluate(()=>privateBackUrl),null);
assert.equal(await page.evaluate(()=>equippedCosmetics.cardBack),'default');
await page.evaluate(()=>{serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()+60000;cosmeticPurchaseState={};applyEquippedCosmetics();renderPersonalisationCosmetics();});
assert.equal(await page.locator('#personalisationCardBacks [data-equip-id="back-private-keepsake"]').count(),0,'Must open gift first');
const result=await page.evaluate(async()=>{
 const gift={itemId:PRIVATE_BACK_ID,fromUid:PRIVATE_TABLE_OWNER,fromName:'Amitk',privateGift:true,cost:0,sentAt:PRIVATE_RELEASE_AT};
 const before=collectionCounts();
 db={ref:()=>({once:async()=>({val:()=>gift}),set:async()=>{}})};
 callEconomy=async()=>({itemId:PRIVATE_BACK_ID,asDiamonds:false,diamonds:250});
 const claimed=await claimGift('private_promise_20261016');
 return {claimed,from:document.getElementById('giftOpenFrom').textContent,equipped:equipCosmetic('cardBack',PRIVATE_BACK_ID,{preview:false,sync:false}),before,after:collectionCounts()};
});
assert(result.claimed);assert(result.equipped);assert.equal(result.from,'Gifted by Amitk');assert.deepEqual(result.before,result.after);
await page.waitForFunction(()=>!!privateBackUrl);
await page.evaluate(()=>{currentUser={uid:'outsider'};applyEquippedCosmetics();renderPersonalisationCosmetics();});
assert.equal(await page.evaluate(()=>privateBackUrl),null);
assert.equal(await page.evaluate(()=>document.body.style.getPropertyValue('--private-back-art')),'');
assert.equal(await page.locator('#personalisationCardBacks [data-equip-id="back-private-keepsake"]').count(),0);
assert.equal(await page.evaluate(()=>equipCosmetic('cardBack',PRIVATE_BACK_ID,{preview:false,sync:false})),false);
assert.deepEqual(errors,[]);
console.log('PASS private back: immediate owner access, decoded art retry, portrait preview, timed recipient claim, mailbox attribution, equip, hidden catalogues/counts/public loadouts and account cleanup.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
