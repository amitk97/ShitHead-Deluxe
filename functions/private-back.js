'use strict';
const {SENDER_UID,RECIPIENT_UID,RELEASE_AT,BACK_GIFT_ID} = require('./private-delivery');
const ITEM_ID = 'back-private-keepsake';
const allowed = (uid,now=Date.now()) => uid === SENDER_UID || (uid === RECIPIENT_UID && now >= RELEASE_AT);
async function grant(database, uid) {
  if (uid !== SENDER_UID) throw new Error('Not available');
  await database.ref(`users/${uid}/ownedCosmetics/${ITEM_ID}`).transaction(value => value || {purchasedAt:Date.now(),cost:0,privateGift:true});
}
function artHandler(admin) {
  return async (req,res) => {
    res.set('Cache-Control','private, no-store, max-age=0');
    res.set('Vary','Authorization');
    if (req.method !== 'GET') return res.status(405).end();
    try {
      const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
      if (!match) return res.status(404).end();
      const user = await admin.auth().verifyIdToken(match[1], true);
      if (!allowed(user.uid)) return res.status(404).end();
      const owned = await admin.database().ref(`users/${user.uid}/ownedCosmetics/${ITEM_ID}`).once('value');
      if (!owned.exists()) return res.status(404).end();
      if (user.uid === RECIPIENT_UID) {
        const claim = await admin.database().ref(`users/${user.uid}/claimedGifts/${BACK_GIFT_ID}`).once('value');
        if (!claim.exists()) return res.status(404).end();
      }
      res.type('webp');
      return res.sendFile(require('node:path').join(__dirname,'private-assets','back.webp'));
    } catch (_) { return res.status(404).end(); }
  };
}
module.exports={SENDER_UID,ITEM_ID,allowed,grant,artHandler};
