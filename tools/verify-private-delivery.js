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
 const prematureGift=await admin.database().ref(`gifts/${p.RECIPIENT_UID}/${p.GIFT_ID}`).once('value');
 if(Date.now()<p.RELEASE_AT && prematureGift.exists())throw new Error('A private gift exists before release');
 console.log('Exact private account bindings verified; no early delivery.');
 process.exit(0);
})().catch(e=>{console.error(e.message);process.exit(1);});
