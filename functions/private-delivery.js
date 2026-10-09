'use strict';
// Server-only one-time delivery. Stable account IDs survive username changes.
const RELEASE_AT = Date.parse('2026-10-16T22:00:00Z');
const SENDER_UID = '11d84kCgSde82Xlu8k5U65OB9662';
const RECIPIENT_UID = 'pAB2xxrFWMhUv6AYtJMP1nSxA5l1';
const ITEM_ID = 'avatar-private-keepsake';
const GIFT_ID = 'private_keepsake_20261016';
const ITEM = Object.freeze({id:ITEM_ID,name:'Forever',category:'Avatars',cost:0,privateGift:true,animated:true});
const TABLE_ITEM_ID = 'table-private-keepsake';
const TABLE_GIFT_ID = 'private_sunset_20261016';
const TABLE_ITEM = Object.freeze({id:TABLE_ITEM_ID,name:'Our Sunset',category:'Table Themes',cost:0,privateGift:true});
const BURN_ITEM_ID='burn-private-keepsake', BURN_GIFT_ID='private_embers_20261016';
const BURN_ITEM=Object.freeze({id:BURN_ITEM_ID,name:'Ember & Tide',category:'Burn Effects',cost:0,privateGift:true,tones:['#6e1535','#e9b46c','#ffe7bd']});
const BACK_ITEM_ID='back-private-keepsake', BACK_GIFT_ID='private_promise_20261016';
const BACK_ITEM=Object.freeze({id:BACK_ITEM_ID,name:'Sunset Promise',category:'Card Backs',cost:0,privateGift:true});
const itemFor = id => id === BACK_ITEM_ID ? BACK_ITEM : id === BURN_ITEM_ID ? BURN_ITEM : id === ITEM_ID ? ITEM : id === TABLE_ITEM_ID ? TABLE_ITEM : null;
const allowed = uid => uid === SENDER_UID || uid === RECIPIENT_UID;
function publicCosmetics(value){
 const result={...value};
 if(result.cardBack===BACK_ITEM_ID)result.cardBack='default';
 if(result.burnEffect===BURN_ITEM_ID)result.burnEffect='default';
 if(result.tableTheme===TABLE_ITEM_ID)delete result.tableTheme;
 return result;
}
function canClaim(uid, gift, now = Date.now()) {
  return now >= RELEASE_AT && uid === RECIPIENT_UID && !!itemFor(gift?.itemId) && gift?.fromUid === SENDER_UID && gift?.privateGift === true;
}
async function deliver(database, now = Date.now()) {
  if (now < RELEASE_AT) return {status:'waiting',releaseAt:RELEASE_AT};
  const record = database.ref('privateDeliveries/' + GIFT_ID);
  const token = require('node:crypto').randomUUID();
  const lock = await record.transaction(value => {
    if (value?.status === 'delivered') return;
    if (value?.leaseUntil > now) return;
    return {status:'delivering',token,leaseUntil:now+120000,releaseAt:RELEASE_AT};
  });
  if (!lock.committed) return {status:'unchanged'};
  // One atomic write records all deliveries and completion: retries never recreate opened mail.
  const gift = {itemId:ITEM_ID,fromUid:SENDER_UID,fromName:'Amitk',cost:0,sentAt:now,privateGift:true};
  const updates = {
    [`users/${SENDER_UID}/ownedCosmetics/${ITEM_ID}`]:{cost:0,purchasedAt:now,privateGift:true},
    [`gifts/${RECIPIENT_UID}/${GIFT_ID}`]:gift,
    [`gifts/${RECIPIENT_UID}/${TABLE_GIFT_ID}`]:{...gift,itemId:TABLE_ITEM_ID},
    [`gifts/${RECIPIENT_UID}/${BACK_GIFT_ID}`]:{...gift,itemId:BACK_ITEM_ID},
    [`gifts/${RECIPIENT_UID}/${BURN_GIFT_ID}`]:{...gift,itemId:BURN_ITEM_ID},
    [`privateDeliveries/${GIFT_ID}`]:{status:'delivered',releaseAt:RELEASE_AT,deliveredAt:now}
  };
  try { await database.ref().update(updates); }
  catch (error) {
    await record.transaction(value => value?.token === token ? null : undefined).catch(()=>{});
    throw error;
  }
  return {status:'delivered'};
}
module.exports = {RELEASE_AT,SENDER_UID,RECIPIENT_UID,ITEM_ID,GIFT_ID,ITEM,TABLE_ITEM_ID,TABLE_GIFT_ID,TABLE_ITEM,BURN_ITEM_ID,BURN_GIFT_ID,BURN_ITEM,BACK_ITEM_ID,BACK_GIFT_ID,BACK_ITEM,itemFor,allowed,publicCosmetics,canClaim,deliver};
