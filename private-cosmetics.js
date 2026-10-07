// Private gifts are deliberately separate from shop and collection catalogues.
const PRIVATE_AVATAR_ID = 'avatar-private-keepsake';
const PRIVATE_RELEASE_AT = Date.parse('2026-10-16T22:00:00Z');
const PRIVATE_ACCOUNT_IDS = new Set(['11d84kCgSde82Xlu8k5U65OB9662','pAB2xxrFWMhUv6AYtJMP1nSxA5l1']);
const PRIVATE_AVATAR_ITEM = Object.freeze({id:PRIVATE_AVATAR_ID,name:'Forever',category:'Avatars',cost:0,privateGift:true,animated:true});
function privateAvatarItem(id) {
  return id === PRIVATE_AVATAR_ID && (typeof serverNow === 'function' ? serverNow() : Date.now()) >= PRIVATE_RELEASE_AT ? PRIVATE_AVATAR_ITEM : null;
}
function privateGiftItem(id) {
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
