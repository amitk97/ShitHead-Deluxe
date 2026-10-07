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
 if(u.pathname==='/privateAvatarArt')return process.env.SH_PRIVATE_PREVIEW?route.fulfill({body:fs.readFileSync(process.env.SH_PRIVATE_PREVIEW),contentType:'image/png'}):route.fulfill({status:404,body:''});
 const sdk=u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
 if(sdk && process.env.SH_VIDEO_DEPS)return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/firebase',sdk[1])),contentType:'application/javascript'});
 if(sdk || u.pathname.includes('canvas-confetti'))return route.continue();
 return route.abort();
});
await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.ShFriendsLobby);

const result=await page.evaluate(async()=>{
 devTestSuiteRunning=true;resetHomeUI();window.shBootReveal();
 const id=PRIVATE_AVATAR_ID,uid='pAB2xxrFWMhUv6AYtJMP1nSxA5l1';
 currentUser={uid};cosmeticPurchaseState={[id]:{cost:0}};
 serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()-10000;
 renderPersonalisationAvatars();renderCollection();renderCosmeticShop();
 const early=document.querySelectorAll('[data-equip-id="'+id+'"],[data-coll-id="'+id+'"],[data-shop-row="'+id+'"]').length;
 const earlyEquip=equipCosmetic('avatar',id,{sync:false,preview:false});
 serverTimeOffsetMs=PRIVATE_RELEASE_AT-Date.now()+10000;
 const countsBefore=collectionCounts();
 cosmeticPurchaseState={};renderPersonalisationAvatars();
 const beforeClaim=document.querySelectorAll('[data-equip-id="'+id+'"]').length;
 const gift={itemId:id,fromUid:'11d84kCgSde82Xlu8k5U65OB9662',fromName:'Amitk',privateGift:true,sentAt:PRIVATE_RELEASE_AT,cost:0};
 const mail=inboxItemHtml({...gift,type:'giftIn',id:'test_private_gift'});
 db={ref:path=>({once:async()=>({val:()=>path.startsWith('gifts/')?gift:path.endsWith('/ownedCosmetics')?{[id]:{cost:0}}:path.endsWith('/equippedCosmetics')?{avatar:id}:{} }),set:async()=>{}})};
 callEconomy=async()=>({itemId:id,asDiamonds:false,diamonds:250});
 const claimed=await claimGift('test_private_gift');
 const claimUI=document.querySelectorAll('#personalisationAvatars [data-equip-id="'+id+'"]').length;
 const from=document.getElementById('giftOpenFrom').textContent;
 const equipped=equipCosmetic('avatar',id,{sync:false,preview:false});
 await loadCosmeticCollection(currentUser);
 const restored=equippedCosmetics.avatar;
 const countsAfter=collectionCounts();renderCollection();renderCosmeticShop();
 const excluded=!document.querySelector('[data-coll-id="'+id+'"],[data-shop-row="'+id+'"]') && !customAllItems('avatar').some(i=>i.id===id) && !COSMETIC_SHOP_ITEMS.some(i=>i.id===id);
 document.querySelectorAll('.fixed:not(.hidden)').forEach(el=>el.classList.add('hidden'));
 document.getElementById('themesModal').classList.remove('hidden');
 currentUser={uid:'outsider'};renderPersonalisationAvatars();
 const outsiderUI=document.querySelectorAll('#personalisationAvatars [data-equip-id="'+id+'"]').length;
 const outsiderEquip=equipCosmetic('avatar',id,{sync:false,preview:false});
 currentUser={uid:'11d84kCgSde82Xlu8k5U65OB9662'};renderPersonalisationAvatars();
 const senderUI=document.querySelectorAll('#personalisationAvatars [data-equip-id="'+id+'"]').length;
 document.getElementById('personalisationAvatars').scrollIntoView();
 return {early,earlyEquip,beforeClaim,claimed,claimUI,from,equipped,restored,countsBefore,countsAfter,excluded,outsiderUI,outsiderEquip,senderUI,mail};
});
assert.equal(result.early,0);assert.equal(result.earlyEquip,false);assert.equal(result.beforeClaim,0);
assert.equal(result.claimed,true);assert.equal(result.claimUI,1);assert.equal(result.from,'Gifted by Amitk');
assert.equal(result.equipped,true);assert.equal(result.restored,'avatar-private-keepsake');
assert.deepEqual(result.countsBefore,result.countsAfter);assert(result.excluded);
assert.equal(result.outsiderUI,0);assert.equal(result.outsiderEquip,false);assert.equal(result.senderUI,1);
assert(result.mail.includes('Gifted by Amitk') && !result.mail.includes('worth 💎'));
await page.screenshot({path:'/tmp/private-avatar-custom.png'});
assert.deepEqual(errors,[]);
console.log('PASS private avatar: hidden before release and claim, mailbox/open attribution, claim/equip/restore, only two accounts, excluded from shop/log/counts.');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
