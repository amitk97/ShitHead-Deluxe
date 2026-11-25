// Builds docs/play-store/feature-graphic-1024x500.png (the Play Store feature graphic) from the app icon and
// two Play Store screenshots. NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=<dir with @fontsource-variable> node tools/make-feature-graphic.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');
const FD = process.env.SH_VIDEO_DEPS && path.join(process.env.SH_VIDEO_DEPS, 'node_modules/@fontsource-variable');
const lf = (name, id) => { try { return `@font-face{font-family:'${name}';font-weight:100 900;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(FD, id, 'files', id + '-latin-wght-normal.woff2')).toString('base64')}) format('woff2')}`; } catch (e) { return ''; } };
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FD ? lf('Cinzel', 'cinzel') + lf('Outfit', 'outfit') : ''}
html,body{margin:0;width:1024px;height:500px;overflow:hidden}
body{background:radial-gradient(circle at 38% 45%,#3b1a6b 0%,#120a2a 48%,#020617 85%);font-family:'Outfit',system-ui,sans-serif;position:relative}
.phone{position:absolute;width:196px;height:348px;border-radius:26px;overflow:hidden;border:4px solid #1e293b;box-shadow:0 16px 44px rgba(0,0,0,.7),0 0 0 2px rgba(251,191,36,.25);background:#020617}
.phone img{width:100%;display:block}
.p1{right:196px;top:78px;transform:rotate(-6deg)} .p2{right:36px;top:110px;transform:rotate(6deg)}
.txt{position:absolute;left:48px;top:0;height:500px;width:560px;display:flex;flex-direction:column;justify-content:center}
.icon{width:84px;height:84px;border-radius:20px;box-shadow:0 0 36px rgba(245,158,11,.45),0 8px 24px rgba(0,0,0,.6)}
.logo{font-family:'Cinzel',Georgia,serif;font-weight:900;font-size:86px;line-height:1;margin-top:14px;background:linear-gradient(180deg,#f87171,#b91c1c 45%,#5e0a0a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 3px 0 #fde047) drop-shadow(0 6px 14px rgba(0,0,0,.9))}
.deluxe{font-family:'Cinzel',Georgia,serif;font-weight:800;letter-spacing:.55em;color:#fbbf24;font-size:22px;margin:4px 0 0 .3em}
.tag{color:#fff;font-weight:900;font-size:30px;margin-top:16px;line-height:1.15}
</style></head><body>
<div class="txt"><img class="icon" src="data:image/png;base64,${b64('icons/icon-512-v302.png')}"><div class="logo">Shed Head</div><div class="deluxe">DELUXE</div><div class="tag">The classic card game.<br>Play bots, friends or Ranked.</div></div>
<div class="phone p1"><img src="data:image/png;base64,${b64('docs/play-store/screenshots/table.png')}"></div>
<div class="phone p2"><img src="data:image/png;base64,${b64('docs/play-store/screenshots/home.png')}"></div>
</body></html>`;
(async () => {
  const browser = await chromium.launch(process.env.SH_CHROMIUM ? { executablePath: process.env.SH_CHROMIUM, args: ['--no-sandbox'] } : {});
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'docs/play-store/feature-graphic-1024x500.png');
  await page.screenshot({ path: out });
  await browser.close();
  console.log('saved', out);
})();
