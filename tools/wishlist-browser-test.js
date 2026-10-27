'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),review=path.join(root,'.impeccable/review');
const sdk=process.env.SH_VIDEO_DEPS;
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='wishlist.local'){
   const p=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!p.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
   return fs.existsSync(p)?route.fulfill({body:fs.readFileSync(p),contentType:mime[path.extname(p)]||'application/octet-stream'}):route.fulfill({status:404,body:''});
  }
  const file=url.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/)?.[1];
  if(file)return sdk?route.fulfill({body:fs.readFileSync(path.join(sdk,'node_modules/firebase',file)),contentType:'application/javascript'}):route.continue();
  if(url.pathname.includes('canvas-confetti'))return sdk?route.fulfill({body:fs.readFileSync(path.join(sdk,'node_modules/canvas-confetti/dist/confetti.browser.js')),contentType:'application/javascript'}):route.continue();
  return route.abort(); // All account data below is synthetic and stays in memory.
 });
 async function boot(data={}){
  await page.goto('https://wishlist.local/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof wishlistStore!=='undefined'&&authStateResolved);
  await page.evaluate(seed=>{
   devTestSuiteRunning=true;window.shBootReveal?.();
   document.querySelectorAll('.fixed:not(.hidden)').forEach(el=>{if(!['lobbyScreen','gameTable'].includes(el.id))el.classList.add('hidden');});
   loadCosmeticCollection=()=>Promise.resolve();loadSavedLoadouts=()=>Promise.resolve();
   const clouds=new Map();window.wishWrites=[];
   window.wishCloud=uid=>{
    if(clouds.has(uid))return clouds.get(uid);
    let values={...(seed[uid]||{})};const listeners=new Set();
    const cloud={fail:false,readFail:false,on(_,fn,error){listeners.add(fn);queueMicrotask(()=>cloud.readFail?error(new Error('read unavailable')):fn({val:()=>({...values})}));},off(_,fn){listeners.delete(fn);},
     update(delta){wishWrites.push({uid,delta:{...delta}});if(cloud.fail)return Promise.reject(new Error('offline'));
      for(const [id,value]of Object.entries(delta))value===null?delete values[id]:values[id]=value;
      cloud.emit();return Promise.resolve();},emit(){for(const fn of listeners)fn({val:()=>({...values})});},
     replace(next){values={...next};cloud.emit();},get data(){return {...values};}};
    clouds.set(uid,cloud);return cloud;
   };
   db={ref:p=>{const m=p.match(/^publicProfiles\/([^/]+)\/wishlist$/);if(!m)throw Error('Unexpected backend path: '+p);return wishCloud(m[1]);}};
   currentUser=null;wishlistStore.setAccount(null);shopTab='Card Backs';shopFilter='all';collapsedShopCategories.clear();
   document.getElementById('shopModal').classList.remove('hidden');renderCosmeticShop();
  },data);
 }
 const signin=uid=>page.evaluate(async uid=>{currentUser={uid};await loadWishlist(currentUser);},uid);
 await boot();
 const item=await page.evaluate(()=>COSMETIC_SHOP_ITEMS.find(i=>!i.season&&i.category==='Card Backs').id);
 const heart=page.locator(`#shopModal [data-wish-item="${item}"]`);
 const box=await heart.boundingBox();assert.equal(box.width,16,'compact borderless heart button');
 assert(await heart.evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.left-3,r.top+r.height/2);return el===target||el.contains(target);}), 'invisible hit area remains clickable outside the visible circle');
 assert.equal(await heart.evaluate(el=>parseFloat(getComputedStyle(el,'::after').width)),32,'32px hit area is retained');
 await heart.focus();await page.keyboard.press('Space');assert.equal(await heart.getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>wishWrites.length),0,'guest heart does not write to the account');
 await page.locator('[data-shop-filter="wishlist"]').click();assert.equal(await page.locator('[data-shop-filter="wishlist"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#cosmeticShopList [data-shop-row]').count(),1);
 assert.match(await page.locator('#shopWishlistStatus').innerText(),/Saved on this device/);
 assert.equal(await page.locator('#shopNameTokenCard').isVisible(),false);
 await boot();assert(await page.evaluate(id=>isWished(id),item),'guest wishlist survives a real reload');
 console.log('PASS guest keyboard heart, accessible target, filter, no account writes and real reload');

 await signin('alice');await page.waitForFunction(()=>wishlistStore.status==='synced');
 assert.equal(await page.evaluate(id=>wishCloud('alice').data[id],item),true,'explicit guest wish transfers to the first account');
 const other=await page.evaluate(id=>COSMETIC_SHOP_ITEMS.find(i=>!i.season&&i.id!==id&&i.category==='Card Backs').id,item);
 await page.evaluate(({id})=>wishCloud('bob').replace({[id]:true}),{id:other});await signin('bob');
 assert.deepEqual(await page.evaluate(()=>[...wishlistIds]),[other]);
 await page.evaluate(id=>wishCloud('alice').replace({[id]:true}),item);
 assert.deepEqual(await page.evaluate(()=>[...wishlistIds]),[other],'late data from Alice cannot enter Bob’s list');
 console.log('PASS sign-in transfer and account isolation');

 await page.evaluate(()=>{wishCloud('read-error-account').readFail=true;shopFilter='wishlist';});
 await signin('read-error-account');assert.equal(await page.evaluate(()=>wishlistStore.status),'error');
 await page.evaluate(id=>toggleWishlist(id),item);
 assert.equal(await page.evaluate(()=>wishlistStore.status),'error','a new edit preserves the read-failure state');
 assert(await page.locator('[data-wish-retry]').isVisible(),'read failure retains a visible recovery control after editing');
 assert.match(await page.locator('#shopWishlistStatus').innerText(),/sync failed/);
 fs.mkdirSync(review,{recursive:true});await page.screenshot({path:path.join(review,'mobile-read-error.png')});
 await page.evaluate(()=>wishCloud('read-error-account').readFail=false);await page.locator('[data-wish-retry]').click();
 await page.waitForFunction(()=>wishlistStore.status==='synced');assert.equal(await page.evaluate(id=>wishCloud('read-error-account').data[id],item),true);
 await signin('bob');
 console.log('PASS edits after a failed initial read keep Retry visible and recover');

 await page.evaluate(()=>{shopFilter='wishlist';shopTab=SHOP_ALL_TAB;renderCosmeticShop();wishCloud('bob').fail=true;});
 const removing=page.locator(`#shopModal [data-wish-item="${other}"]`);await removing.focus();await page.keyboard.press('Space');
 await page.waitForFunction(()=>wishlistStore.status==='error');
 assert.equal(await page.evaluate(id=>isWished(id),other),false);
 assert.equal(await page.evaluate(id=>wishCloud('bob').data[id],other),true,'failed removal remains pending');
 assert(await page.locator('[data-wish-retry]').isVisible());
 assert.equal(await page.locator('[data-shop-filter="wishlist"]').evaluate(el=>el===document.activeElement),true,'removing a focused heart retains useful keyboard focus');
 const savedCloud=await page.evaluate(()=>wishCloud('bob').data);
 await boot({bob:savedCloud});await signin('bob');await page.waitForFunction(()=>wishlistStore.status==='synced');
 assert(!await page.evaluate(id=>isWished(id),other),'offline removal survives reload and server reconciliation');
 assert.equal(await page.evaluate(id=>wishCloud('bob').data[id],other),undefined);
 await page.evaluate(id=>{wishCloud('bob').fail=true;toggleWishlist(id);},other);await page.waitForFunction(()=>wishlistStore.status==='error');
 await page.evaluate(()=>wishCloud('bob').fail=false);await page.locator('[data-wish-retry]').click();
 await page.waitForFunction(()=>wishlistStore.status==='synced');assert.equal(await page.evaluate(id=>wishCloud('bob').data[id],other),true);
 console.log('PASS failed sync, keyboard focus, persisted offline removal and manual retry');

 const seasonal=await page.evaluate(()=>COSMETIC_SHOP_ITEMS.find(i=>i.season&&!isSeasonalItemBuyable(i)).id);
 await page.evaluate(id=>{shopTab=SHOP_ALL_TAB;shopFilter='wishlist';toggleWishlist(id);renderCosmeticShop();},seasonal);
 await page.waitForFunction(()=>wishlistStore.status==='synced');
 assert(await page.locator(`[data-shop-row="${seasonal}"]`).isVisible(),'saved seasonal item remains visible while closed');
 assert(await page.locator(`[data-shop-row="${seasonal}"] [data-season-locked]`).isVisible(),'saving it does not unlock buying');
 await page.evaluate(id=>wishCloud('bob').replace({[id]:true}),item);
 assert(await page.evaluate(id=>isWished(id),item));assert(!await page.evaluate(id=>isWished(id),other),'remote removals are not resurrected');
 await page.evaluate(()=>{currentUser=null;wishlistStore.setAccount(null);});assert.equal(await page.evaluate(()=>wishlistIds.size),0,'sign-out does not expose the signed-in account list');
 console.log('PASS closed-season visibility, purchase lock, remote changes and sign-out');

 // One batched visual review: actual local runtime, with a synthetic account backend.
 await signin('review-account');await page.evaluate(()=>{
  const saved=[COSMETIC_SHOP_ITEMS.find(i=>i.id==='back-midnight'),COSMETIC_SHOP_ITEMS.find(i=>i.id==='avatar-ldn-guard'),COSMETIC_SHOP_ITEMS.find(i=>i.id==='table-mum-marine')].filter(Boolean);
  wishCloud('review-account').replace(Object.fromEntries(saved.map(i=>[i.id,true])));
  shopTab=SHOP_ALL_TAB;shopFilter='wishlist';renderCosmeticShop();
 });
 fs.mkdirSync(review,{recursive:true});
 for(const [width,height,name]of [[320,568,'phone-320'],[390,844,'mobile'],[768,1024,'tablet'],[1440,900,'desktop']]){
  await page.setViewportSize({width,height});await page.waitForTimeout(350);
  await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('#shopModal .overflow-y-auto').scrollTop=0;});
  const horizontal=await page.locator('#shopModal > div').evaluate(el=>el.scrollWidth>el.clientWidth+1);assert(!horizontal,'no Shop horizontal overflow at '+width);
  await page.screenshot({path:path.join(review,name+'.png')});
 }
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(350);
 await page.evaluate(()=>{wishCloud('review-account').fail=true;toggleWishlist(COSMETIC_SHOP_ITEMS.find(i=>i.id==='back-midnight').id);});
 await page.waitForFunction(()=>wishlistStore.status==='error');await page.screenshot({path:path.join(review,'mobile-sync-error.png')});
 await page.evaluate(()=>{currentUser=null;wishlistStore.setAccount(null);shopFilter='wishlist';shopTab=SHOP_ALL_TAB;renderCosmeticShop();});
 await page.screenshot({path:path.join(review,'mobile-empty.png')});
 assert.deepEqual(errors,[],'no browser exceptions');console.log('PASS responsive captures, empty/error states and no browser exceptions');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
