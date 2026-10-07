'use strict';
const SENDER_UID = require('./private-delivery').SENDER_UID;
const ITEM_ID = 'table-private-keepsake';
const allowed = uid => uid === SENDER_UID;
const VARIANTS = new Set(['portrait','tall','square','wide']);
async function grant(database, uid) {
  if (!allowed(uid)) throw new Error('Not available');
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
      const variant = req.query.variant || 'portrait';
      if (!VARIANTS.has(variant)) return res.status(404).end();
      const owned = await admin.database().ref(`users/${user.uid}/ownedCosmetics/${ITEM_ID}`).once('value');
      if (!owned.exists()) return res.status(404).end();
      res.type('webp');
      return res.sendFile(require('node:path').join(__dirname,'private-assets',`table-${variant}.webp`));
    } catch (_) { return res.status(404).end(); }
  };
}
module.exports={SENDER_UID,ITEM_ID,allowed,grant,artHandler};
