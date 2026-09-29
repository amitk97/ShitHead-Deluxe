// Builds icons/share-preview-v2.jpg (1200×630), the picture link previews show
// (WhatsApp, iMessage, Discord, X, Facebook… via the og:image tag in
// index.html). Everything that matters sits in the middle 630×630, because
// some apps crop the preview to a square. The middle shows the four premium
// animated pictures (their flat 160px copies).
//   NODE_PATH=$(npm root -g) node tools/make-share-image.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const b64 = (p) => fs.readFileSync(path.join(ROOT, p)).toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@800;900&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden}
  body{background:radial-gradient(circle at 50% 42%, #3b1a6b 0%, #120a2a 45%, #020617 80%);font-family:'Outfit',system-ui,sans-serif;position:relative}
  .phone{position:absolute;top:70px;width:250px;height:540px;border-radius:34px;overflow:hidden;border:5px solid #1e293b;
    box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 0 2px rgba(251,191,36,.25);background:#020617}
  .phone img{width:100%;display:block}
  .l{left:48px;transform:rotate(-7deg)} .r{right:48px;transform:rotate(7deg)}
  .phone::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,6,23,.15),rgba(2,6,23,.35))}
  .mid{position:absolute;left:285px;width:630px;top:0;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .icon{width:96px;height:96px;border-radius:22px;box-shadow:0 0 40px rgba(245,158,11,.45),0 8px 24px rgba(0,0,0,.6)}
  .logo{font-family:'Cinzel',Georgia,serif;font-weight:900;font-size:84px;line-height:1;margin-top:10px;
    background:linear-gradient(180deg,#f87171,#b91c1c 45%,#5e0a0a);-webkit-background-clip:text;-webkit-text-fill-color:transparent;
    filter:drop-shadow(0 3px 0 #fde047) drop-shadow(0 6px 14px rgba(0,0,0,.9))}
  .deluxe{font-family:'Cinzel',Georgia,serif;font-weight:800;letter-spacing:.55em;color:#fbbf24;font-size:22px;margin:4px 0 0 .55em}
  .tag{color:#fff;font-weight:900;font-size:30px;margin-top:14px;line-height:1.15}
  .pics{display:flex;gap:12px;margin-top:18px}
  .pics img{width:84px;height:84px;border-radius:12px;box-shadow:0 0 22px rgba(251,191,36,.35),0 8px 20px rgba(0,0,0,.6)}
  .pills{display:flex;gap:10px;margin-top:18px}
  .pill{padding:8px 16px;border-radius:999px;border:2px solid #f59e0b;background:rgba(120,53,15,.45);color:#fde68a;font-weight:800;font-size:21px}
</style></head><body>
  <div class="phone l"><img src="data:image/png;base64,${b64('docs/screenshots/table.png')}"></div>
  <div class="phone r"><img src="data:image/png;base64,${b64('docs/screenshots/home.png')}"></div>
  <div class="mid">
    <img class="icon" src="data:image/png;base64,${b64('icons/icon-512.png')}">
    <div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>
    <div class="tag">The classic card game.<br>Free on your phone.</div>
    <div class="pics">${['sapphire-sovereign', 'crimson-inferno', 'scarlet-guardian', 'turtley'].map(n => `<img src="data:image/webp;base64,${b64('art/avatars/' + n + '-sm.webp')}">`).join('')}</div>
    <div class="pills"><span class="pill">vs Bots</span><span class="pill">Friends</span><span class="pill">Ranked</span></div>
  </div>
</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'icons/share-preview-v2.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('saved', out, fs.statSync(out).size, 'bytes');
})();
