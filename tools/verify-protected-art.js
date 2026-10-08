'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const admin=require('../functions/node_modules/firebase-admin');
const {SENDER_UID}=require('../functions/private-delivery');
(async()=>{
 const credential=JSON.parse(process.env.DEPLOY_CREDENTIAL);
 admin.initializeApp({credential:admin.credential.cert(credential),databaseURL:'https://shithead-pro-default-rtdb.europe-west1.firebasedatabase.app'});
 const user=await admin.auth().getUser(SENDER_UID);
 assert(!user.disabled,'Owner account is disabled');
 const apiKey=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').match(/apiKey:\s*"([^"]+)"/)[1];
 const customToken=await admin.auth().createCustomToken(SENDER_UID);
 const signin=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+apiKey,{method:'POST',headers:{'Content-Type':'application/json',Referer:'https://shithead-deluxe.web.app/'},body:JSON.stringify({token:customToken,returnSecureToken:true})});
 if(!signin.ok){const failure=await signin.json();throw Error('Owner verification sign-in failed: '+signin.status+' '+(failure.error?.message||''));}
 const {idToken}=await signin.json();assert(idToken,'Owner verification token unavailable');
 for(const variant of ['portrait','tall','square','wide']){
  const response=await fetch('https://europe-west1-shithead-pro.cloudfunctions.net/privateTableArt?variant='+variant,{headers:{Authorization:'Bearer '+idToken,Origin:'https://shithead-deluxe.web.app'},cache:'no-store'});
  const body=Buffer.from(await response.arrayBuffer());
  console.log('Protected table '+variant+': status '+response.status+', '+body.length+' bytes, '+response.headers.get('content-type'));
  assert.equal(response.status,200,'Protected table '+variant+' unavailable to owner');
  assert(response.headers.get('content-type').startsWith('image/'),'Artwork response is not an image');
  const envelope=JSON.parse(fs.readFileSync(path.join(__dirname,'../functions/private-assets/table-'+variant+'.enc.json'),'utf8'));
  assert.equal(crypto.createHash('sha256').update(body).digest('hex'),envelope.sha256,'Deployed artwork does not match protected source');
  assert.equal(response.headers.get('access-control-allow-origin'),'https://shithead-deluxe.web.app','Artwork CORS response mismatch');
 }
 console.log('PASS: live owner artwork responses match all four protected originals.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>admin.apps.forEach(app=>app.delete()));
