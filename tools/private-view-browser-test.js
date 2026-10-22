/* Opponents see what AmitK and Pooja wear (v401): seat card back (art fetched with ?of=), burn viewer, player-card showcase. */
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']}: {})});
try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],asked=[];
await page.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const st=document.createElement('style');st.textContent='#eventPopupModal,#homeEventChip,#homeSeasonChip{display:none!important}';document.head.appendChild(st);});});
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='game.local'){
  const file=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2'};
  return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]}):route.fulfill({status:404,body:''});
 }
 if(u.pathname==='/privateBackArt'){asked.push(u.searchParams.get('of'));return route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=','base64'),contentType:'image/png'});}
 const sdk=u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
 if(sdk && process.env.SH_VIDEO_DEPS)return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/firebase',sdk[1])),contentType:'application/javascript'});
 if(sdk || u.pathname.includes('canvas-confetti'))return route.continue();
 return route.abort();
});
await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.ShFriendsLobby);
await page.waitForFunction(()=>authStateResolved);
// An ordinary player (not AmitK, not Pooja) looking at a table with AmitK and a spoofer.
await page.evaluate(()=>{
 devTestSuiteRunning=true;resetHomeUI();window.shBootReveal();
 currentUser={uid:'someone-else',getIdToken:async()=>'t'};
 cosmeticCollectionUid=currentUser.uid;cosmeticPurchaseState={};
 state.localPlayerId='me';
 state.players=[{id:'me',uid:'someone-else',name:'Me',cosmetics:{}},
  {id:'amit',uid:PRIVATE_TABLE_OWNER,name:'Amit',cosmetics:{cardBack:PRIVATE_BACK_ID,burnEffect:PRIVATE_BURN_ID}},
  {id:'fake',uid:'spoofer',name:'Fake',cosmetics:{cardBack:PRIVATE_BACK_ID,burnEffect:PRIVATE_BURN_ID}}];
 ensurePrivateViews(state.players);
});
await page.waitForFunction(()=>!!privateBackViewUrl);
assert.deepEqual(await page.evaluate(()=>document.body.style.getPropertyValue('--private-back-art-view').startsWith('url(')),true);
assert.deepEqual(asked,[await page.evaluate(()=>PRIVATE_TABLE_OWNER)],'art is asked for AmitK only, never for the spoofer');
assert.equal(await page.evaluate(()=>getCosmeticBackClass(PRIVATE_BACK_ID)),'cosmetic-back-private-keepsake');
// The player's own equipping stays closed to them.
assert.equal(await page.evaluate(()=>isSupportedCosmetic('cardBack',PRIVATE_BACK_ID)),false);
assert.equal(await page.evaluate(()=>ownedPrivateBacks().length+ownedPrivateBurns().length+ownedPrivateTables().length),0);
// Burn: viewer only for AmitK/Pooja seats.
assert.equal(await page.evaluate(()=>{burnFxPlayer=state.players[1];return privateBurnViewer();}),await page.evaluate(()=>PRIVATE_TABLE_OWNER));
assert.equal(await page.evaluate(()=>{burnFxPlayer=state.players[2];return privateBurnViewer();}),null);
assert.equal(await page.evaluate(()=>{burnFxPlayer=state.players[1];return burnEffectIdFor(state.players[1]);}),'burn-private-keepsake');
assert.equal(await page.evaluate(()=>burnEffectIdFor(state.players[2])),'default','a spoofer gets the default burn');
// Player card showcase.
const card=await page.evaluate(()=>{
 const sc={cardBack:PRIVATE_BACK_ID,burnEffect:PRIVATE_BURN_ID,tableTheme:PRIVATE_TABLE_ID};
 return {amit:showcaseHtml(sc,{owner:PRIVATE_TABLE_OWNER}),fake:showcaseHtml(sc,{owner:'spoofer'}),none:showcaseHtml(sc,{})};
});
for(const name of ['Sunset Promise','Ember &amp; Tide','Our Sunset'])assert(card.amit.includes(name)||card.amit.includes(name.replace('&amp;','&')),'AmitK card shows '+name);
for(const key of ['fake','none'])assert(!/Sunset Promise|Ember|Our Sunset/.test(card[key]),key+' card shows no private item');
assert.equal(await page.evaluate(()=>privateViewing()),false,'the viewing flag is cleared again');
// The AmitK unlock switch: only his account sees it; test-owned items count as owned, tagged, and vanish when the server clears them.
const sw=await page.evaluate(async()=>{
 const out={};
 currentUser={uid:'someone-else',email:'x@example.com',getIdToken:async()=>'t'};updateHamburgerAccountLabel();
 out.otherHidden=document.getElementById('menuUnlockAllBtn').classList.contains('hidden');
 currentUser={uid:'amit-uid',email:'amirk2197@googlemail.com',getIdToken:async()=>'t'};updateHamburgerAccountLabel();
 out.amitShown=!document.getElementById('menuUnlockAllBtn').classList.contains('hidden');
 let testOwned={'back-lvl-inferno':true,'avatar-twos':true};
 db={ref:path=>({once:async()=>({val:()=>path.endsWith('/testOwned')?testOwned:path.endsWith('/ownedCosmetics')?{'avatar-twos':{cost:0,purchasedAt:5}}:null})})};
 cosmeticCollectionUid=null;cosmeticPurchaseState={};
 await loadCosmeticCollection(currentUser);
 out.on={label:document.getElementById('menuUnlockAllLabel').textContent,test:cosmeticPurchaseState['back-lvl-inferno']?.testUnlock===true,real:cosmeticPurchaseState['avatar-twos'].testUnlock===undefined};
 testOwned=null;
 await loadCosmeticCollection(currentUser);
 out.off={label:document.getElementById('menuUnlockAllLabel').textContent,gone:!cosmeticPurchaseState['back-lvl-inferno'],kept:!!cosmeticPurchaseState['avatar-twos']};
 return out;
});
assert.equal(sw.otherHidden,true);assert.equal(sw.amitShown,true);
assert.deepEqual(sw.on,{label:'Unlock All Cosmetics: On',test:true,real:true});
assert.deepEqual(sw.off,{label:'Unlock All Cosmetics: Off',gone:true,kept:true});
assert.deepEqual(errors,[]);
console.log('PASS private view: opponents see AmitK/Pooja private items (art by ?of=, burn viewer, player card), spoofers and non-owners do not.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
