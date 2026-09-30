// Run with NODE_PATH pointing to firebase + @firebase/rules-unit-testing,
// and the Database emulator on port 9000. Uses isolated demo records only.
'use strict';
// The Realtime Database SDK ignores NO_PROXY for WebSockets. This test uses
// loopback emulators only; don't route those connections through an HTTP proxy.
for (const key of ['HTTP_PROXY','http_proxy','HTTPS_PROXY','https_proxy']) delete process.env[key];
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {ref,get,set,update,remove}=require('firebase/database');
process.env.FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000';
const admin=require('../functions/node_modules/firebase-admin');
admin.initializeApp({projectId:'demo-shithead-security',databaseURL:'https://demo-shithead-security.firebaseio.com'});
const ranked=require('../functions/ranked'),engine=require('../functions/ranked-game');
const {actions}=require('../functions/economy')._test;
function normalizedRules(){let inside=false,escape=false;let out='';for(const c of fs.readFileSync('database.rules.json','utf8')){if(c==='"'&&!escape)inside=!inside;out+=c==='\n'&&inside?' ':c;escape=c==='\\'&&!escape;}return out;}
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-shithead-security',database:{host:'127.0.0.1',port:9000,rules:normalizedRules()}});
 try{
  console.log('Rules loaded'); await env.clearDatabase(); console.log('Database cleared');const now=Date.now(),code='123456';
  const initialXp={total:0,level:1,backfilled:true,paidLevel:1,table:require('../functions/catalog.json').xp.tableVersion};
  const users={alice:{username:'Alice',xp:initialXp,diamonds:500,rating:500,equippedCosmetics:{cardBack:'default'}},bob:{username:'Bob',xp:initialXp,diamonds:0,rating:500}};
  await admin.database().ref().update({'config/features/xp':true,users, [`rooms/${code}`]:{isRanked:true,phase:'LOBBY',clientVersion:'v262',players:[{id:'p_host',uid:'alice',name:'Alice'},{id:'p_room1',uid:'bob',name:'Bob'}]},[`rankedMembers/${code}`]:{alice:now,bob:now}});
  console.log('Fixture seeded');
  const alice=env.authenticatedContext('alice').database(),bob=env.authenticatedContext('bob').database(),outsider=env.authenticatedContext('mallory').database(),guest=env.unauthenticatedContext().database();
  await assert.rejects(ranked.start({uid:'mallory',data:{roomCode:code}}));
  await assert.rejects(ranked.start({uid:'bob',data:{roomCode:code}}));
  console.log('Admission rejection checked');
  const started=await ranked.start({uid:'alice',data:{roomCode:code}});assert.equal(started.view.phase,'SWAP');
  console.log('Ranked started');assert.equal(started.view.players.find(p=>p.uid==='alice').cosmetics.level,1);
  const canonical=(await admin.database().ref(`rankedGames/${code}`).once('value')).val();
  for(const db of [alice,bob,outsider,guest]){
   await assertFails(get(ref(db,`rankedGames/${code}`)));
   await assertFails(set(ref(db,`rankedGames/${code}/phase`),'FINISHED'));
  }
  await assertSucceeds(get(ref(alice,`rankedViews/${code}/alice`)));
  await assertSucceeds(get(ref(bob,`rankedViews/${code}/bob`)));
  await assertFails(get(ref(alice,`rankedViews/${code}/bob`)));
  await assertFails(get(ref(outsider,`rankedViews/${code}/alice`)));
  await assertFails(get(ref(guest,`rankedViews/${code}/alice`)));
  await assertFails(get(ref(alice,`rankedViews/${code}`)));
  await assertFails(set(ref(alice,`rankedViews/${code}/alice/players`),[]));
  const pub=(await get(ref(outsider,`rooms/${code}`))).val();assert(pub.players.every(p=>Object.values(p.hand||{}).every(c=>c.hidden)));assert(Object.values(pub.drawPile).every(c=>c.hidden));
  for(const db of [alice,bob,outsider,guest]){
   await assertFails(set(ref(db,`rooms/${code}/phase`),'FINISHED'));
   await assertFails(set(ref(db,`rooms/${code}/isRanked`),false));
   await assertFails(update(ref(db,`rooms/${code}`),{authority:0,players:[]}));
   await assertFails(remove(ref(db,`rooms/${code}`)));
  }
  await assertFails(update(ref(alice),{[`rooms/${code}/phase`]:'FINISHED',[`rankedGames/${code}/phase`]:'FINISHED'}));
  await assertSucceeds(set(ref(alice,`rooms/${code}/presence/p_host`),{status:'connected',at:Date.now()}));
  await assertFails(set(ref(alice,`rooms/${code}/presence/p_room1`),{status:'left',at:Date.now()}));
  await assertSucceeds(set(ref(alice,`rooms/${code}/lastEmote`),{playerId:'p_host',emoji:'😂',at:Date.now()}));
  await assertFails(set(ref(alice,`rooms/${code}/lastEmote`),{playerId:'p_room1',emoji:'😂',at:Date.now()}));
  await assertFails(set(ref(alice,'users/alice/diamonds'),999999));
  await assertFails(set(ref(alice,'users/alice/rating'),9999));
  await assertFails(set(ref(alice,'users/alice/xp/total'),9999));
  // Attempts at forged card values cannot enter the move protocol.
  const send=async(uid,op,extra={})=>{const g=(await admin.database().ref(`rankedGames/${code}`).once('value')).val();return ranked.move({uid,data:{roomCode:code,matchId:g.matchId,version:g.stateVersion,requestId:crypto.randomUUID(),op,...extra}});};
  await assert.rejects(send('mallory','ready'),/not at this table/);
  const mine=canonical.players.find(p=>p.uid==='alice'),theirs=canonical.players.find(p=>p.uid==='bob');
  await assert.rejects(send('alice','swap',{handId:theirs.hand[0].id,faceUpId:mine.faceUp[0].id}));
  await send('alice','swap',{handId:mine.hand[0].id,faceUpId:mine.faceUp[0].id});
  await send('alice','ready');await send('bob','ready');
  let g=(await admin.database().ref(`rankedGames/${code}`).once('value')).val();
  const uid=g.players[g.currentTurnIndex].uid,other=g.players.find(p=>p.uid!==uid);
  await assert.rejects(send(other.uid,'play',{cardIds:[other.hand[0].id]}),/not your turn/);
  const current=g.players[g.currentTurnIndex],req={roomCode:code,matchId:g.matchId,version:g.stateVersion,requestId:crypto.randomUUID(),op:'play',cardIds:[current.hand.find(c=>!c.isJoker)?.id||current.hand[0].id]};
  const played=await ranked.move({uid,data:req});const replay=await ranked.move({uid,data:req});assert(replay.duplicate);assert.equal(played.view.stateVersion,replay.view.stateVersion);
  await assert.rejects(send('alice','play',{cardIds:['c_54'],rank:'JOKER'}));
  // Simultaneous requests at one version: one succeeds, stale one cannot overwrite it.
  g=(await admin.database().ref(`rankedGames/${code}`).once('value')).val();
  const concede={roomCode:code,matchId:g.matchId,version:g.stateVersion,op:'concede'};
  const outcomes=await Promise.allSettled(g.players.map(p=>ranked.move({uid:p.uid,data:{...concede,requestId:crypto.randomUUID()}})));
  assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);
  g=(await admin.database().ref(`rankedGames/${code}`).once('value')).val();assert.equal(g.phase,'FINISHED');
  // The public browser snapshot can neither supply nor replace a result.
  const winner=g.players.find(p=>p.finishRank===1).uid;
  const result=await actions.rankedResult({uid:winner,data:{roomCode:code}});assert(result.won);
  assert.equal((await admin.database().ref(`users/${winner}/matchCounters/finished`).once('value')).val(),1);
  const xpRules=require('../functions/xp').RULES;
  const earnedXp=xpRules.finish+xpRules.firstGameOfDay+xpRules.ranked+xpRules.rankedWin;
  assert.equal((await admin.database().ref(`users/${winner}/xp/total`).once('value')).val(),earnedXp);
  const balance=(await admin.database().ref(`users/${winner}/diamonds`).once('value')).val();
  await actions.rankedResult({uid:winner,data:{roomCode:code}});assert.equal((await admin.database().ref(`users/${winner}/diamonds`).once('value')).val(),balance);
  assert.equal((await admin.database().ref(`users/${winner}/matchCounters/finished`).once('value')).val(),1);
  await assert.rejects(actions.rankedDeal({uid:'alice',data:{roomCode:code,matchId:g.matchId}}),/Ranked has changed/);
  await assert.rejects(ranked.start({uid:'alice',data:{roomCode:code}}),/match has ended/);
  // Late public/private publications cannot regress the table.
  await ranked.publish(code,canonical);
  assert.equal((await get(ref(alice,`rankedViews/${code}/alice`))).val().phase,'FINISHED');
  assert.equal((await get(ref(alice,`rooms/${code}`))).val().phase,'FINISHED');
  // The casual guest path is unchanged by the scoped Ranked migration.
  await assertSucceeds(set(ref(guest,'rooms/654321'),{phase:'LOBBY',players:[]}));
  console.log('PASS: emulator privacy, direct-write denial, member presence/emotes, actual start/moves, concurrent moves, duplicate scoring and stale publication protection');
 }finally{await env.cleanup();await admin.app().delete();}
})().catch(e=>{console.error(e);process.exitCode=1;});
