'use strict';
const assert=require('node:assert/strict'),p=require('./private-back');
const delivery=require('./private-delivery'),recipient=delivery.RECIPIENT_UID;
const state={};
const database=()=>({ref:path=>({transaction:async fn=>{state[path]=fn(state[path]);},once:async()=>({exists:()=>!!state[path],val:()=>state[path]===undefined?null:state[path]})})});
let verifyUid=p.SENDER_UID,revoked=false;
const admin={database,auth:()=>({verifyIdToken:async(token,checkRevoked)=>{assert.equal(checkRevoked,true);if(revoked)throw Error();return {uid:verifyUid};}})};
async function request(token,variant='portrait',of){
 const result={headers:{},code:200};
 const res={set:(k,v)=>{result.headers[k]=v;},status:c=>{result.code=c;return res;},end:()=>result,type:()=>res,sendFile:path=>{result.path=path;return result;}};
 await p.artHandler(admin)({method:'GET',query:{variant,of},headers:token?{authorization:'Bearer '+token}:{}},res);return result;
}
(async()=>{
 for(const uid of [recipient,'outsider',null])await assert.rejects(p.grant(database(),uid));
 assert.equal((await request()).code,404);
 assert.equal((await request('token')).code,404);
 await p.grant(database(),p.SENDER_UID);const original=JSON.stringify(state);await p.grant(database(),p.SENDER_UID);assert.equal(JSON.stringify(state),original);
 for(const variant of ['portrait','tall','square','wide']){const r=await request('token',variant);assert(r.path.endsWith('back.webp'));assert(r.headers['Cache-Control'].includes('no-store'));}
 for(const uid of [recipient,'outsider']){verifyUid=uid;assert.equal((await request('token')).code,404);}
 const realNow=Date.now;
 try {
  verifyUid=recipient;Date.now=()=>delivery.RELEASE_AT;
  assert.equal((await request('token')).code,404,'No access before opening');
  state[`users/${recipient}/ownedCosmetics/${p.ITEM_ID}`]={purchasedAt:delivery.RELEASE_AT};
  assert.equal((await request('token')).code,404,'Ownership without the private claim is insufficient');
  state[`users/${recipient}/claimedGifts/${delivery.BACK_GIFT_ID}`]=true;
  Date.now=()=>delivery.RELEASE_AT-1;assert.equal((await request('token')).code,404);
  Date.now=()=>delivery.RELEASE_AT;assert((await request('token')).path);
  Date.now=()=>delivery.RELEASE_AT+86400000*30;assert((await request('token')).path);
  verifyUid='outsider';assert.equal((await request('token')).code,404);
 } finally {Date.now=realNow;}
 // Opponents see it only while AmitK or Pooja wear it (v401).
 revoked=false;verifyUid='outsider';
 assert.equal((await request('token','portrait',p.SENDER_UID)).code,404,'not worn: nothing shown');
 state[`users/${p.SENDER_UID}/equippedCosmetics/cardBack`]=p.ITEM_ID;
 assert((await request('token','portrait',p.SENDER_UID)).path,'worn by AmitK: an opponent is shown it');
 assert.equal((await request('token','portrait','someone-else')).code,404,'only AmitK or Pooja');
 state[`users/${recipient}/equippedCosmetics/cardBack`]=p.ITEM_ID;
 const rn=Date.now;Date.now=()=>delivery.RELEASE_AT-1;assert.equal((await request('token','portrait',recipient)).code,404,'Pooja before the release');Date.now=()=>delivery.RELEASE_AT;assert((await request('token','portrait',recipient)).path,'Pooja after the release');Date.now=rn;
 assert.equal((await request(undefined,'portrait',p.SENDER_UID)).code,404,'guests are never shown it');
 verifyUid=p.SENDER_UID;revoked=true;assert.equal((await request('token')).code,404);
 console.log('PASS private table: Amitk access retained, Pooja access only after timed private claim, outsider/guest denial, revoked tokens, idempotence and no caching.');
})().catch(e=>{console.error(e);process.exitCode=1;});
