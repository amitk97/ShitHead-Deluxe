'use strict';
const assert=require('node:assert/strict');
const p=require('./private-delivery');
const data={};let failWrite=false;
const get=path=>path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],data)??null;
function put(path,value){const keys=path.split('/').filter(Boolean),last=keys.pop();let node=data;for(const key of keys)node=node[key]||={};if(value==null)delete node[last];else node[last]=structuredClone(value);}
const database={ref:(path='')=>({transaction:async fn=>{const next=fn(structuredClone(get(path)));if(next!==undefined)put(path,next);return {committed:next!==undefined,snapshot:{val:()=>get(path)}};},update:async values=>{if(failWrite)throw new Error('network failure');for(const[k,v]of Object.entries(values))put(k,v);}})};
(async()=>{
 assert.equal(p.RELEASE_AT,1792188000000);
 const date=new Date(p.RELEASE_AT);
 assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Barbados',dateStyle:'short',timeStyle:'short',hour12:false}).format(date),'16/10/2026, 18:00');
 assert.equal((await p.deliver(database,p.RELEASE_AT-1)).status,'waiting');assert.deepEqual(data,{});
 failWrite=true;await assert.rejects(p.deliver(database,p.RELEASE_AT));failWrite=false;
 const results=await Promise.all([p.deliver(database,p.RELEASE_AT),p.deliver(database,p.RELEASE_AT)]);
 assert.equal(results.filter(x=>x.status==='delivered').length,1);
 const gift=get(`gifts/${p.RECIPIENT_UID}/${p.GIFT_ID}`);
 assert.equal(gift.fromName,'Amitk');assert.equal(gift.sentAt,p.RELEASE_AT);
 assert(get(`users/${p.SENDER_UID}/ownedCosmetics/${p.ITEM_ID}`));
 assert.equal(get(`users/${p.RECIPIENT_UID}/ownedCosmetics/${p.ITEM_ID}`),null);
 assert(p.canClaim(p.RECIPIENT_UID,gift,p.RELEASE_AT));
 for(const uid of [p.SENDER_UID,'someone-else'])assert(!p.canClaim(uid,gift,p.RELEASE_AT));
 assert(!p.canClaim(p.RECIPIENT_UID,gift,p.RELEASE_AT-1));
 assert(!p.canClaim(p.RECIPIENT_UID,{...gift,fromUid:'someone-else'},p.RELEASE_AT));
 put(`gifts/${p.RECIPIENT_UID}/${p.GIFT_ID}`,null);
 await p.deliver(database,p.RELEASE_AT+300000);
 assert.equal(get(`gifts/${p.RECIPIENT_UID}/${p.GIFT_ID}`),null,'Retries must not recreate an opened gift');
 assert(!Object.keys(data.users).some(uid=>!p.allowed(uid)));
 console.log('PASS private release timezone, no early delivery, failure recovery, concurrent retries, recipient restrictions and no redelivery after opening.');
})().catch(e=>{console.error(e);process.exitCode=1;});
