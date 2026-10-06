// Real series handlers against isolated in-memory records; no live Firebase writes.
'use strict';
const assert=require('node:assert/strict');
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const data={};
const get=path=>path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],data)??null;
const put=(path,value)=>{const keys=path.split('/').filter(Boolean),last=keys.pop();let p=data;for(const k of keys)p=p[k]||={};if(value==null)delete p[last];else p[last]=clone(value);};
const snap=value=>({val:()=>clone(value),exists:()=>value!=null});
const database=()=>({ref:(path='')=>({once:async()=>snap(get(path)),set:async v=>put(path,v),update:async v=>{for(const[k,x]of Object.entries(v))put(path+'/'+k,x);},transaction:async fn=>{const next=fn(clone(get(path)));if(next!==undefined)put(path,next);return{committed:next!==undefined,snapshot:snap(get(path))};}})});
const adminPath=require.resolve('../functions/node_modules/firebase-admin');require(adminPath);require.cache[adminPath].exports={...require.cache[adminPath].exports,database};
const actions=require('../functions/economy')._test.actions;
const call=(uid,op,matchId='game-one')=>actions.series({uid,auth:{token:{email_verified:true}},data:{op,roomCode:'123456',matchId}});
function fixture(){put('series/123456',{id:'series-one',room:'123456',host:'alice',guest:'bob',status:'live',bestOf:3,need:2,played:1,wins:{alice:1,bob:0},games:{'game-one':'alice'},updatedAt:Date.now(),lastGameAt:Date.now()-90000});put('rooms/123456',{phase:'FINISHED',matchId:'game-one',players:[{uid:'alice',isHost:true,finishRank:1},{uid:'bob',isHost:false,finishRank:2}]});}
(async()=>{
 const xp=require('../functions/xp');put('config/features/xp',true);xp.resetCache();
 const create=(bestOf)=>actions.series({uid:'alice',auth:{token:{email_verified:true}},data:{op:'create',roomCode:'123456',bestOf}});
 function levelFixture(level,otherLevel=level){
  put('series/123456',null);
  put('rooms/123456',{phase:'LOBBY',ruleMode:'standard',players:[{uid:'alice',name:'Alice',isHost:true},{uid:'bob',name:'Bob'}]});
  for(const [uid,L]of [['alice',level],['bob',otherLevel]])put('users/'+uid,{diamonds:1000,xp:{total:xp.xpForLevel(L)}});
 }
 for(const [bestOf,required]of [[3,20],[5,35],[7,45]]){
  levelFixture(required-1);await assert.rejects(create(bestOf),new RegExp('level '+required));
  levelFixture(required,required-1);await assert.rejects(create(bestOf),new RegExp('level '+required));
  levelFixture(required);await create(bestOf);assert.equal(get('series/123456/status'),'pending');
  put('users/bob/xp',{total:xp.xpForLevel(required-1)});await assert.rejects(call('bob','accept'),new RegExp('level '+required));
  assert.equal(get('users/bob/diamonds'),1000);
  put('users/bob/xp',{total:xp.xpForLevel(required)});await call('bob','accept');assert.equal(get('series/123456/status'),'live');
 }
 console.log('PASS server series level boundaries for host, guest, create and accept');
 fixture();await assert.rejects(call('alice','startNext'),/Both players must press Ready/);
 await call('alice','readyNext');assert.deepEqual(get('series/123456/nextRound/ready'),{alice:true});
 await assert.rejects(call('alice','startNext'),/Both players must press Ready/);
 await call('alice','readyNext');assert.deepEqual(get('series/123456/nextRound/ready'),{alice:true});
 await assert.rejects(call('outsider','readyNext'),/not in this series/);
 await assert.rejects(call('bob','readyNext','old-game'),/current game/);
 await assert.rejects(call('bob','startNext'),/Only the current host/);
 await call('bob','readyNext');const first=await call('alice','startNext'),again=await call('alice','startNext');
 assert.equal(first.series.nextRound.nextMatchId,again.series.nextRound.nextMatchId);assert(first.series.nextRound.started);assert.notEqual(first.series.nextRound.nextMatchId,'game-one');
 fixture();await Promise.all([call('alice','readyNext'),call('bob','readyNext')]);assert.deepEqual(get('series/123456/nextRound/ready'),{alice:true,bob:true});
 // Reconnect/status retains both players' confirmations.
 assert.deepEqual((await call('bob','status')).series.nextRound.ready,{alice:true,bob:true});
 const next=(await call('alice','startNext')).series.nextRound.nextMatchId;const room=get('rooms/123456');room.matchId=next;room.phase='PLAY';put('rooms/123456',room);
 await assert.rejects(call('bob','readyNext','game-one'),/current game/);
 await assert.rejects(call('bob','readyNext',next),/current game/);
 room.phase='FINISHED';room.players[0].finishRank=2;room.players[1].finishRank=1;put('rooms/123456',room);
 await call('bob','game',next);assert.equal(get('series/123456/played'),2);assert.equal(get('series/123456/nextRound'),null);
 await assert.rejects(call('alice','startNext',next),/Both players must press Ready/);
 fixture();const absent=get('rooms/123456');absent.players[1].isBot=true;put('rooms/123456',absent);await assert.rejects(call('alice','readyNext'),/Both series players/);
 fixture();const fastRoom=get('rooms/123456');fastRoom.matchId='too-fast-game';put('rooms/123456',fastRoom);const fastSeries=get('series/123456');fastSeries.lastGameAt=Date.now();put('series/123456',fastSeries);const fast=await call('alice','game','too-fast-game');assert(fast.skipped);assert.equal(fast.series.played,1);await call('alice','readyNext','too-fast-game');await call('bob','readyNext','too-fast-game');assert((await call('alice','startNext','too-fast-game')).series.nextRound.started);
 fixture();const ended=get('series/123456');ended.status='done';ended.settled={alice:true,bob:true};put('series/123456',ended);await assert.rejects(call('alice','readyNext'),/no series/);
 console.log('PASS series readiness: both confirmations, duplicate clicks, simultaneous calls, reconnects, stale requests, clearing per game, absent seats, ended series.');
})().catch(e=>{console.error(e);process.exitCode=1;});
