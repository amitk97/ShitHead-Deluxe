'use strict';
// Real UI regression coverage for the tutorial, settings and compact layouts.
// No account is signed in and external services are blocked by the fixture.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = path.resolve(__dirname, '..');
const out = process.env.SH_TUTORIAL_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'sh-tutorial-'));
fs.mkdirSync(out, { recursive: true });
let page;
async function auditModule(id,{resume=false}={}){
 const log=[],screens=new Set(),start=Date.now();let actions=0,lastActionAt=0,lastSig='';
 if(!resume){await page.evaluate(id=>{if(tutorialActive)endTutorial(false);launchTutorialModule(id)},id);await page.waitForTimeout(350);}
 try{while(Date.now()-start<100000&&actions<65){
  const info=await page.evaluate(()=>{const n=document.getElementById('tutorialNextBtn'),p=state.players[0],r=TUTORIAL_STEPS[tutorialStep]?.require;return{active:tutorialActive,step:tutorialStep,req:r,text:document.getElementById('tutorialText').innerText,next:!!(n&&n.getBoundingClientRect().height&&getComputedStyle(n).display!=='none'),nextText:n?.innerText,awaiting:tutorialAwaitingAction,bonus:!!state.pendingFollowUp,joker:!document.getElementById('floatingJokerBar')?.classList.contains('hidden'),hand:p?.hand?.map(c=>({id:c.id,rank:c.rank})),up:p?.faceUp?.map(c=>({id:c.id,rank:c.rank})),down:p?.faceDown?.map(c=>({id:c.id,slot:c.slotIndex})),selected:state.selectedPlayCardIds,toggle:selectAllOfRank,swap:typeof tutorialCurrentSwapRequirement==='function'?tutorialCurrentSwapRequirement(TUTORIAL_STEPS[tutorialStep]):null};});
  if(!info.active){log.push({complete:true,progress:await page.evaluate(()=>getTutorialProgress())});break;}
  const sig=info.step+':'+info.text;
  if(!screens.has(sig)){screens.add(sig);const meta=await page.evaluate(()=>{const ids=['tutorialCaption','tutorialStepCounter','tutorialModuleTitle','tutorialSkipBtn','tutorialNextBtn','playSelectedBtn'];return{size:[innerWidth,innerHeight],boxes:Object.fromEntries(ids.map(id=>{const e=document.getElementById(id),b=e.getBoundingClientRect(),s=getComputedStyle(e);return[id,{x:b.x,y:b.y,w:b.width,h:b.height,font:s.fontSize,display:s.display,visibility:s.visibility}]})),targets:[...document.querySelectorAll('.tutorial-glow')].map(e=>({id:e.id,rank:e.dataset.rank,r:e.getBoundingClientRect().toJSON()}))}});log.push({...info,meta});fs.writeFileSync(out+'/'+id+'-walk.json',JSON.stringify(log,null,2));await page.screenshot({path:out+'/'+id+'-'+String(log.length).padStart(2,'0')+'.png'});}
  if(info.next){await page.locator('#tutorialNextBtn').click({timeout:2500});actions++;lastActionAt=Date.now();await page.waitForTimeout(380);continue;}
  if(info.joker){await page.locator('#jokerInlineTargets button:not([data-tutorial-locked])').first().click({timeout:2500});actions++;lastActionAt=Date.now();await page.waitForTimeout(450);continue;}
  if(info.bonus){await page.locator('#followUpPlayBtn').click({timeout:2500});actions++;lastActionAt=Date.now();await page.waitForTimeout(450);continue;}
  if(Date.now()-lastActionAt<3200&&lastSig===String(info.step)){await page.waitForTimeout(250);continue;}
  const req=info.req;if(!req){await page.waitForTimeout(200);continue;}
  if(req.pickup){await page.locator('#discardPileContainer').click({timeout:2500});}
  else if(req.tapCheck){await page.locator(req.tapCheck).first().click({timeout:2500});}
  else if(req.holdCheck){for(const sel of ['#discardPileContainer','#localHand [data-card-id]']){await page.locator(sel).first().scrollIntoViewIfNeeded();const box=await page.locator(sel).first().boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(850);await page.mouse.up();await page.waitForTimeout(350);}}
  else if(req.toggleRankSelect){await page.locator('#multiSelectToggleBtn').click({timeout:2500});}
  else if(req.ready){await page.locator('#finishSwapBtn').click({timeout:2500});}
  else if(req.swap){const seq=req.sequence||[info.swap];for(const pair of seq){await page.locator('#localHand [data-rank="'+pair.handRank+'"]').first().click({timeout:2500});await page.locator('#localTableSlots [data-rank="'+pair.faceUpRank+'"]').first().click({timeout:2500});await page.waitForTimeout(200);}}
  else if(req.blind){const slot=req.blindSlot??info.down[0]?.slot??0;await page.locator('#localTableSlots .custom-card-back[data-slot="'+slot+'"]').click({timeout:2500});}
  else if(req.requireSnap){await page.locator('#snapBurnBtn').click({timeout:2500});}
  else if(req.rank){const ranks=Array.isArray(req.rank)?req.rank:[req.rank];const rank=ranks.find(r=>[...info.hand,...info.up].some(c=>c.rank===r));const wanted=req.count||1;const cards=[...info.hand,...info.up].filter(c=>c.rank===rank);let selected=await page.evaluate(()=>state.selectedPlayCardIds.length);for(const c of cards){if(selected>=wanted)break;await page.locator('#localHand [data-card-id="'+c.id+'"],#localTableSlots [data-card-id="'+c.id+'"]').first().click({timeout:2500});selected=await page.evaluate(()=>state.selectedPlayCardIds.length);}
   await page.locator(req.requireSnap?'#snapBurnBtn':'#playSelectedBtn').click({timeout:2500});}
  else throw new Error('Unknown requirement '+JSON.stringify(req));
  actions++;lastActionAt=Date.now();lastSig=String(info.step);await page.waitForTimeout(450);
 }
 const complete=!await page.evaluate(()=>tutorialActive);const report={id,complete,stepsSeen:[...new Set(log.filter(x=>x.step!==undefined).map(x=>x.step+1))],actions,seconds:(Date.now()-start)/1000,log};fs.writeFileSync(out+'/'+id+'-report.json',JSON.stringify(report,null,2));return{...report,log:undefined};
 }catch(e){await page.screenshot({path:out+'/'+id+'-failure.png'});const report={id,error:e.message,log};fs.writeFileSync(out+'/'+id+'-report.json',JSON.stringify(report,null,2));return{id,error:e.message,last:log.at(-1)};}
}

