// Shared parts of the 9:16 TikTok/Reels clips tiktok2.js and tiktok3.js (tiktok1.js keeps its own copy):
// big captions, the camera punch-in, the game's clock helpers, and the final mix (the game's own
// sounds put back at the moment each was played, plus the voiceover lines, H.264 + AAC).
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const FF = process.env.FFMPEG_FULL || 'ffmpeg';

function tools(g) {
  const { page, realPage } = g;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // A big caption; `top` = where it sits (49% = between the Pile and the hand).
  const cap = (html, top = '49%') => ev(({ html, top }) => {
    let c = document.getElementById('ttCap');
    if (!c) {
      const css = document.createElement('style');
      css.textContent = `#ttCap { position:fixed; left:22px; right:46px; z-index:100002; pointer-events:none; text-align:center;
          font-family:'Outfit',sans-serif; font-weight:900; font-size:28px; line-height:1.12; color:#fff; padding:10px 12px; border-radius:16px;
          background:rgba(2,6,23,.74); text-shadow:0 2px 0 #000, 0 0 12px rgba(0,0,0,.8); opacity:0; transform:scale(.7) rotate(-3deg);
          transition:opacity .12s ease, transform .3s cubic-bezier(.2,1.8,.4,1); }
        #ttCap.show { opacity:1; transform:none; } #ttCap b { color:#fbbf24; } #ttCap i { font-style:normal; color:#fb923c; }`;
      document.head.appendChild(css);
      c = document.createElement('div'); c.id = 'ttCap'; document.body.appendChild(c);
    }
    if (!html) { c.classList.remove('show'); return; }
    c.style.top = top; c.innerHTML = html; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  }, { html, top });
  // Camera punch-in on the Pile (and an optional shake), on the host page's frame.
  const punch = async (z, ms, shake = false) => {
    const p = await ev(() => { const r = document.getElementById('pileZone').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await realPage.evaluate(({ x, y, z, ms, shake }) => {
      const f = document.getElementById('g'), S = 1080 / 405;
      const at = (s, dx = 0, dy = 0) => `translate(${x * (S - 1) + dx}px, ${y * (S - 1) + dy}px) scale(${S * s})`;
      f.style.transformOrigin = `${x}px ${y}px`; f.style.transform = at(1);
      const k = shake
        ? [{ transform: at(1) }, { transform: at(z, -14, 6), offset: .12 }, { transform: at(z, 12, -8), offset: .22 }, { transform: at(z, -9, 4), offset: .32 },
           { transform: at(z, 6, -3), offset: .42 }, { transform: at(z), offset: .55 }, { transform: at(1) }]
        : [{ transform: at(1) }, { transform: at(z), offset: .25 }, { transform: at(z * .985), offset: .7 }, { transform: at(1) }];
      f.animate(k, { duration: ms, easing: 'cubic-bezier(.3,.7,.3,1)' });
    }, { ...p, z, ms, shake });
  };
  // Times are seconds on the game's clock since the start mark (it slows with g.setRate).
  const now = () => g.virt(Date.now() / 1000) - g.virt(g.marks.start);
  const at = async (s) => { while (now() < s) await new Promise(r => setTimeout(r, 8)); };
  const until = async (fn) => { while (!(await ev(fn))) await new Promise(r => setTimeout(r, 15)); return now(); };
  const VOICE = [];
  const say = (name, t) => { VOICE.push([name, t]); };
  return { ev, cap, punch, now, at, until, VOICE, say };
}

// Everything after the last scene: stop, lay the frames out, rebuild the game sound, mix the voice.
async function mux({ g, finish, SILENT, SOUND, GAME, END, VOICE, NAR, OUT, gameVol = 0.6, latency = 0.2 }) {
  fs.writeFileSync(SOUND, await g.getAudio());
  const t0 = g.marks.start; // real time of the start mark (finish moves it onto the game's clock)
  await finish(g, SILENT, { lead: 0, virtual: true, latency });
  console.log('voice', VOICE.map(([ns, t]) => `${ns}@${t.toFixed(2)}`).join(' '));
  // Each game sound (an onset after quiet) is moved to the moment it was played, at its own speed.
  const RAW = GAME.replace(/\.wav$/, '.f32'), SR = 48000;
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', SOUND, '-af', 'aresample=48000:async=1:first_pts=0', '-ac', '2', '-f', 'f32le', RAW]);
  const raw = new Float32Array(fs.readFileSync(RAW).buffer.slice(0)); fs.unlinkSync(RAW);
  const ns = raw.length / 2, out = new Float32Array(Math.ceil(END * SR) * 2), W = 480; // 10ms windows
  const level = (w) => { let m = 0; for (let k = w * W; k < Math.min(ns, (w + 1) * W); k++) m = Math.max(m, Math.abs(raw[2 * k]), Math.abs(raw[2 * k + 1])); return m; };
  let quiet = 99, events = 0;
  for (let w = 0; w * W < ns; w++) {
    const l = level(w);
    if (l > 0.01 && quiet >= 5) { // a new sound: copy it until 150ms of quiet (≤ 2s)
      let e = w, q = 0; while (e * W < ns && e - w < 200 && q < 15) { q = level(e) < 0.003 ? q + 1 : 0; e++; }
      const dst = Math.round((g.virt(t0 + w * W / SR) - g.virt(t0)) * SR);
      for (let k = 0; k < (e - w) * W && w * W + k < ns; k++) { const o = dst + k; if (o >= out.length / 2) break; out[2 * o] += raw[2 * (w * W + k)]; out[2 * o + 1] += raw[2 * (w * W + k) + 1]; }
      events++; w = e - 1; quiet = 0; continue;
    }
    quiet = l < 0.003 ? quiet + 1 : 0;
  }
  console.log('game sounds', events);
  const wav = Buffer.alloc(44 + out.length * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + out.length * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(out.length * 2, 40);
  out.forEach((v, k) => wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + k * 2));
  fs.writeFileSync(GAME, wav);
  const parts = [`[1:a]aresample=48000,volume=${gameVol}[g]`];
  const inputs = ['-i', SILENT, '-i', GAME], labels = ['[g]'];
  VOICE.forEach(([name, s], i) => {
    inputs.push('-i', path.join(NAR, `${name}.wav`));
    parts.push(`[${i + 2}:a]aresample=48000,volume=1.35,adelay=${Math.round(s * 1000)}:all=1[v${i}]`); labels.push(`[v${i}]`);
  });
  parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-t', String(END),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
  console.log('saved', OUT);
}

module.exports = { tools, mux };
