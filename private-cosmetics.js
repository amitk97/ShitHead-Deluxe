// Private gifts are deliberately separate from shop and collection catalogues.
const PRIVATE_AVATAR_ID = 'avatar-private-keepsake';
const PRIVATE_RELEASE_AT = Date.parse('2026-10-16T22:00:00Z');
const PRIVATE_ACCOUNT_IDS = new Set(['11d84kCgSde82Xlu8k5U65OB9662','pAB2xxrFWMhUv6AYtJMP1nSxA5l1']);
const PRIVATE_AVATAR_ITEM = Object.freeze({id:PRIVATE_AVATAR_ID,name:'Forever',category:'Avatars',cost:0,privateGift:true,animated:true});
function privateAvatarItem(id) {
  return id === PRIVATE_AVATAR_ID && (typeof serverNow === 'function' ? serverNow() : Date.now()) >= PRIVATE_RELEASE_AT ? PRIVATE_AVATAR_ITEM : null;
}
function privateGiftItem(id) {
  if (id === PRIVATE_BURN_ID) return privateBurnItem(id);
  if (id === PRIVATE_TABLE_ID) return privateTableItem(id);
  return PRIVATE_ACCOUNT_IDS.has(currentUser?.uid) ? privateAvatarItem(id) : null;
}
function ownedPrivateAvatars() {
  const item = privateGiftItem(PRIVATE_AVATAR_ID);
  return item && cosmeticPurchaseState[item.id] ? [item] : [];
}
function giftCosmeticItem(id) {
  return COSMETIC_SHOP_ITEMS.find(item => item.id === id) || privateGiftItem(id);
}
function privateAvatarSvg() {
  if (!privateAvatarItem(PRIVATE_AVATAR_ID)) return '';
  const url='https://europe-west1-shithead-pro.cloudfunctions.net/privateAvatarArt';
  return `<svg viewBox="0 0 64 64" class="avatar-svg" aria-hidden="true"><image href="${url}" x="0" y="0" width="64" height="64"/><g class="private-avatar-glint" fill="#fff7c2"><path d="M34 32l.7 2.6 2.6.7-2.6.7-.7 2.6-.7-2.6-2.6-.7 2.6-.7z"/><circle cx="16" cy="17" r=".8"/><circle cx="50" cy="42" r=".7"/></g></svg>`;
}
(function(){
 const style=document.createElement('style');
 style.textContent='@keyframes private-avatar-glint{0%,60%,100%{opacity:.15}75%{opacity:1}}.private-avatar-glint{animation:private-avatar-glint 4s ease-in-out infinite}.av-still .private-avatar-glint,body.app-hidden .private-avatar-glint{animation-play-state:paused}body.reduce-motion .private-avatar-glint{animation:none}@media(prefers-reduced-motion:reduce){.private-avatar-glint{animation:none}}';
 document.head.appendChild(style);
})();

