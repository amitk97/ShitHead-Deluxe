// Security regression: real economy handlers, with isolated in-memory records.
// Run: node tools/security-boundary-test.js (npm install in functions first).
'use strict';
const assert = require('node:assert/strict');
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
const data = {};
const get = path => path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],data) ?? null;
const put = (path,value) => { const ks=path.split('/').filter(Boolean), k=ks.pop(); let p=data; for(const key of ks) p=p[key] ||= {}; if(value==null) delete p[k]; else p[k]=clone(value); };
const snap = (value,key) => ({key,val:()=>clone(value),exists:()=>value!=null,child:k=>snap(value?.[k],k),forEach:fn=>Object.entries(value||{}).forEach(([k,v])=>fn(snap(v,k)))});
const database = () => ({ref:(path='') => {
  const ref={child:k=>database().ref([path,k].filter(Boolean).join('/')),once:async()=>snap(get(path)),set:async v=>put(path,v),remove:async()=>put(path,null),update:async updates=>{for(const[k,v]of Object.entries(updates))put([path,k].filter(Boolean).join('/'),v);},transaction:async fn=>{const v=fn(clone(get(path)));if(v!==undefined)put(path,v);return {committed:v!==undefined,snapshot:snap(get(path))};},orderByChild:()=>ref,startAfter:()=>ref,limitToFirst:()=>ref};return ref;
}});
const adminPath=require.resolve('../functions/node_modules/firebase-admin');require(adminPath);
const realAdmin=require.cache[adminPath].exports;require.cache[adminPath].exports={...realAdmin,database};
const actions=require('../functions/economy')._test.actions;
(async()=>{
 const seats=[{uid:'alice',finishRank:1},{uid:'bob',finishRank:2}];
 put('users/alice',{username:'Alice',diamonds:0});
 put('rooms/123456',{matchId:'real-match',phase:'PLAY',players:seats});
 const win=(matchId)=>actions.matchWin({uid:'alice',data:{mode:'online',roomCode:'123456',matchId}});
 await assert.rejects(win('invented-match'), /could not be checked/);
 assert.equal(get('users/alice/matchCounters'),null,'replay does not touch counters');
 const first=await win('real-match');
 assert(!first.already,'first actual online win accepted while remaining players finish');
 assert.equal(get('users/alice/matchCounters/wins'),1);
 assert((await win('real-match')).already,'same match is idempotent');
 await assert.rejects(win('another-id'), /could not be checked/);
 assert.equal(get('users/alice/matchCounters/wins'),1);
 put('rooms/654321',{matchId:'ranked-match',phase:'FINISHED',isRanked:true,players:seats});
 const result=()=>actions.rankedResult({uid:'alice',data:{roomCode:'654321'}});
 await assert.rejects(result(), /matching server deal/);
 put('rankedDeals/654321',{matchId:'other-match',order:['alice','bob']});
 await assert.rejects(result(), /matching server deal/);
 put('rankedDeals/654321',{matchId:'ranked-match',order:['alice','outsider']});
 await assert.rejects(result(), /matching server deal/);
 put('rankedDeals/654321',{matchId:'ranked-match',order:['bob','alice']});
 await assert.rejects(result(), /could not be checked/,'real deal still needs independent membership');
 put('rankedMembers/654321',{alice:Date.now(),bob:Date.now()});
 put('users/bob',{username:'Bob',diamonds:0,rating:500});
 // Capture the existing 1.5 second audit wait so tests don't wait in real time.
 const savedTimeout=global.setTimeout;global.setTimeout=(fn)=>savedTimeout(fn,0);
 try {
  const scored=await result();assert(scored.won,'matching server deal and members can score');
  assert((await result()).won,'duplicate result returns the original award');
  const rating=get('users/alice/rating');
  put('rooms/654321/matchId','laundered-id');
  await assert.rejects(result(), /matching server deal/);
  assert.equal(get('users/alice/rating'),rating,'new browser ID cannot repeat rating award');
 } finally {global.setTimeout=savedTimeout;}
 put('rooms/654321/phase','PLAY');
 await assert.rejects(result(), /has not finished/);
 console.log('PASS: online replay rejection and idempotency; Ranked phase, deal and participant checks; real result and duplicate scoring');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{require.cache[adminPath].exports=realAdmin;});
