/* Responsive lobby and host/guest behavior, with network writes confined to an in-memory room. */
'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']}: {})});
try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.hostname==='game.local'){
  const file=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2'};
  return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]}):route.fulfill({status:404,body:''});
 }
 const sdk=u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
 if(sdk && process.env.SH_VIDEO_DEPS)return route.fulfill({body:fs.readFileSync(path.join(process.env.SH_VIDEO_DEPS,'node_modules/firebase',sdk[1])),contentType:'application/javascript'});
 if(sdk || u.pathname.includes('canvas-confetti'))return route.continue();
 return route.abort();
});
await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>!!window.ShFriendsLobby);
await page.evaluate(()=>{
 devTestSuiteRunning=true;resetHomeUI();window.shBootReveal();currentUser=null;
 document.querySelectorAll('.fixed:not(.hidden)').forEach(el=>{if(el.id!=='lobbyScreen'&&el.id!=='gameTable')el.classList.add('hidden');});
 document.getElementById('singleOptions').classList.add('hidden');document.getElementById('multiOptions').classList.remove('hidden');setModePage('friends');
 document.getElementById('playerNameInput').value='AmitK';ShFriendsLobby.render();
});
assert(!await page.locator('#friendsHub').isVisible());
assert(await page.locator('#hostRoomBtn').isVisible());
await page.locator('#friendsJoinOpen').click();assert(await page.locator('#joinCodeInput').isVisible());
await page.locator('#modePageBack').click();
await page.locator('#hostRoomBtn').click();
assert.equal(await page.locator('[data-friends-mode]').count(),5);
assert(!await page.locator('#friendsSeats').isVisible());
assert.equal(await page.locator('[data-friends-mode="standard"]').getAttribute('aria-pressed'),'true');
await page.keyboard.press('1');assert(await page.locator('#friendsConfirmMode').isDisabled());
await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-friends-mode="house"]').getAttribute('aria-pressed'),'true');
await page.keyboard.press('4');assert(await page.locator('#friendsConfirmMode').isDisabled());
await page.keyboard.press('3');assert(!await page.locator('#friendsConfirmMode').isDisabled());
// Same geometry as Home, mouse swipe threshold, end stops and functional Go.
assert.equal(await page.locator('[data-friends-mode="standard"]').evaluate(el=>getComputedStyle(el).width),'124px');
const track=await page.locator('#friendsModeCarousel').boundingBox();
await page.mouse.move(track.x+track.width/2,track.y+90);await page.mouse.down();await page.mouse.move(track.x+track.width/2-70,track.y+90);await page.mouse.up();
assert.equal(await page.locator('[data-friends-mode="series"]').getAttribute('aria-pressed'),'true');
await page.locator('[data-friends-step=last]').click();assert(await page.locator('[data-friends-step=next]').isDisabled());
await page.locator('[data-friends-step=first]').click();assert(await page.locator('[data-friends-step=prev]').isDisabled());
await page.keyboard.press('2');
await page.evaluate(()=>{window.realInitHostRoom=initHostRoom;window.hostCalls=[];initHostRoom=async()=>hostCalls.push(ShFriendsLobby.draftMode());});
await page.locator('[data-friends-mode="house"] [data-friends-go]').click();
await page.waitForFunction(()=>hostCalls.length===1);
assert.deepEqual(await page.evaluate(()=>hostCalls),['house']);
await page.evaluate(()=>initHostRoom=realInitHostRoom);
for(const [width,height] of [[320,568],[390,844],[1440,900]]){
 await page.setViewportSize({width,height});
 await page.screenshot({path:`/tmp/setup-debug-${width}.png`});
 assert(await page.locator('#lobbyScreen').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
 await page.screenshot({path:`/tmp/friends-carousel-${width}.png`});
}
await page.setViewportSize({width:390,height:844});
await page.locator('#modePageBack').click();assert(!await page.locator('#friendsHub').isVisible());
console.log('PASS landing, separate join, five ordered modes, Standard default and keyboard selection');
await page.evaluate(()=>{
 // No production mutations: isolate every Firebase reference in an in-memory store.
 window.testRooms={}; window.testWrites=[];
 const copy=x=>x==null?null:JSON.parse(JSON.stringify(x));
 const snap=x=>({val:()=>copy(x),exists:()=>x!=null,forEach:()=>{}});
 db.ref=p=>({
  transaction:async fn=>{const next=fn(copy(testRooms[p]));if(next===undefined)return {committed:false,snapshot:snap(testRooms[p])};testRooms[p]=copy(next);testWrites.push(p);return {committed:true,snapshot:snap(next)};},
  update:async v=>{testRooms[p]={...(testRooms[p]||{}),...copy(v)};testWrites.push(p);},
  set:async v=>{testRooms[p]=copy(v);testWrites.push(p);},
  on:()=>{},off:()=>{},once:(type,cb)=>{const s=snap(testRooms[p]);if(cb)cb(s);return Promise.resolve(s);},
  onDisconnect:()=>({set:()=>Promise.resolve(),remove:()=>Promise.resolve(),cancel:()=>Promise.resolve()}),
  remove:()=>Promise.resolve()
 });
 currentUser={uid:'host_u',displayName:'AmitK'};playerXp={total:xpForLevel(25)};xpFeatureOn=true;document.body.classList.add('xp-on');
 state.phase='LOBBY';state.isMultiplayer=true;state.isHost=true;state.isRanked=false;state.localPlayerId='p_host';state.roomCode='123456';state.ruleMode='house';state.friendsMode='house';state.houseRules=JSON.parse(JSON.stringify(ShHouseRules.CLASSIC));
 state.players=[{id:'p_host',uid:'host_u',name:'AmitK',isHost:true,isBot:false,cosmetics:{avatar:'default',level:25}}];
 testRooms['rooms/123456']={phase:'LOBBY',hostId:'p_host',players:state.players,ruleMode:'house',friendsMode:'house',houseRules:state.houseRules};
 showMultiplayerLobbyView();setModePage('friends');
});
await page.locator('[data-friends-config="house"]').click();
assert(await page.locator('#friendsConfigModal').isVisible());
assert.equal(await page.locator('[data-house-rank="2"]').inputValue(),'reset');
assert.equal(await page.locator('[data-house-preset=classic]').getAttribute('aria-pressed'),'true');
assert.equal(await page.locator('#friendsBotCount option').count(),4);
await page.locator('[data-config-tab=table]').click();
await page.locator('#friendsBotCount').selectOption('3');
await page.waitForFunction(()=>state.players.filter(p=>p.isBot).length===3);
assert.equal(await page.locator('.pf-seat-empty').count(),0);
await page.locator('#friendsBotDifficulty').selectOption('hard');
await page.waitForFunction(()=>state.players.filter(p=>p.isBot).every(p=>p.difficulty==='hard'));
await page.locator('[data-config-tab=rules]').click();
await page.locator('[data-house-rank="2"]').selectOption('none');
await page.waitForFunction(()=>state.houseRules.cards['2']==='none');
assert.equal(await page.evaluate(()=>testRooms['rooms/123456'].players[0].houseRulesReady),false);
await page.locator('[data-config-tab=table]').click();
await page.locator('#turnTimerBtnRow button').first().click();
assert.equal(await page.evaluate(()=>testRooms['rooms/123456'].turnTimerMs),10000);
await page.locator('#friendsConfigBack').click();
await page.evaluate(()=>publishHouseRules('standard'));
if(await page.evaluate(()=>state.ruleMode==='standard')) await page.locator('#friendsSettingsTrigger').click();
assert.equal(await page.evaluate(()=>state.ruleMode),'house');
console.log('PASS classic defaults, 3 bot slots, difficulty, shared rules/speed, reject standard with 3 bots');
await page.locator('[data-friends-config="house"]').click();await page.locator('[data-config-tab=table]').click();await page.locator('#friendsBotCount').selectOption('0');await page.waitForFunction(()=>state.players.length===1);await page.locator('#friendsConfigBack').click();
await page.evaluate(()=>publishHouseRules('standard'));
if(await page.evaluate(()=>state.ruleMode==='standard')) await page.locator('#friendsSettingsTrigger').click();
assert(await page.locator('#friendsConfigModal').isVisible());assert(!await page.locator('#houseRulesPanel').isVisible());assert.equal(await page.locator('#friendsBotCount option').count(),3);
await page.locator('#friendsConfigBack').click();
await page.evaluate(()=>publishHouseRules('standard',null,'series'));
await page.locator('#friendsSettingsTrigger').click();
assert(await page.locator('#seriesPanel').isVisible());
assert.deepEqual(await page.locator('[data-series-best]').evaluateAll(els=>els.map(e=>e.dataset.seriesBest)),['3','5','7']);
assert.equal(await page.evaluate(()=>SERIES_RULES.bestOf[7]),70);
await page.evaluate(()=>{
 state.players.push({id:'guest',uid:'guest_u',name:'Pooja',isBot:false,cosmetics:{level:25}});testRooms['rooms/123456'].players=state.players;
 renderSeriesPanel();
});
for (const level of [20, 34, 35, 44, 45]) {
 await page.evaluate(level=>{playerXp={total:xpForLevel(level)};state.players[1].cosmetics.level=level;renderSeriesPanel();},level);
 assert.equal(await page.locator('[data-series-best="3"]').isDisabled(),false);
 assert.equal(await page.locator('[data-series-best="5"]').isDisabled(),level<35);
 assert.equal(await page.locator('[data-series-best="7"]').isDisabled(),level<45);
 if(level<35)assert((await page.locator('[data-series-best="5"]').innerText()).includes('Level 35'));
 if(level<45)assert((await page.locator('[data-series-best="7"]').innerText()).includes('Level 45'));
}
await page.evaluate(()=>{state.players[1].cosmetics.level=34;renderSeriesPanel();});
assert(await page.locator('[data-series-best="5"]').isDisabled());
assert(await page.locator('[data-series-best="7"]').isDisabled());
await page.evaluate(()=>{playerXp={total:xpForLevel(25)};state.players[1].cosmetics.level=25;renderSeriesPanel();});
console.log('PASS series level boundaries and opponent requirements');
await page.setViewportSize({width:320,height:568});
assert(await page.locator('.pf-config-card').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight&&el.scrollHeight<=el.clientHeight+1));
await page.locator('#friendsConfigBack').click();
assert(await page.locator('#lobbyScreen').evaluate(el=>el.scrollHeight<=el.clientHeight+1));
await page.setViewportSize({width:390,height:844});
console.log('PASS Standard and series settings, 3/5/7 options and compact series bounds');
await page.evaluate(()=>publishHouseRules('house',ShHouseRules.CLASSIC));await page.waitForFunction(()=>state.ruleMode==='house');
await page.evaluate(()=>{state.isHost=false;state.localPlayerId='guest';currentUser={uid:'guest_u'};ShFriendsLobby.render();renderHouseRulesPanel();});
assert(!await page.locator('[data-friends-config="house"]').isVisible());
assert.equal(await page.locator('[data-friends-mode="standard"]').getAttribute('aria-disabled'),'true');
const before=await page.evaluate(()=>testWrites.length);
assert.equal(await page.evaluate(()=>publishHouseRules('standard')),false);
assert.equal(await page.evaluate(()=>testWrites.length),before);
await page.locator('#friendsReviewRules').click();assert(await page.locator('[data-house-rank="2"]').isDisabled());assert(!await page.locator('#friendsCommonSettings').isVisible());await page.locator('#friendsConfigBack').click();
console.log('PASS guests see rules, cannot configure modes or write settings');
await page.evaluate(()=>{state.isHost=true;state.localPlayerId='p_host';currentUser={uid:'host_u'};updateLobbyPlayerList();});
// Account slots, in-app name form, overwrite and failure retention.
await page.locator('[data-friends-config="house"]').click();
assert.equal(await page.locator('[data-house-preset]').count(),4);
assert.equal(await page.locator('#housePreset').count(),0);
for(let slot=0;slot<3;slot++) {
 await page.locator(`[data-house-preset="${slot}"]`).click();
 await page.locator('#houseSaveBtn').click();
 await page.locator('#houseNameInput').fill(`Rules ${slot+1}`);
 await page.locator('#houseNameSave').click();
 await page.waitForFunction(()=>document.getElementById('houseNameModal').classList.contains('hidden'));
}
assert.equal(await page.evaluate(()=>testRooms['users/host_u/settings/houseRulesVariants'].filter(Boolean).length),3);
await page.locator('[data-house-preset="1"]').click();await page.locator('#houseSaveBtn').click();
await page.locator('#houseNameInput').fill('Renamed slot');await page.locator('#houseNameSave').click();
await page.waitForFunction(()=>document.getElementById('houseNameModal').classList.contains('hidden'));
assert.equal(await page.evaluate(()=>testRooms['users/host_u/settings/houseRulesVariants'][1].name),'Renamed slot');
assert.equal(await page.evaluate(()=>ShHouseRules.loadVariants('host_u')[1].name),'Renamed slot');
await page.evaluate(()=>{currentUser={uid:'other_u'};renderHouseRulesPanel();});
await page.waitForFunction(()=>document.querySelector('[data-house-preset="1"]').textContent==='Custom Rule 2');
await page.evaluate(()=>{localStorage.removeItem('shithead_house_rules_host_u');currentUser={uid:'host_u'};renderHouseRulesPanel();});
await page.waitForFunction(()=>document.querySelector('[data-house-preset="1"]').textContent==='Renamed slot');
await page.locator('#houseSaveBtn').click();
await page.evaluate(()=>{window.workingRef=db.ref;db.ref=p=>p.includes('/settings/houseRulesVariants')?{transaction:async()=>{throw new Error('offline');}}:workingRef(p);});
await page.locator('#houseNameInput').fill('Retry name');await page.locator('#houseNameSave').click();
await page.waitForFunction(()=>document.getElementById('houseNameError').textContent.includes('Could not save'));
assert.equal(await page.locator('#houseNameInput').inputValue(),'Retry name');
await page.locator('#houseNameCancel').click();await page.evaluate(()=>db.ref=workingRef);
await page.locator('#friendsConfigBack').click();
console.log('PASS three slots, rename overwrite, cloud restore, account isolation and visible save failure');
for(const [width,height] of [[320,568],[390,664],[390,844],[768,900],[1440,900]]){
 await page.setViewportSize({width,height});
 await page.locator('[data-friends-config="house"]').click();
 for(const tab of ['table','rules']) {
  await page.locator(`[data-config-tab="${tab}"]`).click();
  const bounds=await page.evaluate(()=>{const el=document.querySelector('.pf-config-card'),r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight,scroll:el.scrollHeight,client:el.clientHeight};});
  await page.screenshot({path:`/tmp/settings-debug-${width}-${tab}.png`});
  assert(bounds.left>=0&&bounds.right<=width&&bounds.top>=0&&bounds.bottom<=height+1,JSON.stringify(bounds));
  assert(bounds.scroll<=bounds.client+1,JSON.stringify(bounds));
 }
 for(let n=0;n<3;n++){
  await page.locator('#houseRulesPages button').nth(n).click();
  assert(await page.evaluate(()=>[...document.querySelectorAll('.house-powers select')].filter(el=>el.getClientRects().length).every(el=>{const r=el.getBoundingClientRect();return r.bottom<=innerHeight&&r.right<=innerWidth;})));
 }
 await page.screenshot({path:`/tmp/friends-settings-${width}.png`});
 await page.locator('#friendsConfigBack').click();
 const lobby=await page.locator('#lobbyScreen').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight,bottom:document.getElementById('startMultiGameBtn').getBoundingClientRect().bottom}));
 await page.screenshot({path:`/tmp/lobby-debug-${width}.png`});
 assert(lobby.scroll<=lobby.client+1 && lobby.bottom<=height,JSON.stringify({width,height,...lobby}));
 assert(await page.evaluate(()=>{const r=document.getElementById('friendsSeats').getBoundingClientRect(), seats=[...document.querySelectorAll('.pf-seat')].map(e=>e.getBoundingClientRect());return r.left>=0&&r.right<=innerWidth&&seats.every(s=>Math.abs(s.top-seats[0].top)<1)&&document.getElementById('prominentRoomCode').getBoundingClientRect().bottom<=r.top;}));
 await page.screenshot({path:`/tmp/friends-hub-${width}.png`});
}
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.pf-seat-empty').first().evaluate(el=>getComputedStyle(el).animationName),'none');
await page.locator('#modePageBack').click();assert.equal(await page.evaluate(()=>document.body.classList.contains('mode-page')),false);
assert.equal(await page.evaluate(()=>state.roomCode),'123456');
const catalog=await page.evaluate(()=>serverEconomyCatalog());
if(process.argv.includes('--export-catalog'))fs.writeFileSync(path.join(root,'functions/catalog.json'),JSON.stringify(catalog,null,1)+'\n');
assert.equal(catalog.series.bestOf[7],70);
assert.deepEqual(errors,[]);
console.log('PASS 320/390/768/1440 layouts, reduced motion, Back to root and server catalogue');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

