// Mumbai set: turns the Blender renders into game art (webp) with Chromium canvases.
// SH_CHROMIUM=<chromium> node tools/mumbai/compose.js <renders_dir>   (needs playwright)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const R = process.argv[2], ROOT = path.join(__dirname, '..', '..');
const b64 = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(R, n + '.png')).toString('base64');
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
  await sprite('gateway', 'art/mumbai/gateway.webp', 1100);
  await sprite('train_front', 'art/mumbai/train-front.webp', 760, 70);
  // tiffin pieces share one crop (the whole stack's), so lower tiers and the top tier stack exactly
  const tf = await pg.evaluate(async (srcs) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [all, low, top] = await Promise.all(srcs.map(load));
    const c = document.createElement('canvas'); c.width = all.width; c.height = all.height; const x = c.getContext('2d'); x.drawImage(all, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 200 && y < c.height * .9) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, k = 520 / h, res = {};
    [['low', low], ['top', top]].forEach(([n, im]) => { const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k); o.getContext('2d').drawImage(im, x0, y0, w, h, 0, 0, o.width, o.height); res[n] = o.toDataURL('image/webp', 0.9); });
    return res;
  }, [b64('tiffin_all'), b64('tiffin_low'), b64('tiffin_top')]);
  out('art/mumbai/tiffin-low.webp', tf.low); out('art/mumbai/tiffin-top.webp', tf.top);
  // avatar: the dabbawala bust on a marigold-and-magenta plate, 512 square
  out('art/avatars/mum-dabba.webp', await pg.evaluate(async ([g, m1, m2]) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [G, M1, M2] = await Promise.all([g, m1, m2].map(load));
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    let gr = x.createRadialGradient(256, 230, 20, 256, 250, 360); gr.addColorStop(0, '#d63a6e'); gr.addColorStop(.55, '#7a1747'); gr.addColorStop(1, '#2c0a24'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    const flower = (im, cx, cy, r, a) => { x.globalAlpha = a; x.drawImage(im, cx - r, cy - r, r * 2, r * 2); x.globalAlpha = 1; };
    flower(M1, 40, 470, 120, .75); flower(M2, 480, 460, 130, .75); flower(M2, 30, 60, 90, .6); flower(M1, 490, 50, 80, .6);
    gr = x.createRadialGradient(256, 230, 20, 256, 230, 330); gr.addColorStop(0, 'rgba(255,225,160,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    const s = Math.min(G.width, G.height) * 0.98; x.drawImage(G, (G.width - s) / 2, (G.height - s) / 2 - 6, s, s, -6, 6, 524, 524);
    return c.toDataURL('image/webp', 0.9);
  }, [b64('dabba'), b64('marigold'), b64('marigold_y')]));
  // card back 750x1050: a garland field of marigolds on deep maroon, thin gold border. No picture, no writing.
  out('art/backs/mum-marigold.webp', await pg.evaluate(async ([m1, m2]) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [A, B] = await Promise.all([m1, m2].map(load));
    const W = 750, H = 1050, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#6a1038'); g.addColorStop(1, '#2a0716'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(232,189,106,.35)'; for (let yy = 0; yy < H; yy += 50) for (let xx = (yy / 50 % 2) * 25; xx < W; xx += 50) { x.beginPath(); x.arc(xx, yy, 2.2, 0, 7); x.fill(); }
    const step = 200, r = 92;
    for (let row = -1; row * step * .88 < H + step; row++) for (let col = -1; col * step < W + step; col++) {
      const cx = col * step + (row % 2 ? step / 2 : 0), cy = row * step * .88, im = (row + col) % 2 ? A : B;
      x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 14; x.shadowOffsetY = 5; x.drawImage(im, cx - r, cy - r, r * 2, r * 2); x.restore();
    }
    g = x.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .72); g.addColorStop(0, 'rgba(255,200,120,.06)'); g.addColorStop(1, 'rgba(25,0,15,.5)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e8bd6a'; x.lineWidth = 8; x.strokeRect(24, 24, W - 48, H - 48);
    x.strokeStyle = 'rgba(232,189,106,.55)'; x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80);
    return c.toDataURL('image/webp', 0.9);
  }, [b64('marigold'), b64('marigold_y')]));
  // table: Marine Drive at dusk, 2160x1500. Calm promenade in the bottom 16%.
  out('art/mumbai/table-marine.webp', await pg.evaluate(async ([gw, sl]) => {
    const load = (s) => new Promise(r => { const m = new Image(); m.onload = () => r(m); m.src = s; });
    const [Gi, Si] = await Promise.all([gw, sl].map(load));
    const trim = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0; for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 30) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; } const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o; };
    const gt = trim(Gi), sl2 = trim(Si);
    const W = 2160, H = 1500, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const hz = H * .56;
    let g = x.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#120a32'); g.addColorStop(.5, '#4a2166'); g.addColorStop(.82, '#c2476a'); g.addColorStop(1, '#ff9a55'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(255,245,225,${.2 + rnd() * .5})`; x.beginPath(); x.arc(rnd() * W, rnd() * hz * .55, rnd() * 2 + .4, 0, 7); x.fill(); }
    // far skyline of towers with lit windows, in a dusk haze
    for (let i = 0; i < 80; i++) { const bw = 36 + rnd() * 70, bh = 60 + rnd() * 230, bx = rnd() * W; x.fillStyle = `rgba(40,16,58,${.85})`; x.fillRect(bx, hz - bh, bw, bh + 4); x.fillStyle = 'rgba(255,205,110,.55)'; for (let wy = hz - bh + 12; wy < hz - 8; wy += 22) for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) if (rnd() < .3) x.fillRect(wx, wy, 6, 9); }
    // the Sea Link spans the bay, the Gateway stands front left
    const put = (im, cx, w, flip, a = 1) => { const h = w * im.height / im.width; x.globalAlpha = a; if (!flip) x.drawImage(im, cx - w / 2, hz + 6 - h, w, h); else { x.save(); x.translate(0, hz * 2 + 12); x.scale(1, -1); x.drawImage(im, cx - w / 2, hz + 6 - h, w, h * .8); x.restore(); } x.globalAlpha = 1; };
    x.fillStyle = 'rgba(30,12,44,.55)'; put(sl2, W * .6, W * .7, false);
    // sea
    g = x.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#6a3a6e'); g.addColorStop(.2, '#261647'); g.addColorStop(1, '#0a0820'); x.fillStyle = g; x.fillRect(0, hz + 6, W, H - hz);
    put(sl2, W * .6, W * .7, true, .25);
    for (let y = hz + 10; y < H * .84; y += 7) { x.fillStyle = `rgba(255,170,120,${.025 + .05 * rnd() * (1 - (y - hz) / (H * .3))})`; x.fillRect(0, y, W, 2); }
    put(gt, W * .25, W * .4, false); put(gt, W * .25, W * .4, true, .28);
    // Queen's Necklace: lamps along the curve of the bay
    for (let i = 0; i < 36; i++) { const t = i / 35, px = W * (.5 + t * .48), py = hz + 38 + Math.sin(t * Math.PI) * 120 + t * 20; x.fillStyle = '#ffd98a'; x.shadowColor = 'rgba(255,210,120,.9)'; x.shadowBlur = 24; x.beginPath(); x.arc(px, py, 4.5, 0, 7); x.fill(); x.shadowBlur = 0; x.fillStyle = 'rgba(255,200,110,.22)'; x.fillRect(px - 1.5, py + 6, 3, 40 + rnd() * 30); }
    g = x.createLinearGradient(0, hz - 60, 0, hz + 140); g.addColorStop(0, 'rgba(255,150,110,0)'); g.addColorStop(.5, 'rgba(255,150,110,.18)'); g.addColorStop(1, 'rgba(255,150,110,0)'); x.fillStyle = g; x.fillRect(0, hz - 60, W, 200);
    g = x.createLinearGradient(0, H * .84, 0, H); g.addColorStop(0, '#241522'); g.addColorStop(1, '#120a16'); x.fillStyle = g; x.fillRect(0, H * .84, W, H * .16);
    x.fillStyle = '#f2b200'; x.fillRect(0, H * .84, W, 6); x.fillStyle = '#15110f'; for (let i = 0; i < W; i += 60) x.fillRect(i, H * .84, 30, 6);
    return c.toDataURL('image/webp', 0.88);
  }, [b64('gateway'), b64('sealink')]));
  await br.close();
})();
