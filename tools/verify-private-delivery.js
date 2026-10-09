'use strict';
// Verify exact account bindings and the live scheduler, without sending a gift.
const admin=require('../functions/node_modules/firebase-admin');
const p=require('../functions/private-delivery');
const credential=JSON.parse(process.env.DEPLOY_CREDENTIAL);
admin.initializeApp({credential:admin.credential.cert(credential),databaseURL:'https://shithead-pro-default-rtdb.europe-west1.firebasedatabase.app'});
(async()=>{
 const [sender,recipient,senderName,recipientName]=await Promise.all([
  admin.auth().getUser(p.SENDER_UID),admin.auth().getUser(p.RECIPIENT_UID),
  admin.database().ref('usernames/amitk').once('value'),admin.database().ref('usernames/pooja').once('value')
 ]);
 if(sender.disabled||recipient.disabled||senderName.val()!==p.SENDER_UID||recipientName.val()!==p.RECIPIENT_UID||String(sender.email).toLowerCase()!=='amirk2197@googlemail.com')throw new Error('Private recipient bindings did not verify');
 for (const giftId of [p.GIFT_ID,p.TABLE_GIFT_ID,p.BURN_GIFT_ID,p.BACK_GIFT_ID]) {
  const prematureGift=await admin.database().ref(`gifts/${p.RECIPIENT_UID}/${giftId}`).once('value');
  if(Date.now()<p.RELEASE_AT && prematureGift.exists())throw new Error('A private gift exists before release');
 }
 if(Date.now()<p.RELEASE_AT) {
  for(const itemId of [p.TABLE_ITEM_ID,p.BURN_ITEM_ID,p.BACK_ITEM_ID]) {
  const earlyOwned=await admin.database().ref(`users/${p.RECIPIENT_UID}/ownedCosmetics/${itemId}`).once('value');
  if(earlyOwned.exists())throw new Error('Private ownership exists before release');
  }
 }
 await require('../functions/private-back').grant(admin.database(),p.SENDER_UID);
 await require('../functions/private-burn').grant(admin.database(),p.SENDER_UID);
 console.log('Exact private account bindings verified; no early delivery or private ownership.');
 process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1);});
