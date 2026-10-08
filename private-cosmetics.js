// Private gifts are deliberately separate from shop and collection catalogues.
const PRIVATE_AVATAR_ID = 'avatar-private-keepsake';
const PRIVATE_RELEASE_AT = Date.parse('2026-10-16T22:00:00Z');
const PRIVATE_ACCOUNT_IDS = new Set(['11d84kCgSde82Xlu8k5U65OB9662','pAB2xxrFWMhUv6AYtJMP1nSxA5l1']);
const PRIVATE_AVATAR_ITEM = Object.freeze({id:PRIVATE_AVATAR_ID,name:'Forever',category:'Avatars',cost:0,privateGift:true,animated:true});
function privateAvatarItem(id) {
  return id === PRIVATE_AVATAR_ID && (typeof serverNow === 'function' ? serverNow() : Date.now()) >= PRIVATE_RELEASE_AT ? PRIVATE_AVATAR_ITEM : null;
}
function privateGiftItem(id) {
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
