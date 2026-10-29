'use strict';
// Focused renderer review: real square card, paused clock, both layouts, cleanup and audio.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = process.env.SH_BURN_OUT || '/tmp/shitstorm-review';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.SH_CHROMIUM,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'game.local') return route.abort();
    if (u.pathname === '/') return route.fulfill({body:'<!doctype html><title>ShitStorm test</title>',contentType:'text/html'});
    const f = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'missing' });
    return route.fulfill({ body: fs.readFileSync(f), contentType: ({ '.js': 'text/javascript', '.webp': 'image/webp' })[path.extname(f)] || 'text/plain' });
  });
  await page.goto('https://game.local/');
  await page.setContent(`<style>
    *{box-sizing:border-box}body{margin:0;background:#081222;color:#f8e6bb;font:16px Arial}
    header{height:72px;padding:24px;background:#111b2b;border-bottom:1px solid #91733e}
    #burnFxLayer{position:absolute;inset:72px 0 0;overflow:hidden;background:radial-gradient(ellipse at 50% 52%,#193c3a,#0b202a 70%)}
    #discardCardsWrapper{position:absolute;left:50%;top:52%;width:72px;height:72px;transform:translate(-50%,-50%)}
    .card{position:absolute;inset:0;background:#fffaf0;color:#b91c1c;border:2px solid #c8b998;border-radius:8px;box-shadow:0 3px 7px #0008}
    .card-corner-rank{position:absolute;left:5px;top:3px;font:bold 18px Arial}.card-corner-suit{position:absolute;left:7px;top:23px;font:15px Arial}
    .card-centre-suit{position:absolute;left:30px;top:22px;font:30px Arial}
    footer{position:fixed;bottom:20px;left:0;right:0;text-align:center;color:#c8d2d3;font-size:12px}
    .bfx{position:absolute;pointer-events:none}
  </style><header>ShitHead Deluxe · ShitStorm preview</header><div id="burnFxLayer"><div id="discardCardsWrapper">
  <div class="card" data-card-id="under" style="transform:rotate(-6deg)"></div>
  <div class="card" data-card-id="top"><span class="card-corner-rank">10</span><span class="card-corner-suit">♥</span><span class="card-centre-suit">♥</span></div>
  </div></div><footer>Actual 72px square pile card · same gameplay renderer</footer>`);
  await page.addScriptTag({ url: 'https://game.local/art/burns/shitstorm/mascot-burn.js' });
  await page.evaluate(() => ShitstormBurn.preload());
  await page.addScriptTag({ path: path.join(ROOT, 'art/burns/level-3d/burns3d.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'sound.js') });
  const start = async (time, calm = false) => page.evaluate(({ time, calm }) => {
    ShLevel3D.clear(); window.__burnT = time;
    const host = document.getElementById('burnFxLayer'), els = [...document.querySelectorAll('[data-card-id]')];
    const r = els[1].getBoundingClientRect(), hr = host.getBoundingClientRect();
    if (!ShLevel3D.play('burn-lvl-shitstorm', host, r.x + r.width/2 - hr.x, r.y + r.height/2 - hr.y, 1, calm, {cardEls: els})) throw Error('WebGL renderer unavailable');
  }, {time, calm});
  for (const [width, height] of [[390,844],[1366,768]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(120);
    for (const time of [0,.2,.5,.85,1.2,1.6,1.95]) {
      await start(time); await page.waitForTimeout(160);
      await page.screenshot({ path: path.join(OUT, `${width}-${time}.png`) });
      assert.equal(await page.locator('.lb3d-canvas').count(), 1);
      assert.equal(await page.locator('[data-card-id="top"]').evaluate(el => getComputedStyle(el).visibility), 'hidden');
    }
    await start(.35, true); await page.waitForTimeout(80);
    await page.screenshot({path:path.join(OUT, `${width}-calm.png`)});
    await page.evaluate(() => { window.__burnT = .81; }); await page.waitForTimeout(80);
    assert.equal(await page.locator('.lb3d-canvas').count(), 0);
    await start(.85); await page.waitForTimeout(80);
    await page.evaluate(() => ShLevel3D.clear());
    assert.equal(await page.locator('.lb3d-canvas').count(), 0);
    assert.equal(await page.locator('[data-card-id="top"]').evaluate(el => getComputedStyle(el).visibility), 'visible');
    await start(2.01); await page.waitForTimeout(80);
    assert.equal(await page.locator('.lb3d-canvas').count(), 0);
  }
  const sound = await page.evaluate(async () => {
    const ctx = new OfflineAudioContext(1,48000*2.2,48000);
    const proxy = new Proxy(ctx,{get:(t,p)=>p==='state'?'running':typeof t[p]==='function'?t[p].bind(t):t[p]});
    SoundFX.prototype.playBurnSound.call({ctx:proxy,enabled:true,riffleEl:{volume:1},_burnKit:SoundFX.prototype._burnKit}, 'burn-lvl-shitstorm');
    const b=await ctx.startRendering(), d=b.getChannelData(0); let peak=0,sum=0,last=0;
    for(let n=0;n<d.length;n++){peak=Math.max(peak,Math.abs(d[n]));sum+=d[n]*d[n];if(Math.abs(d[n])>.001)last=n/48000;}
    return {peak,rms:Math.sqrt(sum/d.length),last,samples:Array.from(d)};
  });
  assert(sound.peak>.05 && sound.peak<.8, `audio peak ${sound.peak}`); assert(sound.last<2.05);
  const samples = sound.samples; delete sound.samples;
  const wav = Buffer.alloc(44+samples.length*2); wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
  samples.forEach((s,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,s))*32767),44+i*2));
  fs.writeFileSync(path.join(OUT,'shitstorm.wav'),wav);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({errors,sound,checks:'mobile/desktop, card hide/restore, replay, reduced motion, natural cleanup'},null,2));
  console.log(JSON.stringify({errors,sound})); await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
