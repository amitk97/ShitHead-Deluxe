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
 cosmeticCollectionUid=PRIVATE_TABLE_OWNER;
 cosmeticPurchaseState={[PRIVATE_TABLE_ID]:{purchasedAt:Date.now(),privateGift:true}};
 db={ref:()=>({set:async()=>{}})};
 renderPersonalisationCosmetics();renderCollection();renderCosmeticShop();
});
assert(await page.locator('#personalisationTableThemes [data-equip-id="table-private-keepsake"]').count());
assert.equal(await page.locator('[data-shop-row="table-private-keepsake"],[data-coll-id="table-private-keepsake"]').count(),0);
assert(await page.evaluate(()=>equipCosmetic('tableTheme',PRIVATE_TABLE_ID,{preview:false,sync:false})));
assert.equal(await page.evaluate(()=>getShowcaseLoadout().tableTheme),'default');
assert.equal(await page.evaluate(()=>getPublicCosmeticLoadout().tableTheme),undefined);
for(const [width,height,variant] of [[360,800,'tall'],[390,844,'tall'],[430,932,'tall'],[390,664,'portrait'],[768,1024,'square'],[720,720,'square'],[1440,900,'wide'],[1920,1080,'wide'],[2560,1080,'wide']]){
 await page.setViewportSize({width,height});
 await page.evaluate(({width,height})=>{
  let host=document.getElementById('privateTestHost');
  if(!host){host=document.createElement('div');host.id='privateTestHost';document.body.append(host);}
  host.style.cssText=`position:fixed;inset:0;width:${width}px;height:${height}px;isolation:isolate;`;
  drawPrivateTable(host);
 },{width,height});
 await page.waitForFunction(v=>document.querySelector('#privateTestHost .private-table-scene')?.dataset.variant===v && !!document.querySelector('#privateTestHost img'),variant);
 const r=await page.locator('#privateTestHost img').boundingBox();assert.equal(r.width,width);assert.equal(r.height,height);
}
await page.evaluate(()=>{serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()-1000;currentUser={uid:'pAB2xxrFWMhUv6AYtJMP1nSxA5l1',getIdToken:async()=> 'pooja-token'};applyEquippedCosmetics();renderPersonalisationCosmetics();});
assert.equal(await page.locator('.private-table-scene').count(),0);
assert.equal(await page.locator('[data-equip-id="table-private-keepsake"]').count(),0);
assert.equal(await page.evaluate(()=>equipCosmetic('tableTheme',PRIVATE_TABLE_ID,{sync:false,preview:false})),false);
assert.equal(await page.evaluate(()=>equippedCosmetics.tableTheme),'default');
const claimed=await page.evaluate(async()=>{
 serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()+1000;
 cosmeticCollectionUid=currentUser.uid;cosmeticPurchaseState={};renderPersonalisationCosmetics();
 const gift={itemId:PRIVATE_TABLE_ID,fromUid:PRIVATE_TABLE_OWNER,fromName:'Amitk',privateGift:true,sentAt:PRIVATE_RELEASE_AT,cost:0};
 const mail=inboxItemHtml({...gift,type:'giftIn',id:'private_sunset_20261016'});
 const preclaim=equipCosmetic('tableTheme',PRIVATE_TABLE_ID,{preview:false,sync:false});
 db={ref:()=>({once:async()=>({val:()=>gift}),set:async()=>{}})};
 callEconomy=async()=>({itemId:PRIVATE_TABLE_ID,asDiamonds:false,diamonds:250});
 const result=await claimGift('private_sunset_20261016');
 const from=document.getElementById('giftOpenFrom').textContent;
 renderCollection();renderCosmeticShop();
 const visible=document.querySelectorAll('#personalisationTableThemes [data-equip-id="table-private-keepsake"]').length;
 const hidden=document.querySelectorAll('[data-shop-row="table-private-keepsake"],[data-coll-id="table-private-keepsake"]').length;
 const equipped=equipCosmetic('tableTheme',PRIVATE_TABLE_ID,{preview:false,sync:false});
 return {result,from,mail,preclaim,visible,hidden,equipped};
});
assert(claimed.result);assert.equal(claimed.from,'Gifted by Amitk');assert(claimed.mail.includes('Our Sunset'));assert(claimed.mail.includes('Gifted by Amitk'));
assert.equal(claimed.preclaim,false);assert.equal(claimed.visible,1);assert.equal(claimed.hidden,0);assert(claimed.equipped);
await page.evaluate(()=>{currentUser={uid:'outsider'};applyEquippedCosmetics();renderPersonalisationCosmetics();});
assert.equal(await page.locator('[data-equip-id="table-private-keepsake"]').count(),0);
assert.equal(await page.evaluate(()=>equipCosmetic('tableTheme',PRIVATE_TABLE_ID,{sync:false,preview:false})),false);
await page.evaluate(()=>{currentUser=null;applyEquippedCosmetics();});
assert.equal(await page.evaluate(()=>privateTableUrls.size),0);
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS table account isolation, no public catalogue/showcase/room leaks, responsive portrait/square/wide layouts, sign-out cleanup.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
