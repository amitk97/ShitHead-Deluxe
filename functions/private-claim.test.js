'use strict';
const assert=require('node:assert/strict');
const p=require('./private-delivery');
const data={};const copy=v=>v==null?v:structuredClone(v);
const get=path=>path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],data)??null;
const put=(path,value)=>{const keys=path.split('/').filter(Boolean),last=keys.pop();let node=data;for(const key of keys)node=node[key]||={};if(value==null)delete node[last];else node[last]=copy(value);};
const snapshot=value=>({val:()=>copy(value),exists:()=>value!=null});
const database=()=>({ref:(path='')=>({once:async()=>snapshot(get(path)),remove:async()=>put(path,null),transaction:async fn=>{const next=fn(copy(get(path)));if(next!==undefined)put(path,next);return {committed:next!==undefined,snapshot:snapshot(get(path))};},update:async values=>{for(const[k,v]of Object.entries(values))put(path+'/'+k,v);}})});
const adminPath=require.resolve('./node_modules/firebase-admin');require(adminPath);require.cache[adminPath].exports={...require.cache[adminPath].exports,database};
const actions=require('./economy')._test.actions;
(async()=>{
 const realNow=Date.now;
 try {
  put('users/'+p.RECIPIENT_UID,{diamonds:250});
  for(const [itemId,giftId] of [[p.ITEM_ID,p.GIFT_ID],[p.TABLE_ITEM_ID,p.TABLE_GIFT_ID]]) {
   const gift={itemId,fromUid:p.SENDER_UID,fromName:'Amitk',privateGift:true,sentAt:p.RELEASE_AT,cost:0};
   put(`gifts/${p.RECIPIENT_UID}/${giftId}`,gift);
   Date.now=()=>p.RELEASE_AT-1;
   await assert.rejects(actions.claimGift({uid:p.RECIPIENT_UID,data:{giftId}}),/not available/);
   Date.now=()=>p.RELEASE_AT;
   for(const uid of ['outsider',p.SENDER_UID]){
    put(`gifts/${uid}/${giftId}`,gift);
    await assert.rejects(actions.claimGift({uid,data:{giftId}}),/not available/);
   }
   const result=await actions.claimGift({uid:p.RECIPIENT_UID,data:{giftId}});
   assert.equal(result.itemId,itemId);assert.equal(result.diamonds,250);assert.equal(result.asDiamonds,false);
   assert(get(`users/${p.RECIPIENT_UID}/ownedCosmetics/${itemId}`));
   assert.equal(get(`users/${p.RECIPIENT_UID}/claimedGifts/${giftId}`),true);
   assert.equal(get(`gifts/${p.RECIPIENT_UID}/${giftId}`),null);
   assert.equal(get(`users/${p.RECIPIENT_UID}/activityInbox/gift_in_${giftId}`).from,'Amitk');
   Date.now=()=>p.RELEASE_AT+86400000*30;
   assert(get(`users/${p.RECIPIENT_UID}/ownedCosmetics/${itemId}`),'Ownership remains after release');
   await assert.rejects(actions.claimGift({uid:p.RECIPIENT_UID,data:{giftId}}),/already been opened/);
   for(const action of ['buyItem','sendGift'])await assert.rejects(actions[action]({uid:p.SENDER_UID,auth:{},data:{itemId,friendUid:p.RECIPIENT_UID}}));
  }
 }finally{Date.now=realNow;}
 console.log('PASS ring and table claims: release gating, Pooja-only claim, permanent ownership, Amitk attribution, no charge, duplicate claim or general gifting.');
})().catch(e=>{console.error(e);process.exitCode=1;});
