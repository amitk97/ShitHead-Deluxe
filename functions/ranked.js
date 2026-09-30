// Admission, atomic move transactions and filtered Ranked publications.
'use strict';
const admin=require('firebase-admin');
const {HttpsError}=require('firebase-functions/v2/https');
const engine=require('./ranked-game');
const db=()=>admin.database();
const fail=(code,message)=>{throw new HttpsError(code,message);};
const codeOf=data=>{const code=String(data.roomCode||'');if(!/^\d{6}$/.test(code))fail('invalid-argument','Bad room.');return code;};
async function publish(code,game){
  const publicView={...engine.view(game),roomCode:code,hostId:'p_host',clientVersion:game.clientVersion};
  const save=async(path,value)=>db().ref(path).transaction(cur=>{
    // A slower function must not overwrite a later transaction's publication.
    if(cur?.authority===1&&Number(cur.stateVersion)>value.stateVersion)return;
    return path.startsWith('rooms/') ? {...value, ...(cur?.presence ? {presence:cur.presence} : {}), ...(cur?.lastEmote ? {lastEmote:cur.lastEmote} : {})} : value;
  },undefined,false);
  await Promise.all([save(`rooms/${code}`,publicView),...game.players.map(p=>save(`rankedViews/${code}/${p.uid}`,{...engine.view(game,p.uid),roomCode:code,clientVersion:game.clientVersion}))]);
}
async function start({uid,data}){
  const code=codeOf(data),ref=db().ref(`rankedGames/${code}`);
  const existing=(await ref.once('value')).val();
  if(existing&&existing.phase!=='FINISHED'){
    if(!existing.players.some(p=>p.uid===uid))fail('permission-denied','You are not at this table.');
    await publish(code,existing);return {view:engine.view(existing,uid)};
  }
  if(existing?.phase==='FINISHED')fail('failed-precondition','This Ranked match has ended. Find a new opponent from home.');
  const room=(await db().ref(`rooms/${code}`).once('value')).val();
  const seats=Object.values(room?.players||{}).filter(Boolean);
  if(room?.isRanked!==true||seats.length!==2||seats.some(p=>!p.uid)||new Set(seats.map(p=>p.uid)).size!==2||!seats.some(p=>p.uid===uid))fail('permission-denied','You are not at this Ranked table.');
  if(seats.find(p=>p.id==='p_host')?.uid!==uid)fail('permission-denied','The host starts this match.');
  if(!/^v\d+$/.test(room.clientVersion||'')||Number(room.clientVersion.slice(1))<262)fail('failed-precondition','Both players need the new Ranked version before starting.');
  const now=Date.now();
  const members=await Promise.all(seats.map(p=>db().ref(`rankedMembers/${code}/${p.uid}`).once('value').then(s=>Number(s.val()))));
  if(members.some(at=>!at||now-at>120000||at>now+60000))fail('failed-precondition','Waiting for both players to join. Please retry.');
  const records=await Promise.all(seats.map(p=>db().ref(`users/${p.uid}`).once('value').then(s=>s.val()||{})));
  const xpOn=await require('./xp').enabled();
  const verifiedSeats=seats.map((p,i)=>({id:p.id,uid:p.uid,name:records[i].username||p.name,rating:records[i].rating||500,cosmetics:{...(records[i].equippedCosmetics||{}),...(xpOn&&records[i].xp?{level:require('./xp').levelFor(records[i].xp.total)}:{})}}));
  if(new Set(verifiedSeats.map(p=>p.id)).size!==2||verifiedSeats.some(p=>!['p_host','p_room1'].includes(p.id)))fail('failed-precondition','Invalid Ranked seats.');
  let rejected=false;
  const tx=await ref.transaction(cur=>{
    rejected=false;
    if(cur&&cur.phase!=='FINISHED')return;
    // Give result scoring time to finish before replacing its canonical record.
    if(cur&&now-cur.updatedAt<10000){rejected=true;return;}
    const game=engine.newGame(verifiedSeats,now,cur);game.clientVersion=room.clientVersion;
    game.seatUids=Object.fromEntries(game.players.map(p=>[p.id,p.uid]));return game;
  },undefined,false);
  if(rejected)fail('failed-precondition','The previous result is still being saved. Try again shortly.');
  const game=tx.snapshot.val();
  if(!game?.players?.some(p=>p.uid===uid))fail('permission-denied','You are not at this table.');
  await publish(code,game);return {view:engine.view(game,uid)};
}
async function move({uid,data}){
  const code=codeOf(data);let error=null,duplicate=false;
  const tx=await db().ref(`rankedGames/${code}`).transaction(cur=>{
    error=null;duplicate=false;
    if(cur===null)return null; // ask for the server record, not an empty local cache
    try{const result=engine.mutate(cur,uid,data,Date.now());duplicate=!!result.duplicate;return result.game;}
    catch(e){error=e.message;return;}
  },undefined,false);
  if(error)fail('failed-precondition',error);
  const game=tx.snapshot.val();
  if(!game||!game.players.some(p=>p.uid===uid))fail('permission-denied','You are not at this table.');
  await publish(code,game);return {view:engine.view(game,uid),duplicate};
}
async function sweep(){
  const snapshots=await Promise.all(['PLAY','SWAP'].map(phase=>db().ref('rankedGames').orderByChild('phase').equalTo(phase).limitToFirst(100).once('value')));
  const jobs=[];for (const snap of snapshots) snap.forEach(s=>{
    const game=s.val();if(Date.now()<game.turnDeadline)return;
    jobs.push(move({uid:game.players[0].uid,data:{roomCode:s.key,matchId:game.matchId,op:'tick',active:false,requestId:require('node:crypto').randomUUID()}}));
  });await Promise.allSettled(jobs);
}
module.exports={start,move,publish,sweep};