(async () => {
 const browser = await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE ? {executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']} : {})});
 try {
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const errors=[];page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname!=='game.local')return route.abort();
  const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:''});
  return route.fulfill({body:fs.readFileSync(f),contentType:({'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'})[path.extname(f)]||'application/octet-stream'});
 });
 await page.addLocatorHandler(page.locator('#eventPopupLaterBtn'), async()=>{await page.locator('#eventPopupLaterBtn').click()});
 await page.addInitScript(()=>{localStorage.setItem('shithead_hide_helpers','1');localStorage.setItem('shithead_whats_new','0');localStorage.setItem('shithead_tutorial_progress','{}');});
 await page.goto('https://game.local/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof launchTutorialModule==='function'&&typeof render==='function');
 await page.waitForTimeout(2200);await page.evaluate(()=>{window.shBootReveal?.();document.getElementById('eventPopupLaterBtn')?.click()});
 // 1–2. Previously blocked by the saved helper preference and short table.
 for(const [w,h]of [[320,568],[360,640]]){
  await page.setViewportSize({width:w,height:h});const result=await auditModule('quick_start');
  assert(result.complete,`${w}x${h}: ${JSON.stringify(result)}`);
  assert.deepEqual(result.stepsSeen,[1,2,3,4,5,6,7,8,9]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('shithead_hide_helpers')),'1','lesson must preserve helper preference');
  assert.equal(await page.locator('#cardRefBtn').isVisible(),false,'hidden preference restored after leaving');
  console.log(`PASS Quick Start with helpers hidden at ${w}x${h}`);
 }
 // 3. Long caption names wrap in their own row.
 await page.setViewportSize({width:320,height:568});await page.evaluate(()=>launchTutorialModule('cross_phase'));await page.waitForTimeout(400);
 const caption=await page.evaluate(()=>{const b=id=>document.getElementById(id).getBoundingClientRect().toJSON();return{title:b('tutorialModuleTitle'),skip:b('tutorialSkipBtn'),step:b('tutorialStepCounter'),cap:b('tutorialCaption')}});
 assert(caption.title.bottom<=caption.skip.top,'title must not overlap Skip');
 assert(caption.title.bottom<=caption.step.top,'title must not overlap counter');
 assert(caption.cap.x>=0&&caption.cap.right<=320&&caption.cap.bottom<=568,'caption inside viewport');
 await page.evaluate(()=>endTutorial(false));
 // 4. Header drawer and Settings tab keyboard navigation.
 if(await page.locator('#tutorialHubScreen').isVisible())await page.locator('#tutorialHubCloseBtn').click();
 await page.locator('#hamburgerBtn').click();assert.equal(await page.locator('#hamburgerDrawer').evaluate(e=>e.inert),false);
 await page.locator('#menuSettingsBtn').click();assert.equal(await page.locator('#hamburgerDrawer').evaluate(e=>e.inert),true);
 await page.locator('[data-settings-tab="gameplay"]').click();await page.locator('[data-settings-tab="gameplay"]').focus();
 await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[aria-selected="true"][data-settings-tab]').getAttribute('data-settings-tab'),'display');
 await page.keyboard.press('End');assert.equal(await page.locator('[aria-selected="true"][data-settings-tab]').getAttribute('data-settings-tab'),'access');
 await page.keyboard.press('Home');assert.equal(await page.locator('[aria-selected="true"][data-settings-tab]').getAttribute('data-settings-tab'),'gameplay');
 await page.locator('#settingsCloseBtn').click();await page.locator('#hamburgerBtn').focus();
 for(let i=0;i<24;i++){await page.keyboard.press('Tab');const hit=await page.evaluate(()=>({drawer:!!document.activeElement.closest('#hamburgerDrawer'),width:document.activeElement.getBoundingClientRect().width}));assert(!hit.drawer,'closed drawer must not take Tab focus');assert(hit.width>0,'zero-width header controls must not take focus');}
 console.log('PASS closed-menu focus and Settings keyboard tabs');
 // 5. Settings content, type and close target at supported sizes.
 for(const [w,h]of [[320,568],[360,640],[390,844],[1366,768]]){
  await page.setViewportSize({width:w,height:h});await page.locator('#headerSettingsBtn').click();
  for(const tab of ['gameplay','display','sound','access']){
   await page.locator(`[data-settings-tab="${tab}"]`).click();await page.waitForTimeout(100);
   const layout=await page.evaluate(()=>{const p=settingsModal.firstElementChild.getBoundingClientRect(),c=settingsCloseBtn.getBoundingClientRect();return{panel:p.toJSON(),close:c.toJSON(),fonts:[...document.querySelectorAll('#settingsModal .settings-searchable .text-left > span:last-child:not(:first-child)')].filter(e=>e.getBoundingClientRect().height).map(e=>parseFloat(getComputedStyle(e).fontSize))}});
   assert(layout.close.width>=44&&layout.close.height>=44,'close touch target');
   assert(layout.panel.y>=44&&layout.panel.bottom<=h,'Settings stays in viewport');
   assert(layout.fonts.every(f=>f>=12),'Settings descriptions readable');
   await page.screenshot({path:path.join(out,`settings-${w}x${h}-${tab}.png`)});
  }
  await page.locator('#settingsSearchInput').fill('motion');assert(await page.locator('#setMotionRow').isVisible());
  await page.locator('#settingsSearchInput').fill('not-a-setting-zz');assert(await page.locator('#settingsNoResultsMsg').isVisible());
  await page.locator('#settingsSearchInput').fill('');await page.locator('#settingsCloseBtn').click();
 }
 console.log('PASS Settings sizing and search on mobile and desktop');
 // 6. Coach timers pause while safe settings remain usable.
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>launchTutorialModule('card_3'));await page.waitForTimeout(400);
 await page.locator('#tutorialNextBtn').click();await page.locator('#headerSettingsBtn').click();
 assert(await page.locator('#settingsModal').isVisible());assert(await page.locator('#settingsTutorialNotice').isVisible());
 const frozen=await page.evaluate(()=>({pile:state.discardPile.map(c=>c.id),step:tutorialStep}));
 await page.waitForTimeout(1800);assert.deepEqual(await page.evaluate(()=>({pile:state.discardPile.map(c=>c.id),step:tutorialStep})),frozen,'Coach must wait while Settings is open');
 assert(await page.locator('#setRankRow').isDisabled());assert(await page.locator('#headerSpeedSlider').isDisabled());
 await page.locator('[data-settings-tab="sound"]').click();assert(await page.locator('#muteBtn').isEnabled());
 await page.locator('#muteBtn').click();assert.equal(await page.evaluate(()=>masterVolume),0);
 await page.locator('[data-settings-tab="access"]').click();await page.locator('#setMotionRow').click();assert.equal(await page.evaluate(()=>reduceMotion),true);
 await page.locator('#setContrastRow').click();assert.equal(await page.evaluate(()=>highContrast),true);
 await page.screenshot({path:path.join(out,'lesson-settings.png')});await page.locator('#settingsCloseBtn').click();
 await page.waitForFunction(()=>state.discardPile.some(c=>c.rank==='3'),null,{timeout:5000});
 await page.evaluate(()=>endTutorial(false));assert(await page.locator('#setRankRow').isEnabled());
 await page.evaluate(()=>{reduceMotion=false;highContrast=false;applyAccessibilityPrefs()});
 console.log('PASS tutorial Settings pause, sound/accessibility and gameplay lock restoration');
 // 7. All modules still use Standard Rules and complete through real actions.
 const ids=await page.evaluate(()=>[QUICK_START_MODULE,...TUTORIAL_HUB_MODULES,...TUTORIAL_HUB_ADVANCED_MODULES,...TUTORIAL_CARD_ROSTER].map(m=>m.id));
 for(const id of ids){const r=await auditModule(id);assert(r.complete,JSON.stringify(r));console.log(`PASS lesson ${id}`);}
 await page.evaluate(()=>launchTutorialModule('card_2'));await page.waitForTimeout(400);assert((await page.locator('#tutorialModuleTitle').innerText()).toLowerCase().includes('standard rules'));
 await page.locator('#tutorialNextBtn').click();const before=await page.evaluate(()=>({hand:state.players[0].hand.map(c=>c.rank).sort(),pile:state.discardPile.map(c=>c.rank)}));
 await page.locator('#localHand [data-rank="2"]').click();await page.locator('#playSelectedBtn').click();await page.waitForTimeout(1000);await page.locator('#tutorialBackBtn').click();await page.locator('#tutorialNextBtn').click();
 assert.deepEqual(await page.evaluate(()=>({hand:state.players[0].hand.map(c=>c.rank).sort(),pile:state.discardPile.map(c=>c.rank)})),before,'Back/replay restores board');
 await page.locator('#tutorialSkipBtn').click();assert.equal(await page.evaluate(()=>tutorialActive),false);assert.equal(await page.evaluate(()=>tutorialTimers.length),0);
 assert.equal(await page.evaluate(()=>state.pendingFollowUp),null);assert(await page.locator('#floatingJokerBar').isHidden());
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof reduceMotion==='boolean'&&typeof masterVolume==='number');
 assert.equal(await page.evaluate(()=>reduceMotion),true,'Reduce Motion persists');assert.equal(await page.evaluate(()=>highContrast),true,'contrast persists');assert.equal(await page.evaluate(()=>masterVolume),0,'mute persists');
 assert.deepEqual(errors,[],'no page exceptions');
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({passed:true,modules:ids.length,sizes:[[320,568],[360,640],[390,844],[1366,768]],errors,source:'local checkout, actual browser UI',physicalDevice:false},null,2));
 console.log(`ALL PASS: ${ids.length} lessons, compact phone recovery, settings, focus, Back/replay and cleanup. Artifacts: ${out}`);
 } finally { await browser.close(); }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