const PRIVATE_TABLE_ID = 'table-private-keepsake';
const PRIVATE_TABLE_OWNER = '11d84kCgSde82Xlu8k5U65OB9662';
const PRIVATE_TABLE_ITEM = Object.freeze({id:PRIVATE_TABLE_ID,name:'Our Sunset',category:'Table Themes',cost:0,privateGift:true});
const privateTableUrls = new Map(), privateTableRequests = new Map();
let privateTableSession = 0, privateTableAssetUid = null;
function privateTableItem(id) {
  const uid=currentUser?.uid;
  const available=uid===PRIVATE_TABLE_OWNER || (uid==='pAB2xxrFWMhUv6AYtJMP1nSxA5l1' && (typeof serverNow==='function'?serverNow():Date.now())>=PRIVATE_RELEASE_AT);
  return id === PRIVATE_TABLE_ID && available ? PRIVATE_TABLE_ITEM : null;
}
function ownedPrivateTables() {
  return currentUser?.uid === cosmeticCollectionUid && privateTableItem(PRIVATE_TABLE_ID) && cosmeticPurchaseState[PRIVATE_TABLE_ID] ? [PRIVATE_TABLE_ITEM] : [];
}
async function ensurePrivateTableOwnership(user) {
  if (user?.uid !== PRIVATE_TABLE_OWNER) return;
  await callEconomy('privateTableAccess');
}
function clearPrivateTableForOtherAccounts() {
  const uid=currentUser?.uid || null;
  if (privateTableAssetUid===uid && ownedPrivateTables().length) return;
  privateTableAssetUid=uid;
  ++privateTableSession;
  for (const url of privateTableUrls.values()) URL.revokeObjectURL(url);
  privateTableUrls.clear(); privateTableRequests.clear();
  document.querySelectorAll('.private-table-scene').forEach(el => el.remove());
}
function privateTableVariant(width,height) {
  const ratio=width/height;
  return ratio < .52 ? 'tall' : ratio < .65 ? 'portrait' : ratio < 1.1 ? 'square' : 'wide';
}
async function loadPrivateTableArt(variant) {
  if(privateTableAssetUid!==currentUser?.uid)clearPrivateTableForOtherAccounts();
  if (!ownedPrivateTables().length) return null;
  if (privateTableUrls.has(variant)) return privateTableUrls.get(variant);
  if (privateTableRequests.has(variant)) return privateTableRequests.get(variant);
  const user=currentUser, session=privateTableSession;
  const task=(async()=>{
    const token=await user.getIdToken();
    const response=await fetch('https://europe-west1-shithead-pro.cloudfunctions.net/privateTableArt?variant='+variant,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    if (!response.ok) throw new Error('Artwork unavailable');
    const blob=await response.blob();
    if (currentUser?.uid!==user.uid || session!==privateTableSession) return null;
    const url=URL.createObjectURL(blob); privateTableUrls.set(variant,url); return url;
  })();
  privateTableRequests.set(variant,task);
  try { return await task; } finally { if(privateTableRequests.get(variant)===task)privateTableRequests.delete(variant); }
}
function drawPrivateTable(host) {
  host.querySelector(':scope > .responsive-scene:not(.private-table-scene)')?.remove();
  if (!ownedPrivateTables().length) {host.querySelector(':scope > .private-table-scene')?.remove();return;}
  const W=host.clientWidth,H=host.clientHeight;if(!W||!H)return;
  const variant=privateTableVariant(W,H);
  let layer=host.querySelector(':scope > .private-table-scene');
  if(!layer){layer=document.createElement('div');layer.className='responsive-scene private-table-scene';layer.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;background:#644c65';host.prepend(layer);}
  layer.dataset.variant=variant;
  loadPrivateTableArt(variant).then(url=>{
    if(!url || !layer.isConnected || layer.dataset.variant!==variant || !ownedPrivateTables().length)return;
    if(layer.dataset.url===url)return;
    layer.dataset.url=url;
    const image=document.createElement('img');image.src=url;image.alt='';
    // Crop only the extended margins at ordinary screen ratios. Extreme
    // aspect ratios use contain to preserve the couple and full heart.
    image.style.cssText='width:100%;height:100%;display:block;object-position:center;object-fit:'+(W/H>=.35 && W/H<=21/9?'cover':'contain');
    layer.replaceChildren(image);
  }).catch(()=>{});
}
(function(){
  const original=ShTableScenes.draw;
  ShTableScenes.draw=function(host,id){
    if(id===PRIVATE_TABLE_ID && host){host.querySelector(':scope > .responsive-scene:not(.private-table-scene)')?.remove();drawPrivateTable(host);return;}
    host?.querySelector(':scope > .private-table-scene')?.remove();original(host,id);
  };
})();

const PRIVATE_BURN_ID='burn-private-keepsake';
const PRIVATE_BURN_ITEM=Object.freeze({id:PRIVATE_BURN_ID,name:'Ember & Tide',category:'Burn Effects',cost:0,privateGift:true,tones:['#6e1535','#e9b46c','#ffe7bd']});
let privateBurnUid=null,privateBurnSession=0,privateBurnConfig=null,privateBurnRequest=null;
const privateBurnRuns=new Map(),privateBurnPending=new WeakMap();
function privateBurnItem(id){
 const uid=currentUser?.uid;
 return id===PRIVATE_BURN_ID && (uid===PRIVATE_TABLE_OWNER || (uid==='pAB2xxrFWMhUv6AYtJMP1nSxA5l1' && serverNow()>=PRIVATE_RELEASE_AT)) ? PRIVATE_BURN_ITEM : null;
}
function ownedPrivateBurns(){
 return currentUser?.uid===cosmeticCollectionUid && privateBurnItem(PRIVATE_BURN_ID) && cosmeticPurchaseState[PRIVATE_BURN_ID] ? [PRIVATE_BURN_ITEM] : [];
}
function clearPrivateBurnInHost(host){
 privateBurnPending.delete(host);
 for(const [root,stop] of privateBurnRuns)if(root.parentNode===host)stop();
}
function clearPrivateBurnForOtherAccounts(){
 const uid=currentUser?.uid || null;
 if(privateBurnUid!==uid || !ownedPrivateBurns().length){
  privateBurnUid=uid;++privateBurnSession;privateBurnConfig=null;privateBurnRequest=null;
  for(const stop of privateBurnRuns.values())stop();
 }
 if(ownedPrivateBurns().length)loadPrivateBurnArt().catch(()=>{});
}
async function loadPrivateBurnArt(){
 if(privateBurnUid!==currentUser?.uid)clearPrivateBurnForOtherAccounts();
 if(!ownedPrivateBurns().length)return null;
 if(privateBurnConfig)return privateBurnConfig;
 if(privateBurnRequest)return privateBurnRequest;
 const user=currentUser,session=privateBurnSession;
 const task=(async()=>{
  const token=await user.getIdToken();
  const response=await fetch('https://europe-west1-shithead-pro.cloudfunctions.net/privateBurnArt',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)throw Error('Effect unavailable');
  const config=await response.json();
  if(session!==privateBurnSession || currentUser?.uid!==user.uid || !ownedPrivateBurns().length)return null;
  if(typeof config.css!=='string' || typeof config.html!=='string')throw Error('Invalid effect');
  privateBurnConfig=config;return config;
 })();
 privateBurnRequest=task;
 try{return await task;}finally{if(privateBurnRequest===task)privateBurnRequest=null;}
}
// Snapshot the real top card before the game's 600ms pile clear. Only the
// snapshot dissolves; restoring old nodes never changes newly played cards.
function privateBurnPile(host,x,y,scale,calm,card){
 const onTable=host.id==='burnFxLayer';
 const originals=onTable?[...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')]:[];
 const top=originals.filter(el=>el.offsetWidth).pop();
 if(onTable && !top && !card)return ()=>{};
 const hr=host.getBoundingClientRect(),r=top?.getBoundingClientRect();
 const size=Math.max(48,Math.min(100,(host.clientHeight||160)*.5))*scale;
 const W=top?.offsetWidth || (onTable?document.getElementById('discardPileContainer')?.offsetWidth:size) || size;
 const H=top?.offsetHeight || W;
 const cx=r?r.left+r.width/2-hr.left:x,cy=r?r.top+r.height/2-hr.top:y;
 const src=top || createCardElement({id:'private-burn-copy',rank:card?.rank || '10',suit:card?.suit || '♠'});
 const face=src.cloneNode(true),base=top?getComputedStyle(top).transform:'none';
 for(const el of [face,...face.querySelectorAll('[id],[data-card-id]')]){el.removeAttribute('id');el.removeAttribute('data-card-id');}
 face.classList.add('private-burn-card');
 face.style.cssText=`position:absolute;left:${cx-W/2}px;top:${cy-H/2}px;width:${W}px;height:${H}px;margin:0;visibility:visible!important;transition:none!important;animation:none!important;pointer-events:none;opacity:1;transform:${base};`;
 const root=document.createElement('div');root.className='private-burn-pile';root.setAttribute('aria-hidden','true');
 root.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:19;';
 const style=document.createElement('style');style.textContent='.private-burn-pile *{pointer-events:none!important}';root.append(style,face);
 const hidden=[...originals,...(onTable?document.querySelectorAll('#pileZone .empty-zone-pill'):host.querySelectorAll('.shop-burn-core'))];
 const previous=hidden.map(el=>({el,visibility:el.style.getPropertyValue('visibility'),vp:el.style.getPropertyPriority('visibility'),transition:el.style.getPropertyValue('transition'),tp:el.style.getPropertyPriority('transition')}));
 hidden.forEach(el=>{el.style.setProperty('transition','none','important');el.style.setProperty('visibility','hidden','important');});
 host.append(root);
 const animations=[];let stopped=false;
 const stop=()=>{
  if(stopped)return;stopped=true;clearTimeout(safety);animations.forEach(a=>a.cancel());root.remove();privateBurnRuns.delete(root);
  document.removeEventListener('visibilitychange',hiddenPage);
  for(const old of previous){for(const [prop,value,priority] of [['visibility',old.visibility,old.vp],['transition',old.transition,old.tp]])if(value)old.el.style.setProperty(prop,value,priority);else old.el.style.removeProperty(prop);}
 };
 const hiddenPage=()=>{if(document.hidden)stop();};
 document.addEventListener('visibilitychange',hiddenPage);privateBurnRuns.set(root,stop);
 const safety=setTimeout(stop,3500);
 if(typeof face.animate==='function'){
  const transform=base==='none'?'':base;
  const frames=calm?[{opacity:1},{opacity:0}]:[
   {opacity:1,filter:'brightness(1) blur(0px)',clipPath:'inset(0% 0% 0% 0%)',transform:base},
   {offset:.25,opacity:1,filter:'brightness(1.35) drop-shadow(0 0 9px #eebb76) blur(0px)',clipPath:'inset(0% 0% 0% 0%)',transform:base},
   {offset:.6,opacity:.7,filter:'brightness(1.55) drop-shadow(0 0 13px #dfa0b6) blur(2px)',clipPath:'inset(0% 0% 38% 0%)',transform:transform+' translateY(-7px) scale(.98)'},
   {opacity:0,filter:'brightness(1.7) blur(9px)',clipPath:'inset(0% 0% 100% 0%)',transform:transform+' translateY(-22px) scale(.92)'}];
  const a=face.animate(frames,{duration:calm?420:800,easing:'ease-in-out',fill:'forwards'});a.onfinish=()=>face.remove();animations.push(a);
  if(!calm)for(let i=0;i<12;i++){
   const mote=document.createElement('i'),dx=(i%6-2.5)*W/7,dy=-H*(.45+(i%4)*.12);
   mote.style.cssText=`position:absolute;left:${cx+dx}px;top:${cy+H*.2}px;width:4px;height:4px;border-radius:50%;background:${i%2?'#eebb76':'#d985a0'};box-shadow:0 0 8px 2px #eebb76;opacity:0;`;
   root.append(mote);
   const a=mote.animate([{opacity:0,transform:'translate(0,0)'},{offset:.25,opacity:.8},{opacity:0,transform:`translate(${-dx*.7}px,${dy}px) scale(.2)`}],{duration:540,delay:200+i*22,easing:'ease-out',fill:'both'});a.onfinish=()=>mote.remove();animations.push(a);
  }
 }else{face.style.transition='opacity 420ms ease';requestAnimationFrame(()=>{face.style.opacity='0';});}
 return stop;
}
async function playPrivateBurn(host,x,y,scale=1,card=null){
 if(!host || !ownedPrivateBurns().length || document.hidden)return false;
 if(privateBurnUid!==currentUser?.uid)clearPrivateBurnForOtherAccounts();
 clearPrivateBurnInHost(host);
 const calm=document.body.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stopPile=privateBurnPile(host,x,y,scale,calm,card);
 const ticket={},uid=currentUser.uid,session=privateBurnSession;
 privateBurnPending.set(host,ticket);
 let config;
 try{config=await loadPrivateBurnArt();}catch(_){return false;}
 if(!config || privateBurnPending.get(host)!==ticket || currentUser?.uid!==uid || session!==privateBurnSession || !host.isConnected || document.hidden || !ownedPrivateBurns().length){stopPile();return false;}
 privateBurnPending.delete(host);
 const root=document.createElement('div'),style=document.createElement('style');
 root.className='private-burn';root.setAttribute('aria-hidden','true');
 if(calm)root.classList.add('pb-calm');
 root.style.cssText=`left:${x}px;top:${y}px;transform:scale(${Math.min(1,window.innerWidth/330)*Math.max(.3,Math.min(2,Number(scale)||1))});pointer-events:none;z-index:20;`;
 style.textContent=config.css;root.innerHTML=config.html;root.prepend(style);
 const timers=[];let stopped=false;
 const stop=()=>{
  if(stopped)return;stopped=true;stopPile();
  timers.forEach(clearTimeout);root.removeEventListener('animationend',ended);root.removeEventListener('animationcancel',cancelled);
  document.removeEventListener('visibilitychange',hidden);root.remove();privateBurnRuns.delete(root);
 };
 const ended=e=>{if(e.target===root && e.animationName==='pb-life')stop();};
 const cancelled=e=>{if(e.target===root)stop();};
 const hidden=()=>{if(document.hidden)stop();};
 root.addEventListener('animationend',ended);root.addEventListener('animationcancel',cancelled);document.addEventListener('visibilitychange',hidden);
 privateBurnRuns.set(root,stop);host.append(root);
 const sound=(delay,play)=>timers.push(setTimeout(()=>{
  if(stopped || !root.isConnected || currentUser?.uid!==uid || !ownedPrivateBurns().length)return;
  const kit=audio._burnKit();if(kit)play(kit);
 },delay));
 sound(800,kit=>[880,1108.73,1318.51].forEach((f,i)=>kit.tone({at:i*.065,dur:.65,f0:f,level:.075,attack:.008})));
 sound(2500,kit=>kit.noise({dur:.58,type:'lowpass',f0:650,f1:220,q:.3,level:.13,attack:.18}));
 timers.push(setTimeout(stop,3500));
 return true;
}
