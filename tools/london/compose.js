// London Calling: turns the Blender renders into game art (webp) with Chromium canvases.
// SH_CHROMIUM=<chromium> node tools/london/compose.js <renders_dir>   (needs playwright)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const R = process.argv[2], ROOT = path.join(__dirname, '..', '..');
const b64 = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(R, n + '.png')).toString('base64');
const UJ = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><rect width="60" height="30" fill="#012169"/><path d="M0,0 60,30M60,0 0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 60,30M60,0 0,30" stroke="#C8102E" stroke-width="2.4"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>`;
const ujUri = (w, h) => 'data:image/svg+xml;base64,' + Buffer.from(UJ(w, h)).toString('base64');
const out = (rel, b) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(b.split(',')[1], 'base64')); console.log('wrote', rel, (fs.statSync(f).size / 1024) | 0, 'KB'); };
(async () => {
  const br = await chromium.launch({ executablePath: process.env.SH_CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'] });
  const pg = await br.newPage();
  await pg.setContent('<body></body>');
  // trimmed sprite: crop to the alpha box, scale to a max side
  async function sprite(name, rel, max, thr = 12) {
    out(rel, await pg.evaluate(async ([src, max, thr]) => {
      const i = await new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = src; });
      const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > thr) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, max / Math.max(w, h));
      const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k);
      o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height); return o.toDataURL('image/webp', 0.88);
    }, [b64(name), max, thr]));
  }
  // Burn: the head-on front of the bus (scaled in the DOM as it drives at the camera), and the bow-on ship for the victory.
  await sprite('bus_front', 'art/london/bus-front2.webp', 760, 70);
  await sprite('ship', 'art/london/ship2.webp', 560, 70);
  await sprite('phonebox', 'art/london/phonebox.webp', 760);
    // Tower Bridge pieces share one crop box (the full bridge's), so they stack exactly
  const tb = await pg.evaluate(async (srcs) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [base, L, Rr, full] = await Promise.all(srcs.map(load));
    const c = document.createElement('canvas'); c.width = full.width; c.height = full.height; const x = c.getContext('2d'); x.drawImage(full, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 40 && y < c.height * .93) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, k = 1100 / w, res = {};
    [['base', base], ['leafL', L], ['leafR', Rr], ['full', full]].forEach(([n, im]) => { const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k); o.getContext('2d').drawImage(im, x0, y0, w, h, 0, 0, o.width, o.height); res[n] = o.toDataURL('image/webp', 0.88); });
    return res;
  }, [b64('tb_base'), b64('tb_leafL'), b64('tb_leafR'), b64('towerbridge')]);
  ['base', 'leafL', 'leafR', 'full'].forEach(n => out(`art/london/tb2-${n}.webp`, tb[n]));
  // avatar: Guardsman bust on a dimmed Union Jack plate, 512 square
  out('art/avatars/ldn-guard2.webp', await pg.evaluate(async ([g, uj]) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [G, U] = await Promise.all([load(g), load(uj)]);
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.drawImage(U, 0, 0, 512, 512); x.fillStyle = 'rgba(3,10,35,.55)'; x.fillRect(0, 0, 512, 512);
    const gr = x.createRadialGradient(256, 230, 20, 256, 230, 330); gr.addColorStop(0, 'rgba(255,230,170,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    const s = Math.min(G.width, G.height) * 0.98; x.drawImage(G, (G.width - s) / 2, (G.height - s) / 2 - 10, s, s, -8, 6, 528, 528);
    return c.toDataURL('image/webp', 0.9);
  }, [b64('guard'), ujUri(512, 512)]));
  // card back 750x1050: the Union Jack, cloth-like, with a soft vignette and a thin gold border. No picture, no writing.
  out('art/backs/ldn-unionjack.webp', await pg.evaluate(async ([uj]) => {
    const load = (u) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = u; });
    const U = await load(uj);
    const W = 750, H = 1050, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    // portrait: the flag turned on its side so the whole cross and both diagonals fill the card
    x.save(); x.translate(W / 2, H / 2); x.rotate(Math.PI / 2); x.drawImage(U, -H / 2, -W / 2 * 1.0, H, W); x.restore();
    x.globalAlpha = .08; x.strokeStyle = '#000'; x.lineWidth = 1; for (let i = 0; i < H; i += 5) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); } for (let i = 0; i < W; i += 5) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } x.globalAlpha = 1;
    const gr = x.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .72); gr.addColorStop(0, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,20,.45)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e8bd6a'; x.lineWidth = 8; x.strokeRect(24, 24, W - 48, H - 48);
    return c.toDataURL('image/webp', 0.9);
  }, [ujUri(1050, 750)]));
  // table: the Thames at night, 2160x1500. Calm paved floor in the bottom 16%.
  out('art/london/table-thames2.webp', await pg.evaluate(async ([bb, tbs, eye]) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [B, T, E] = await Promise.all([bb, tbs, eye].map(load));
    const trim = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0; for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 40 && y < c.height * .94) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o; };
    const b = trim(B), t = trim(T), e = trim(E);
    const W = 2160, H = 1500, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let g = x.createLinearGradient(0, 0, 0, H * .6); g.addColorStop(0, '#050a24'); g.addColorStop(.55, '#17255a'); g.addColorStop(1, '#6a4a7a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 170; i++) { x.fillStyle = `rgba(255,255,230,${.25 + rnd() * .6})`; x.beginPath(); x.arc(rnd() * W, rnd() * H * .42, rnd() * 2.2 + .4, 0, 7); x.fill(); }
    x.fillStyle = '#fff2c9'; x.shadowColor = 'rgba(255,240,190,.8)'; x.shadowBlur = 60; x.beginPath(); x.arc(W * .86, H * .1, 56, 0, 7); x.fill(); x.shadowBlur = 0;
    const hz = H * .58;
    for (let i = 0; i < 70; i++) { const bw = 40 + rnd() * 70, bh = 50 + rnd() * 150, bx = rnd() * W; x.fillStyle = '#0c1233'; x.fillRect(bx, hz - bh, bw, bh + 4); x.fillStyle = 'rgba(255,214,120,.5)'; for (let wy = hz - bh + 12; wy < hz - 8; wy += 22) for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) if (rnd() < .33) x.fillRect(wx, wy, 6, 9); }
    const put = (im, cx, h, flip) => { const k = h / im.height; if (!flip) x.drawImage(im, cx - im.width * k / 2, hz + 4 - h, im.width * k, h); else { x.save(); x.translate(0, hz * 2 + 8); x.scale(1, -1); x.drawImage(im, cx - im.width * k / 2, hz + 4 - h, im.width * k, h); x.restore(); } };
    const items = [[e, W * .17, H * .46], [b, W * .43, H * .56], [t, W * .76, H * .3]];
    items.forEach(([im, cx, h]) => put(im, cx, h, false));
    g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#0a1a44'); g.addColorStop(.35, '#0b2255'); g.addColorStop(1, '#07122e'); x.fillStyle = g; x.fillRect(0, hz + 4, W, H - hz);
    x.globalAlpha = .26; items.forEach(([im, cx, h]) => put(im, cx, h * .8, true)); x.globalAlpha = 1;
    for (let y = hz + 8; y < H * .84; y += 7) { x.fillStyle = `rgba(150,190,255,${.03 + .05 * rnd()})`; x.fillRect(0, y, W, 2); }
    g = x.createLinearGradient(0, hz - 60, 0, hz + 140); g.addColorStop(0, 'rgba(180,170,220,0)'); g.addColorStop(.5, 'rgba(180,170,220,.2)'); g.addColorStop(1, 'rgba(180,170,220,0)'); x.fillStyle = g; x.fillRect(0, hz - 60, W, 200);
    g = x.createLinearGradient(0, H * .84, 0, H); g.addColorStop(0, '#171a2c'); g.addColorStop(1, '#0d0f1c'); x.fillStyle = g; x.fillRect(0, H * .84, W, H * .16);
    x.fillStyle = '#c9a24c'; x.fillRect(0, H * .84, W, 5);
    return c.toDataURL('image/webp', 0.88);
  }, [b64('bigben'), b64('towerbridge'), b64('londoneye')]));
  await br.close();
})();
