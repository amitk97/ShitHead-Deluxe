'use strict';
// Renders each 3D level burn's tile from its own hero frame (ShLevel3D.still)
// onto a dark tile with a gold rim, and writes art/burns/level-3d/<name>-tile.webp.
// Usage: NODE_PATH=$(npm root -g) node tools/make-level-3d-tiles.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TILES = { 'burn-lvl-inferno-sweep': { file: 'inferno-sweep-tile.webp', t: .37, cx: .6, cy: .56, cardH: .5 } };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.SH_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  const js = fs.readFileSync(path.join(ROOT, 'art/burns/level-3d/burns3d.js'), 'utf8');
  await page.setContent(`<body style="--card-bg:#0f172a;--card-border:#334155;--text-red:#ef4444;font-family:Arial"><script>${js}</script></body>`);
  for (const [id, o] of Object.entries(TILES)) {
    const data = await page.evaluate(([id, o]) => {
      const N = 384, scene = document.createElement('canvas'); scene.width = scene.height = N;
      ShLevel3D.still(id, scene, o.t, { cx: o.cx, cy: o.cy, cardH: N * o.cardH });
      const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
      const r = N * .16, clip = () => { g.beginPath(); g.roundRect(0, 0, N, N, r); };
      clip(); g.save(); g.clip();
      const bg = g.createRadialGradient(N * .5, N * .58, N * .05, N * .5, N * .55, N * .75);
      bg.addColorStop(0, '#3a1607'); bg.addColorStop(.45, '#170a06'); bg.addColorStop(1, '#060404');
      g.fillStyle = bg; g.fillRect(0, 0, N, N);
      g.drawImage(scene, 0, 0);
      const vg = g.createRadialGradient(N / 2, N / 2, N * .35, N / 2, N / 2, N * .72);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = vg; g.fillRect(0, 0, N, N); g.restore();
      // Gold rim: dark outer edge, bright bevel, soft inner shadow.
      const gold = g.createLinearGradient(0, 0, N, N);
      gold.addColorStop(0, '#fff1b8'); gold.addColorStop(.3, '#d9a43a'); gold.addColorStop(.55, '#8a5a17'); gold.addColorStop(.8, '#f2c45a'); gold.addColorStop(1, '#7a4b10');
      g.lineWidth = N * .045; g.strokeStyle = gold; g.beginPath(); g.roundRect(N * .0225, N * .0225, N * .955, N * .955, r * .9); g.stroke();
      g.lineWidth = N * .008; g.strokeStyle = 'rgba(255,248,215,.75)'; g.beginPath(); g.roundRect(N * .05, N * .05, N * .9, N * .9, r * .75); g.stroke();
      return c.toDataURL('image/webp', .9);
    }, [id, o]);
    const out = path.join(ROOT, 'art/burns/level-3d', o.file);
    fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', path.relative(ROOT, out));
  }
  await browser.close();
})();
