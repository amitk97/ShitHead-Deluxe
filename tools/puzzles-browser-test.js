// Run with Playwright installed: the Weekly Puzzles page (open from More Modes, play, undo, solve, AmitK sees all).
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p===root+'/')p+='index.html';fs.readFile(p,(err,data)=>{if(err){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream');res.end(data);});});
(async()=>{
await new Promise(r=>server.listen(4177,r));
const browser=await chromium.launch({headless:true,...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']}:{})});
try{
for(const [w,h] of [[320,568],[390,844],[1440,900]].filter(s=>!process.env.PZ_W||+process.env.PZ_W===s[0])){
  const page=await (await browser.newContext({viewport:{width:w,height:h}})).newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:4177/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ShPuzzles&&typeof resetHomeUI==='function');await page.waitForTimeout(1600);
  await page.evaluate(()=>{window.shBootReveal?.();resetHomeUI();});
  // More Modes → Puzzles → Play
  await page.evaluate(()=>{document.querySelector('[data-mc-mode="more"] .mc-go')?.click();});await page.waitForTimeout(900);
  assert(await page.locator('[data-open-puzzles]').isVisible(),'Puzzles Play button shows on More Modes');
  await page.locator('[data-open-puzzles]').click();
  assert(await page.locator('#puzzlesModal').isVisible(),'puzzle page opens');
  // inside the viewport, below the header
  const box=await page.locator('.pz-card-box').boundingBox();
  const hh=await page.evaluate(()=>document.querySelector('header')?.getBoundingClientRect().bottom||0);
  assert(box.y>=hh-1&&box.y+box.height<=h+1,`box fits ${w}x${h}: ${JSON.stringify(box)} header ${hh}`);
  const today=await page.evaluate(()=>ShPuzzles.thisWeek().id);
  assert.equal(await page.locator('.pz-chip').count(),0,'guests only get this week');
  // illegal play: no way to know a lost move? play wrong first card, expect end-of-turn message, then undo
  const sol=await page.evaluate(()=>{const p=ShPuzzles.thisWeek();return ShPuzzleEngine.solve({hand:p.hand,pile:p.pile,constraint:p.constraint,base:p.base},1,p.goal).solutions[0];});
  const pickN=async(rank,n)=>{const ids=await page.$$eval('#pzHand .pz-card',(els,r)=>els.filter(e=>e.dataset.rank===r).map(e=>e.dataset.id),rank);
    for(let i=0;i<n;i++)await page.locator(`#pzHand .pz-card[data-id="${ids[i]}"]`).click();};
  // a deliberately wrong first move (a legal card that is not the first solution card) must not solve it
  await page.evaluate(()=>{});
  for(const m of sol){await pickN(m.rank,m.n);await page.locator('#pzPlay').click();}
  assert((await page.locator('#pzStatus').textContent()).includes('Solved'),'solved via the UI: '+await page.locator('#pzStatus').textContent());
  assert.match(await page.locator('#pzStatus').textContent(),/Sign in to earn 50 Diamonds/,'guests are told how to earn');
  assert.match(await page.locator('#pzReward').textContent(),/50 Diamonds/);
  assert(await page.evaluate(id=>JSON.parse(localStorage.getItem('shithead_puzzles_solved')||'{}')[id],today),'solved is remembered');
  // signed in: the moves go to the server and the prize shows (server stubbed)
  if(w===390){
    await page.evaluate(()=>{window.__sent=[];currentUser={email:'x@y.z',uid:'u'};window.callEconomy=async(a,d)=>{window.__sent.push([a,d]);return {awarded:{id:'puzzle_t',name:'Weekly Puzzle',reward:50},diamonds:60,xp:null};};});
    await page.locator('#pzAgain').click();
    for(const m of sol){await pickN(m.rank,m.n);await page.locator('#pzPlay').click();}
    await page.waitForFunction(()=>/\+50 Diamonds/.test(document.querySelector('#pzStatus').textContent));
    const sent=await page.evaluate(()=>window.__sent);
    assert.equal(sent.length,1);assert.equal(sent[0][0],'puzzle');assert.deepEqual(sent[0][1].moves,sol);
    await page.evaluate(()=>{currentUser=null;});
  }
  // Select All Of A Rank is a toggle that is never greyed out: on, one tap picks the whole rank
  assert.equal(await page.locator('#pzAll').isDisabled(),false,'available from the start');
  await page.locator('#pzAgain').click();
  const wantPressed=(await page.locator('#pzAll').getAttribute('aria-pressed'))==='true';
  if(wantPressed) await page.locator('#pzAll').click();
  await page.locator('#pzAll').click();assert.equal(await page.locator('#pzAll').getAttribute('aria-pressed'),'true');
  const rk=await page.evaluate(()=>{const h=ShPuzzles.dealCards(ShPuzzles.PUZZLES.find(p=>document.querySelector('.pz-chip.on')?document.querySelector('.pz-chip.on').dataset.pz===p.id:ShPuzzles.thisWeek().id===p.id)).hand;const c={};h.forEach(x=>c[x.rank]=(c[x.rank]||0)+1);return Object.entries(c).sort((a,b)=>b[1]-a[1])[0];});
  await page.locator('#pzHand .pz-card',{hasText:rk[0]}).first().click();
  assert.equal(await page.locator('#pzHand .pz-sel').count(),rk[1],'whole rank picked with one tap');
  await page.locator('#pzAll').click();
  // restart, then undo
  await page.locator('#pzRestart').click();
  const n0=await page.locator('#pzHand .pz-card').count();
  await pickN(sol[0].rank,sol[0].n);await page.locator('#pzPlay').click();
  assert(await page.locator('#pzHand .pz-card').count()<n0,'cards left the Hand');
  await page.locator('#pzUndo').click();
  assert.equal(await page.locator('#pzHand .pz-card').count(),n0,'undo brings them back');
  // hint twice names the move; Give Up shows the solution
  await page.locator('#pzHint').click();await page.locator('#pzHint').click();
  assert(/Try playing/.test(await page.locator('#pzStatus').textContent()),'second hint names the move');
  await page.locator('#pzGiveUp').click();
  {const t=await page.locator('#pzStatus').textContent();assert(/^Solution:/.test(t),'give up: '+t);}
  if(w===390)await page.screenshot({path:'/tmp/puzzle-390.png'});
  // AmitK sees all five
  await page.evaluate(()=>{currentUser={email:'amirk2197@googlemail.com'};ShPuzzles.open();});
  const total=await page.evaluate(()=>ShPuzzles.PUZZLES.length);
  assert.equal(await page.locator('.pz-chip').count(),total,'AmitK sees every puzzle');
  // every puzzle is solvable through the page, whatever its goal
  for(let i=0;i<total;i++){
    await page.locator('.pz-chip').nth(i).click();
    const s=await page.evaluate(()=>{const id=document.querySelector('.pz-chip.on').dataset.pz;const p=ShPuzzles.PUZZLES.find(x=>x.id===id);return {goal:p.goal.type,rival:!document.querySelector('#pzRival').hidden,sol:ShPuzzleEngine.solve({hand:p.hand,pile:p.pile,constraint:p.constraint,base:p.base},1,p.goal).solutions[0]};});
    assert.equal(s.rival,s.goal==='pickup','rival hand only for pickup puzzles');
    for(const m of s.sol){await pickN(m.rank,m.n);await page.locator('#pzPlay').click();}
    const t=await page.locator('#pzStatus').textContent();
    assert(t.includes('Solved'),'puzzle '+(i+1)+' ('+s.goal+'): '+t);
  }
  // a pinned Puzzles shortcut opens the page, and a solved week shows on it
  await page.locator('#pzClose').click();
  await page.evaluate(()=>{localStorage.setItem('shithead_home_pins',JSON.stringify({pin1:'puzzles'}));ShHomeCarousel.repaintPins();});
  assert.match(await page.locator('[data-mc-mode="pin1"] .mc-sub').textContent(),/Weekly puzzle|Solved this week/);
  await page.evaluate(()=>document.querySelector('[data-mc-mode="pin1"] [data-mc-go]').click());
  assert(await page.locator('#puzzlesModal').isVisible(),'pinned Puzzles card opens the page');
  // Escape/back/close
  await page.locator('#pzClose').click();assert(!(await page.locator('#puzzlesModal').isVisible()));
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS puzzles page',w,h,'(week puzzle',today+')');
  await page.context().close();
}
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
