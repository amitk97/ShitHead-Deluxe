// Renders tools/app-icon/icon.html into the app icons (v302). Needs Playwright + Chromium and Pillow:
//   node tools/app-icon/make-icons.js
// New files get new names (icons cache for a day), so update manifest.webmanifest, index.html and sw.js with them.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const V = 'v302';
const dir = __dirname, out = path.join(dir, '..', '..', 'icons');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, k] of [['full', 1], ['mask', 0.8]]) {
    await p.goto('file://' + path.join(dir, 'icon.html') + '?k=' + k);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(dir, `render-${name}.png`) });
  }
  await b.close();
  execFileSync('python3', ['-c', `
from PIL import Image
d, o, v = ${JSON.stringify(dir)}, ${JSON.stringify(out)}, ${JSON.stringify(V)}
full = Image.open(d + '/render-full.png').convert('RGB'); mask = Image.open(d + '/render-mask.png').convert('RGB')
for size, src, name in [(192, full, 'icon-192'), (512, full, 'icon-512'), (180, full, 'apple-touch-icon'), (512, mask, 'icon-maskable-512')]:
    src.resize((size, size), Image.LANCZOS).save(f'{o}/{name}-{v}.png', optimize=True)
`]);
  console.log('icons written to', out);
})();
