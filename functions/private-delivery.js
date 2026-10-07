'use strict';
// Server-only one-time delivery. Stable account IDs survive username changes.
const RELEASE_AT = Date.parse('2026-10-16T22:00:00Z');
const SENDER_UID = '11d84kCgSde82Xlu8k5U65OB9662';
const RECIPIENT_UID = 'pAB2xxrFWMhUv6AYtJMP1nSxA5l1';
const ITEM_ID = 'avatar-private-keepsake';
const GIFT_ID = 'private_keepsake_20261016';
const ITEM = Object.freeze({id:ITEM_ID,name:'Forever',category:'Avatars',cost:0,privateGift:true,animated:true});
const allowed = uid => uid === SENDER_UID || uid === RECIPIENT_UID;
function canClaim(uid, gift, now = Date.now()) {
  return now >= RELEASE_AT && uid === RECIPIENT_UID && gift?.itemId === ITEM_ID && gift?.fromUid === SENDER_UID && gift?.privateGift === true;
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
  // One atomic write records both deliveries and completion: retries never recreate opened mail.
  const gift = {itemId:ITEM_ID,fromUid:SENDER_UID,fromName:'Amitk',cost:0,sentAt:now,privateGift:true};
  const updates = {
    [`users/${SENDER_UID}/ownedCosmetics/${ITEM_ID}`]:{cost:0,purchasedAt:now,privateGift:true},
    [`gifts/${RECIPIENT_UID}/${GIFT_ID}`]:gift,
    [`privateDeliveries/${GIFT_ID}`]:{status:'delivered',releaseAt:RELEASE_AT,deliveredAt:now}
  };
  try { await database.ref().update(updates); }
  catch (error) {
    await record.transaction(value => value?.token === token ? null : undefined).catch(()=>{});
    throw error;
  }
  return {status:'delivered'};
}
module.exports = {RELEASE_AT,SENDER_UID,RECIPIENT_UID,ITEM_ID,GIFT_ID,ITEM,allowed,canClaim,deliver};
