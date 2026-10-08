// Server-owned online engine. Ranked defaults remain two-player. No client snapshots are accepted.
'use strict';
const crypto = require('node:crypto');
const { SUITS, RANKS, isPlayLegal, getEffectiveTopCard, deriveConstraintFromRank, RANK_VALUES } = require('./rules');
const clone = v => JSON.parse(JSON.stringify(v));
function hydrate(value) {
  const g=clone(value);
  for(const key of ['drawPile','discardPile','burntCards','playedHistory'])g[key]=g[key]||[];
  g.requests=g.requests||{};
  for(const key of ['activeConstraint','baseOverrideCard','turnDeadline'])g[key]=g[key]??null;
  for(const p of g.players){
    for(const key of ['hand','faceUp','faceDown'])p[key]=p[key]||[];
    for(const key of ['cosmetics','gameStats','lobbyStats'])p[key]=p[key]||{};
  }
  return g;
}
const fail = message => { throw new Error(message); };
const count = p => p.hand.length + p.faceUp.length + p.faceDown.length;
const legal = (g,c) => isPlayLegal(c,g.discardPile,g.activeConstraint,g.baseOverrideCard);
const zone = (g,p) => p.hand.length ? 'hand' : g.drawPile.length ? 'hand' : p.faceUp.length ? 'faceUp' : 'faceDown';
const bump = (p,k,n=1) => { p.gameStats[k]=(p.gameStats[k]||0)+n; p.lobbyStats[k]=(p.lobbyStats[k]||0)+n; };
function shuffled(list) { const a=[...list]; for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
function newGame(players, now=Date.now(), previous=null, options={}) {
  const ranked=options.isRanked!==false;
  if(ranked&&(players.length!==2 || new Set(players.map(p=>p.uid)).size!==2 || players.some(p=>!p.uid))) fail('Ranked needs two different signed-in players.');
  if(!ranked&&(players.length<2||players.length>4||players.filter(p=>p.isBot).length>2||players.every(p=>p.isBot)||new Set(players.map(p=>p.id)).size!==players.length||players.some(p=>!p.id||(!p.isBot&&!p.uid))||new Set(players.filter(p=>!p.isBot).map(p=>p.uid)).size!==players.filter(p=>!p.isBot).length))fail('Choose two to four distinct seats.');
  const deck=[];
  for(const suit of SUITS) for(const rank of RANKS) deck.push({id:crypto.randomUUID(),rank,suit,isJoker:false});
  for(let i=0;i<2;i++) deck.push({id:crypto.randomUUID(),rank:'JOKER',suit:'JOKER',isJoker:true});
  const cards=shuffled(deck);
  const seats=shuffled(players).map(p=>({id:p.id,uid:p.uid||null,name:String(p.name||'Player').slice(0,30),isHost:p.id==='p_host',isBot:!ranked&&!!p.isBot,isPermanentBot:!ranked&&!!p.isBot,
    cosmetics:clone(p.cosmetics||{}),rating:Number(p.rating)||500,hand:cards.splice(0,3),faceUp:cards.splice(0,3).map((c,i)=>({...c,slotIndex:i})),
    faceDown:cards.splice(0,3).map((c,i)=>({...c,slotIndex:i})),isReady:!ranked&&!!p.isBot,hasFinished:false,finishRank:null,
    gameStats:{},lobbyStats:{matches:1},lastSeen:now,substituteMoveCount:0}));
  return {authority:1,isRanked:ranked,matchId:crypto.randomUUID(),phase:'SWAP',players:seats,drawPile:cards,discardPile:[],burntCards:[],playedHistory:[],
    currentTurnIndex:0,direction:1,activeConstraint:null,baseOverrideCard:null,stateVersion:(previous?.stateVersion||0)+1,
    createdAt:now,updatedAt:now,turnTimerMs:ranked?15000:([15000,30000,45000,60000].includes(options.turnTimerMs)?options.turnTimerMs:15000),turnDeadline:now+60000,requests:{},stalemateTurns:0};
}
function refill(g,p) {const drawn=[];while(p.hand.length<3&&g.drawPile.length){const c=g.drawPile.pop();p.hand.push(c);drawn.push(c);}return drawn;}
function nextLiving(g,index,steps=1) {
  let next=index;
  for(let step=0;step<steps;step++){
    let attempts=0;
    do {next=(next+g.direction+g.players.length)%g.players.length;} while(g.players[next].hasFinished&&++attempts<g.players.length);
  }
  return next;
}
function endIfEmpty(g,p,now) {
  if(p.hasFinished||count(p)!==0||g.drawPile.length)return false;
  p.hasFinished=true;p.finishRank=1+g.players.filter(q=>q!==p&&q.hasFinished).length;
  if(p.finishRank===1)p.lobbyStats.wins=(p.lobbyStats.wins||0)+1;
  const remaining=g.players.filter(q=>!q.hasFinished);
  g.pendingFollowUp=null;g.pendingFaceUpSacrifice=null;
  if(remaining.length<=1){
    if(remaining[0]){remaining[0].hasFinished=true;remaining[0].finishRank=g.players.length;}
    g.phase='FINISHED';g.turnDeadline=null;
  }else turn(g,nextLiving(g,g.players.indexOf(p)),now);
  return true;
}
function turn(g,index,now) {g.currentTurnIndex=index;g.turnDeadline=now+(g.players[index].isPermanentBot?1000:g.turnTimerMs);prepareChoice(g);}
function prepareChoice(g) {
  g.pendingFaceUpSacrifice=null;
  if(g.phase!=='PLAY'||g.pendingFollowUp)return;
  const p=g.players[g.currentTurnIndex];
  if(zone(g,p)==='faceUp'&&!p.faceUp.some(c=>legal(g,c)))g.pendingFaceUpSacrifice={playerId:p.id};
}
function log(g,p,cards,blindFailed=false) {g.playedHistory.push({type:'play',playerName:p.name,cards:clone(cards),blindFailed});g.playedHistory=g.playedHistory.slice(-25);}
function collect(g,p,cards=g.discardPile) {
  if(cards.length){bump(p,'pickedUp',cards.length);p.gameStats.biggestPickup=Math.max(p.gameStats.biggestPickup||0,cards.length);g.playedHistory.push({type:'pickup',playerName:p.name});}
  p.hand.push(...cards);g.discardPile=[];g.activeConstraint=null;g.baseOverrideCard=null;
}
function burn(g,p,now,snap) {
  bump(p,'burnt',g.discardPile.length);bump(p,'challengeBurns');if(snap)bump(p,'snapBurns');
  g.burntCards.push(...g.discardPile);g.discardPile=[];g.activeConstraint=null;g.baseOverrideCard=null;g.pendingFollowUp=null;
  g.playedHistory.push({type:'burn',playerName:p.name});refill(g,p);
  g.event={type:'burn',playerId:p.id,effectId:require('./private-delivery').publicCosmetics(p.cosmetics).burnEffect||'default'};
  if(!endIfEmpty(g,p,now))turn(g,g.players.indexOf(p),now);
}
function joker(g,p,now,targetId=null) {
  const targets=g.players.filter(q=>q!==p&&!q.hasFinished);
  if(targets.length>1&&!targetId){g.pendingJoker={playerId:p.id};g.turnDeadline=now+8000;return;}
  const other=targetId?targets.find(q=>q.id===targetId):targets[0];
  if(!other)fail('Choose a player still in this match.');
  g.pendingJoker=null;g.burntCards.push(...g.discardPile.filter(c=>c.isJoker));g.discardPile=g.discardPile.filter(c=>!c.isJoker);
  const z=other.hand.some(c=>c.isJoker)?'hand':zone(g,other)==='faceUp'?'faceUp':null;
  const counter=z&&other[z].find(c=>c.isJoker);
  g.event={type:'joker',playerId:p.id,effectId:p.cosmetics.jokerEffect||'default',counter:!!counter};
  g.activeConstraint=null;g.baseOverrideCard=null;
  if(counter){
    g.event.counterPlayerId=other.id;g.event.counterEffectId=other.cosmetics.jokerEffect||'default';
    other[z]=other[z].filter(c=>c.id!==counter.id);g.burntCards.push(counter);bump(other,'played');bump(other,'jokersPlayed');bump(other,'jokerDeflects');log(g,other,[counter]);
    if(z==='hand')refill(g,other);
    refill(g,p);
    collect(g,p); // Empty original Joker player only finishes after pickup is known.
    endIfEmpty(g,p,now);
    if(g.phase==='FINISHED')return;
    refill(g,p);
    endIfEmpty(g,other,now);
    if(g.phase==='FINISHED')return;
    turn(g,other.hasFinished?nextLiving(g,g.players.indexOf(other)):g.players.indexOf(other),now);
  }else{
    collect(g,other);refill(g,p);
    if(!endIfEmpty(g,p,now))turn(g,g.players.indexOf(p),now);
  }
}
function play(g,p,ids,now,{followUp=false,auto=false}={}) {
  if(!Array.isArray(ids)||!ids.length||ids.length>54||new Set(ids).size!==ids.length)fail('Choose different cards.');
  if(p.hasFinished)fail('You have already finished.');
  if(g.pendingJoker)fail('Choose the Joker target first.');
  const current=g.players[g.currentTurnIndex];
  const all=[...p.hand,...p.faceUp,...p.faceDown];const selected=ids.map(id=>all.find(c=>c.id===id));
  if(selected.some(c=>!c))fail('Those cards are not yours.');
  const rank=selected[0].rank;if(selected[0].isJoker&&selected.length!==1)fail('Play one Joker at a time.');if(selected.some(c=>c.rank!==rank))fail('Cards must have the same rank.');
  const z=zone(g,p),blind=z==='faceDown';
  if(blind&&selected.length!==1)fail('Flip one face-down card.');
  const cross=!g.drawPile.length&&p.hand.length&&p.hand.every(c=>c.rank===rank)&&p.hand.every(c=>ids.includes(c.id));
  if(selected.some(c=>!p[z].some(q=>q.id===c.id)&&!(z==='hand'&&cross&&p.faceUp.some(q=>q.id===c.id))))fail('That card zone is still locked.');
  let run=0;for(let i=g.discardPile.length-1;i>=0&&g.discardPile[i].rank===rank&&!g.discardPile[i].isJoker;i--)run++;
  const completesBurn=!blind&&!selected[0].isJoker&&run>0&&run+selected.length>=4;
  const snap=current!==p&&completesBurn;
  if(current!==p&&!snap)fail('It is not your turn.');
  if(g.pendingFollowUp&&!followUp&&!snap)fail('Answer the bonus draw first.');
  if(g.pendingFaceUpSacrifice&&!snap)fail('Choose a face-up sacrifice first.');
  if(!blind&&!followUp&&!completesBurn&&!legal(g,selected[0]))fail('That play is not legal.');
  if(!auto&&now>g.turnDeadline&&!snap)fail('Your turn has timed out.');
  const oldConstraint=g.activeConstraint,oldBase=g.baseOverrideCard;
  const blindFail=blind&&!legal(g,selected[0]);
  const chain=followUp?(g.pendingFollowUp?.chainedRankCount||0):0;
  g.pendingFollowUp=null;g.pendingFaceUpSacrifice=null;
  for(const key of ['hand','faceUp','faceDown'])p[key]=p[key].filter(c=>!ids.includes(c.id));
  bump(p,'played',selected.length);bump(p,'turns');p.lastPlayRank=rank;
  if(selected[0].isJoker)bump(p,'jokersPlayed',selected.length);
  g.discardPile.push(...selected);log(g,p,selected,blindFail);
  g.event={type:blind?'blind':'play',playerId:p.id,cards:clone(selected),failed:blindFail};
  if(blindFail){collect(g,p);turn(g,nextLiving(g,g.players.indexOf(p)),now);return;}
  if(rank==='10'||(run+selected.length>=4&&!selected[0].isJoker)){burn(g,p,now,snap);return;}
  g.activeConstraint=null;g.baseOverrideCard=null;
  if(selected[0].isJoker){joker(g,p,now);return;}
  let effect=rank;
  if(rank==='5'){g.baseOverrideCard=g.discardPile[0];effect=g.baseOverrideCard.rank;}
  if(rank==='3'){g.activeConstraint=oldConstraint;g.baseOverrideCard=oldBase;effect=(oldBase||getEffectiveTopCard(g.discardPile.filter(c=>c.rank!=='3')))?.rank;}
  if(rank!=='3')g.activeConstraint=deriveConstraintFromRank(rank);
  const amount=selected.length+chain;
  if(effect==='9'&&amount%2)g.direction*=-1;
  const next=nextLiving(g,g.players.indexOf(p),effect==='8'?Math.min(amount,g.players.filter(q=>q!==p&&!q.hasFinished).length)+1:1);
  const drawn=refill(g,p);
  if(endIfEmpty(g,p,now))return;
  turn(g,next,now);
  const bonus=drawn.find(c=>c.rank===rank&&!c.isJoker);
  if(bonus){g.pendingFollowUp={playerId:p.id,cardId:bonus.id,resumeIndex:next,chainedRankCount:amount};g.pendingFaceUpSacrifice=null;g.currentTurnIndex=g.players.indexOf(p);g.turnDeadline=now+8000;}
}
function pickup(g,p,ids,now,auto=false) {
  if(g.players[g.currentTurnIndex]!==p)fail('It is not your turn.');
  if(p.hasFinished)fail('You have already finished.');
  if(g.pendingJoker)fail('Choose the Joker target first.');
  if(g.pendingFollowUp)fail('Answer the bonus draw first.');
  if(!auto&&now>g.turnDeadline)fail('Your turn has timed out.');
  const z=zone(g,p);
  if(z==='faceDown')fail('Flip a face-down card.');
  if(z==='faceUp'){
    if(p.faceUp.some(c=>legal(g,c)))fail('You have a legal face-up play.');
    if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)fail('Choose a face-up sacrifice.');
    const cards=ids.map(id=>p.faceUp.find(c=>c.id===id));
    if(cards.some(c=>!c)||cards.some(c=>c.rank!==cards[0].rank))fail('Choose your own face-up cards of one rank.');
    p.faceUp=p.faceUp.filter(c=>!ids.includes(c.id));p.hand.push(...cards);
  }else if(p.hand.some(c=>legal(g,c)))fail('You have a legal play.');
  collect(g,p);g.pendingFaceUpSacrifice=null;g.event={type:'pickup',playerId:p.id};turn(g,nextLiving(g,g.players.indexOf(p)),now);
}
function finishConcession(g,p) {if(!g.isRanked)fail('Casual departures require a server-controlled replacement.');p.conceded=true;p.hasFinished=true;p.finishRank=2;const q=g.players.find(q=>q!==p);q.hasFinished=true;q.finishRank=1;g.phase='FINISHED';g.turnDeadline=null;g.pendingFollowUp=null;g.pendingFaceUpSacrifice=null;g.event={type:'concede',playerId:p.id};}
function expire(g,now) {
  if(g.phase==='FINISHED'||now<g.turnDeadline)return false;
  if(g.phase==='SWAP'){g.players.forEach(p=>p.isReady=true);g.phase='PLAY';turn(g,0,now);return true;}
  const p=g.players[g.currentTurnIndex];
  if(g.pendingJoker){const target=g.players.filter(q=>q!==p&&!q.hasFinished).sort((a,b)=>count(a)-count(b))[0];joker(g,p,now,target.id);return true;}
  if(g.pendingFollowUp){const next=g.pendingFollowUp.resumeIndex;g.pendingFollowUp=null;turn(g,next,now);return true;}
  const away=now-p.lastSeen>=45000;
  if(away&&!p.isPermanentBot){p.isBot=true;p.isRankedSubstitute=true;p.substituteMoveCount++;if(g.isRanked&&p.substituteMoveCount>5){finishConcession(g,p);return true;}}
  const z=zone(g,p),moves=p[z].filter(c=>legal(g,c)).sort((a,b)=>RANK_VALUES[a.rank]-RANK_VALUES[b.rank]);
  if(z==='faceDown')play(g,p,[p.faceDown[0].id],now,{auto:true});
  else if(moves.length){const selected=moves[0];play(g,p,p[z].filter(c=>c.rank===selected.rank).map(c=>c.id),now,{auto:true});}
  else pickup(g,p,z==='faceUp'?[p.faceUp[0].id]:[],now,true);
  return true;
}
function mutate(current,uid,request,now=Date.now()) {
  const g=hydrate(current),p=uid&&g.players.find(p=>p.uid===uid);if(!p)fail('You are not at this table.');
  if(request.matchId!==g.matchId)fail('That match has ended.');
  if(!/^[a-zA-Z0-9_-]{8,80}$/.test(request.requestId||''))fail('Bad move request.');
  const key=crypto.createHash('sha256').update(uid+'|'+request.requestId).digest('hex');
  if(g.requests[key])return {game:g,duplicate:true};
  if(request.op==='tick'){
    const returning=p.isBot&&request.active===true;
    if(request.active===true){p.lastSeen=now;if(!p.conceded&&!p.isPermanentBot){p.isBot=false;p.isRankedSubstitute=false;p.substituteMoveCount=0;}}
    const changed=expire(g,now);
    if(!changed&&!returning){g.updatedAt=now;return {game:g,tick:true};}
  }else{
    if(g.phase==='FINISHED')fail('That match has ended.');
    if(request.op!=='ready'&&(!Number.isInteger(request.version)||request.version!==g.stateVersion))fail('The table changed. Try your move again.');
    if(request.op==='concede')finishConcession(g,p);
    else if(g.phase==='SWAP'){
      if(now>g.turnDeadline)fail('The swap window has ended.');
      if(p.isReady)fail('You are already ready.');
      if(request.op==='swap'){
        const h=p.hand.findIndex(c=>c.id===request.handId),f=p.faceUp.findIndex(c=>c.id===request.faceUpId);
        if(h<0||f<0)fail('Choose your hand and face-up card.');
        const slot=p.faceUp[f].slotIndex,temp=p.hand[h];p.hand[h]={...p.faceUp[f]};delete p.hand[h].slotIndex;p.faceUp[f]={...temp,slotIndex:slot};
      }else if(request.op==='ready'){p.isReady=true;if(g.players.every(q=>q.isReady)){g.phase='PLAY';turn(g,0,now);}}
      else fail('Finish swapping first.');
    }else if(request.op==='target'){if(!g.pendingJoker||g.pendingJoker.playerId!==p.id)fail('There is no Joker choice for you.');if(now>g.turnDeadline)fail('The Joker window has ended.');joker(g,p,now,request.targetId);}
    else if(request.op==='play')play(g,p,request.cardIds,now);
    else if(request.op==='pickup')pickup(g,p,request.cardIds||[],now);
    else if(request.op==='bonus'){
      const pending=g.pendingFollowUp;if(!pending||pending.playerId!==p.id)fail('There is no bonus draw for you.');
      if(now>g.turnDeadline)fail('The bonus window has ended.');
      if(request.accept===true)play(g,p,[pending.cardId],now,{followUp:true});
      else{g.pendingFollowUp=null;turn(g,pending.resumeIndex,now);}
    }else fail('Unknown game move.');
    p.lastSeen=now;
  }
  g.requests[key]={at:now};const keys=Object.keys(g.requests);if(keys.length>100)delete g.requests[keys[0]];
  g.stateVersion++;g.updatedAt=now;
  if(g.event&&JSON.stringify(g.event)!==JSON.stringify(current.event))g.event.version=g.stateVersion;
  if(g.phase==='PLAY'){
    const total=[g.drawPile.length,g.players.reduce((n,q)=>n+q.faceUp.length+q.faceDown.length,0),g.burntCards.length].join('|');
    g.stalemateTurns=total===current.lastProgressCount?(current.stalemateTurns||0)+1:0;g.lastProgressCount=total;
    if(g.stalemateTurns>=150){g.players.forEach(q=>{q.drew=true;q.hasFinished=true;q.finishRank=1;});g.phase='FINISHED';g.turnDeadline=null;g.pendingFollowUp=null;g.pendingFaceUpSacrifice=null;}
  }
  return {game:g};
}
const hidden=(n,prefix)=>Array.from({length:n},(_,i)=>({id:`${prefix}-${i}`,rank:'4',suit:'♠',hidden:true}));
function view(value,uid=null) {
  const g=hydrate(value);
  // Explicit allowlist: never spread canonical game state into client data.
  const out={authority:1,isRanked:g.isRanked,matchId:g.matchId,phase:g.phase,stateVersion:g.stateVersion,createdAt:g.createdAt,updatedAt:g.updatedAt,
    currentTurnIndex:g.currentTurnIndex,direction:g.direction,turnTimerMs:g.turnTimerMs,turnDeadline:g.turnDeadline,
    activeConstraint:g.activeConstraint,baseOverrideCard:g.baseOverrideCard,discardPile:clone(g.discardPile),playedHistory:clone(g.playedHistory.slice(-25)),
    drawPile:hidden(g.drawPile.length,'stock'),players:g.players.map(p=>({id:p.id,uid:p.uid||null,name:p.name,isHost:p.isHost,isBot:p.isBot,isRankedSubstitute:!!p.isRankedSubstitute,
      substituteMoveCount:p.substituteMoveCount,cosmetics:require('./private-delivery').publicCosmetics(p.cosmetics),rating:p.rating,isReady:p.isReady,hasFinished:p.hasFinished,finishRank:p.finishRank,conceded:!!p.conceded,drew:!!p.drew,
      gameStats:clone(p.gameStats),lobbyStats:clone(p.lobbyStats),lastPlayRank:p.lastPlayRank||null,
      hand:uid&&uid===p.uid?clone(p.hand):hidden(p.hand.length,p.id+'-hand'),faceUp:clone(p.faceUp),faceDown:p.faceDown.map(c=>({id:c.id,slotIndex:c.slotIndex,rank:'4',suit:'♠',hidden:true}))}))};
  if(g.pendingFollowUp)out.pendingFollowUp=uid&&uid===g.players.find(p=>p.id===g.pendingFollowUp.playerId)?.uid?clone(g.pendingFollowUp):{playerId:g.pendingFollowUp.playerId};
  if(g.pendingFaceUpSacrifice)out.pendingFaceUpSacrifice=clone(g.pendingFaceUpSacrifice);
  if(g.pendingJoker)out.pendingJoker=clone(g.pendingJoker);
  if(g.event)out.event=clone(g.event);
  return clone(out);
}
module.exports={newGame,mutate,view,expire,zone,count};
