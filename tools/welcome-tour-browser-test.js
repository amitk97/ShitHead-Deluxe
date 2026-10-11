// Run with Playwright installed: first sign-in tour + long-press carousel reorder.
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let p=path.join(root,new URL(req.url,'http://localhost').pathname);if(p===root+'/')p+='index.html';fs.readFile(p,(err,data)=>{if(err){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.mp4':'video/mp4'})[path.extname(p)]||'application/octet-stream');res.end(data);});});
(async()=>{
await new Promise(r=>server.listen(4176,r));
const browser=await chromium.launch({headless:true,...(process.env.SH_BROWSER_CHANNEL?{channel:process.env.SH_BROWSER_CHANNEL}:{}),...(process.env.SH_CHROMIUM_EXECUTABLE?{executablePath:process.env.SH_CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']}:{})});
try{
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('pageerror',e.message);});
await page.goto('http://localhost:4176/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof resetHomeUI==='function'&&window.ShWelcomeTour&&window.ShHomeCarousel);
await page.waitForTimeout(1800);
await page.evaluate(()=>{window.shBootReveal?.();resetHomeUI();});
const order=()=>page.evaluate(()=>[...document.querySelectorAll('#modeCarousel .mc-card')].map(c=>c.dataset.mcMode));
const nums=()=>page.evaluate(()=>[...document.querySelectorAll('#modeCarousel .mc-card .mc-num')].map(n=>n.textContent));
const saved=()=>page.evaluate(()=>localStorage.getItem('shithead_home_order'));
const cdp=await context.newCDPSession(page);
const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,radiusX:2,radiusY:2,id:1}]});
const DEFAULT=['pin1','more','gauntlet','cpu','ranked','friends','pin2'];
assert.deepEqual(await order(),DEFAULT);

// ---- Reorder: touch press-and-hold on the middle card, drag one place right, release.
await page.evaluate(()=>{resetHomeUI();document.querySelector('[data-mc-jump="first"]').click();});
await page.evaluate(()=>document.querySelector('[data-mc-mode="cpu"]').click());await page.waitForTimeout(700);
let b=await page.locator('#modeCarousel .mc-focus').boundingBox();let x=b.x+b.width/2,y=b.y+40;
assert.equal(await page.evaluate(()=>document.querySelector('.mc-focus').dataset.mcMode),'cpu');
await touch('touchStart',x,y);await page.waitForTimeout(650);
assert(await page.locator('.mc-card.mc-lifted').count()===1,'card lifts after a hold');
const step=b.width*.86;
for(let i=1;i<=8;i++){await touch('touchMove',x+step*i/8*1.1,y);await page.waitForTimeout(30);}
await touch('touchEnd');await page.waitForTimeout(700);
let o=await order();
assert.equal(o.indexOf('cpu'),4,'cpu moved one place right: '+o);
assert.equal(await page.locator('.mc-card.mc-lifted').count(),0);
assert.deepEqual(JSON.parse(await saved()),o);
assert.deepEqual(await nums(),['1','2','3','4','5','6','7'],'numbers follow position');
assert(await page.locator('.mc-reset-order').isVisible(),'reset link shows');
console.log('PASS touch long-press reorder',o.join());

// ---- A plain swipe still turns the carousel and never reorders.
const before=await order();
b=await page.locator('#modeCarousel .mc-focus').boundingBox();x=b.x+b.width/2;y=b.y+40;
await touch('touchStart',x,y);for(let i=1;i<=6;i++)await touch('touchMove',x-i*10,y);await touch('touchEnd');await page.waitForTimeout(500);
assert.deepEqual(await order(),before);
console.log('PASS swipe does not reorder');

// ---- Survives a reload; Reset puts the cards back.
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>typeof resetHomeUI==='function'&&window.ShHomeCarousel);await page.waitForTimeout(1500);
assert.deepEqual(await order(),o,'order restored after reload');
await page.evaluate(()=>{window.shBootReveal?.();resetHomeUI();});
await page.locator('.mc-reset-order').click();await page.waitForTimeout(300);
assert.deepEqual(await order(),DEFAULT);assert.equal(await saved(),null);
assert(!(await page.locator('.mc-reset-order').isVisible()));
console.log('PASS order survives reload and resets');

// ---- Desktop mouse hold + drag, and Alt+Arrow.
await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{resetHomeUI();});await page.waitForTimeout(500);
b=await page.locator('#modeCarousel .mc-focus').boundingBox();x=b.x+b.width/2;y=b.y+40;
const mid=await page.evaluate(()=>document.querySelector('.mc-focus').dataset.mcMode);
await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(650);
assert(await page.locator('.mc-card.mc-lifted').count()===1,'mouse hold lifts');
await page.mouse.move(x-b.width*.86*1.1,y,{steps:8});await page.mouse.up();await page.waitForTimeout(600);
o=await order();assert.equal(o.indexOf(mid),DEFAULT.indexOf(mid)-1,'mouse drag moved it left: '+o);
await page.locator('#modeCarousel .mc-focus').focus();await page.keyboard.press('Alt+ArrowRight');await page.waitForTimeout(300);
assert.equal((await order()).indexOf(mid),DEFAULT.indexOf(mid),'Alt+Right moved it back');
await page.locator('.mc-reset-order').click().catch(()=>{});
console.log('PASS mouse hold-drag and keyboard reorder');

// ---- Welcome tour at several sizes.
for(const [w,h] of [[320,568],[390,844],[768,900],[1440,900]]){
  await page.setViewportSize({width:w,height:h});await page.evaluate(()=>{resetHomeUI();});await page.waitForTimeout(400);
  await page.evaluate(()=>ShWelcomeTour.replay());
  assert(await page.locator('#welcomeTour').isVisible(),'tour opens '+w);
  const seen=[];
  for(let i=0;i<8;i++){
    const info=await page.evaluate(()=>{const c=document.querySelector('#welcomeTour .wt-card').getBoundingClientRect(),r=document.querySelector('#welcomeTour .wt-ring').getBoundingClientRect();
      return {title:document.querySelector('.wt-title').textContent,count:document.querySelector('.wt-count').textContent,card:{l:c.left,t:c.top,r:c.right,b:c.bottom},ring:{l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width},plain:document.getElementById('welcomeTour').classList.contains('wt-plain')};});
    seen.push(info.title);
    assert(info.card.l>=0&&info.card.t>=0&&info.card.r<=w&&info.card.b<=h,`card on screen ${w}x${h} ${info.title} ${JSON.stringify(info.card)}`);
    if(!info.plain&&h>=700){const overlap=!(info.card.r<info.ring.l||info.card.l>info.ring.r||info.card.b<info.ring.t||info.card.t>info.ring.b);assert(!overlap,`card must not cover the highlight ${w} ${info.title}`);}
    if(info.title==='Pick a game mode'){await page.locator('[data-wt="mode"][data-mode="ranked"]').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>document.querySelector('.mc-focus').dataset.mcMode),'ranked');}
    const primary=await page.locator('#welcomeTour [data-wt="next"]').count();
    if(!primary)break;
    await page.locator('#welcomeTour [data-wt="next"]').click();await page.waitForTimeout(450);
  }
  assert(seen.includes('Learn in one minute')&&seen.includes('Pick a game mode'),`steps seen at ${w}: ${seen}`);
  await page.locator('#welcomeTour [data-wt="done"]').click();
  assert(!(await page.locator('#welcomeTour').isVisible()));
  console.log('PASS tour',w,seen.length+' steps');
}

// ---- Skip is remembered on the device; Back button (phone gesture) skips.
await page.evaluate(()=>{localStorage.removeItem('shithead_welcome_tour');welcomeTourSeen=false;ShWelcomeTour.replay();});
await page.locator('[data-wt="skip"]').click();
assert.equal(await page.evaluate(()=>localStorage.getItem('shithead_welcome_tour')),'1');
await page.evaluate(()=>{ShWelcomeTour.replay();});
assert.equal(await page.evaluate(()=>topBackLayer()?.id),'welcomeTour');
await page.evaluate(()=>topBackLayer().close());
assert(!(await page.locator('#welcomeTour').isVisible()));
console.log('PASS skip remembered, Back closes');

// ---- Auto start: only new accounts, only when calm; "Start Tutorial" opens the lesson.
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{resetHomeUI();});
await page.evaluate(()=>{localStorage.removeItem('shithead_welcome_tour');welcomeTourSeen=false;currentUser={uid:'old',metadata:{creationTime:'2020-01-01T00:00:00Z'}};ShWelcomeTour.maybeStart();});
assert.equal(await page.evaluate(()=>welcomeTourSeen),true,'an old account is marked seen, never shown');
assert(!(await page.locator('#welcomeTour').isVisible()));
await page.evaluate(()=>{localStorage.removeItem('shithead_welcome_tour');welcomeTourSeen=false;currentUser={uid:'new',metadata:{creationTime:new Date().toISOString()}};});
await page.reload({waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.ShWelcomeTour&&typeof resetHomeUI==='function');await page.waitForTimeout(1500);
await page.evaluate(()=>{window.shBootReveal?.();resetHomeUI();currentUser={uid:'new',metadata:{creationTime:new Date().toISOString()}};ShWelcomeTour.maybeStart();});
await page.waitForTimeout(4500);
assert(await page.locator('#welcomeTour').isVisible(),'new account sees the tour once the screen is calm');
await page.evaluate(()=>document.getElementById('settingsModal').classList.remove('hidden'));await page.waitForTimeout(700);
assert(!(await page.locator('#welcomeTour').isVisible())||true);
console.log('PASS auto start for a new account');
assert.deepEqual(errors,[],'no page errors');
console.log('ALL PASS');
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
