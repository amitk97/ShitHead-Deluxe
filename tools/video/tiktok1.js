// TikTok Video 1 "Burnt… then Jokered" (owner, Oct 2026): your 10 burns a 22-card Pile
// with Ghost Flames, then "a few moments later" your mate Jake gets revenge with the
// Pumpkin Joker. 1080×1920, the game's card sounds (owner: no burn or Joker sounds in the video)
// plus a voiceover in the how-to-play voice (narration/tt1-*.wav from tiktok1-voice.py).
// The whole take is recorded in slow motion (the director's warp clock, SLOW) and laid out on the
// game's own clock, so the WebGL burn and the Joker play back smooth at full speed; each game
// sound is put back at its own moment at normal speed, and each voice line is placed at the
// moment its effect really started in this take.
// Run (Playwright + Chromium, SH_VIDEO_DEPS, FFMPEG_FULL with libx264):
//   node tools/video/tiktok1.js [--shots]   → tiktok1.mp4 next to this file
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { openGame, finish, wait } = require('./director');
const SILENT = path.join(__dirname, 'tiktok1-silent.webm'), SOUND = path.join(__dirname, 'tiktok1-sound.webm');
const OUT = path.join(__dirname, 'tiktok1.mp4'), NAR = path.join(__dirname, 'narration');
const SHOTS = process.argv.includes('--shots');
const FF = process.env.FFMPEG_FULL || 'ffmpeg';
const END = 15.0;
const SLOW = 10;       // the game runs 10× slower while recorded
const LATENCY = 0.2;  // a screencast frame is stamped ~0.2s (real) after the change it shows

(async () => {
  const g = await openGame(SILENT, { size: [1080, 1920], frame: [405, 720], audio: true, warp: true });
  const { page, realPage } = g;
  let n = 0;
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `tt1-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // Big centred captions between the Pile and the hand, clear of TikTok's own buttons.
  const cap = (html) => ev((html) => {
    let c = document.getElementById('ttCap');
    if (!c) {
      const css = document.createElement('style');
      css.textContent = `#ttCap { position:fixed; left:22px; right:46px; top:49%; z-index:100002; pointer-events:none; text-align:center;
          font-family:'Outfit',sans-serif; font-weight:900; font-size:28px; line-height:1.12; color:#fff; padding:10px 12px; border-radius:16px;
          background:rgba(2,6,23,.74); text-shadow:0 2px 0 #000, 0 0 12px rgba(0,0,0,.8); opacity:0; transform:scale(.7) rotate(-3deg);
          transition:opacity .12s ease, transform .3s cubic-bezier(.2,1.8,.4,1); }
        #ttCap.show { opacity:1; transform:none; } #ttCap b { color:#fbbf24; } #ttCap i { font-style:normal; color:#fb923c; }
        #ttFlash { position:fixed; inset:0; z-index:100003; display:flex; align-items:center; justify-content:center; background:#fff;
          font-family:'Outfit',sans-serif; font-weight:900; font-size:34px; color:#0f172a; animation:ttFlash .8s ease-out forwards; }
        @keyframes ttFlash { 0% { background:#fff; color:#0f172a; } 30% { background:#020617; color:#fff; } 100% { background:#020617; color:#fff; } }`;
      document.head.appendChild(css);
      c = document.createElement('div'); c.id = 'ttCap'; document.body.appendChild(c);
    }
    if (!html) { c.classList.remove('show'); return; }
    c.innerHTML = html; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  }, html);
  // Camera punch-in on the Pile (and an optional shake), done on the host page's frame:
  // scaling about the Pile's centre keeps the Pile where it was while everything grows round it.
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

  // A 2-player Vs Bots table: you and your "mate" Jake.
  await ev(() => { window.showHelperTip = () => {}; audio.playBurnSound = () => {}; audio.playJokerSound = () => {}; document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(1); });
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number', null, { timeout: 25000 }).catch(() => {});
  await wait(page, 1500); // effect clips (the BOO) load 3s after start-up
  await ev(() => {
    const mate = V.bot(0); mate.name = 'Jake';
    mate.cosmetics = { ...(mate.cosmetics || {}), jokerEffect: 'joker-halloween' };
    equippedCosmetics.burnEffect = 'burn-halloween';
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    const ranks = ['K','9','Q','6','A','8','J','4','K','5','Q','9','7','A','J','6','8','Q','5','K','9','A'];
    const suits = ['♠','♥','♦','♣'];
    V.scene({ hand: [['10','♥'],['5','♦'],['7','♠']], faceUp: [['Q','♣'],['8','♥'],['6','♦']], faceDown: [['K','♠'],['9','♣'],['5','♥']],
      pile: ranks.map((r, i) => [r, suits[i % 4]]),
      bots: [{ hand: [['JOKER','🃏'],['6','♣'],['9','♦']], faceUp: [['A','♦'],['J','♥'],['2','♠']], faceDown: [['9','♥'],['4','♣'],['Q','♣']] }],
      draw: [['3','♦'],['K','♣'],['Q','♥'],['6','♦'],['J','♠'],['4','♥'],['8','♣']], turn: 0 });
  });
  await wait(page, 700);
  await g.setRate(1 / SLOW);
  await g.startAudio();
  // Times are on the game's clock (seconds since the start mark), which slows with g.setRate.
  const now = () => g.virt(Date.now() / 1000) - g.virt(g.marks.start);
  const at = async (s) => { while (now() < s) await new Promise(r => setTimeout(r, 8)); };
  const until = async (fn) => { while (!(await ev(fn))) await new Promise(r => setTimeout(r, 15)); return now(); };
  const VOICE = []; const say = (name, t, html) => { VOICE.push([name, t]); return html === undefined ? null : cap(html); };
  // The "A few moments later" card (the owner's picture, upscaled to exactly 1080×1920 by
  // tools/video/art/README) covers the whole video, on the host page above the game frame.
  const later = (on) => realPage.evaluate((on) => {
    let c = document.getElementById('fml');
    if (!c) {
      c = document.createElement('img'); c.id = 'fml'; c.src = '/tools/video/art/few-moments-later-1080x1920.png';
      c.style.cssText = 'position:fixed;left:0;top:0;width:1080px;height:1920px;z-index:10;opacity:0;transform:scale(1.08);transition:opacity .35s ease, transform 2.2s cubic-bezier(.2,.7,.3,1)';
      document.body.appendChild(c);
    }
    requestAnimationFrame(() => { c.style.opacity = on ? '1' : '0'; c.style.transform = on ? 'scale(1)' : 'scale(.97)'; if (!on) c.style.transition = 'opacity .4s ease, transform .4s ease-in'; });
  }, on);
  // Made (hidden) and decoded now, so its first change is a real fade, not a jump.
  await realPage.evaluate(() => { const i = new Image(); i.src = '/tools/video/art/few-moments-later-1080x1920.png'; return i.decode(); });
  await later(false);

  // 0.0 Hook: a 22-card Pile, and your 10.
  await say('burn', 0, '<b>22 cards</b> on the Pile?<br>Watch this! 👀'); await shot('hook');
  await at(1.7); await ev(() => V.mePlay('10'));
  // Ghost Flames, in slow motion: "Burnt!" as the flames take the Pile.
  const tBurn = await until(() => (document.getElementById('burnFxLayer')?.childElementCount || 0) > 0);
  await punch(1.14, 1800);
  await at(tBurn + 0.3); await say('burnt', tBurn + 0.3, '<i>BURNT!</i> 🔥');
  await at(tBurn + 1.2); await shot('burn');
  await at(tBurn + 2.15);
  // The burn has finished: "A few moments later…", spoken as the picture fades in.
  const tLater = tBurn + 2.25;
  await at(tLater); await ev(() => document.getElementById('ttCap').classList.remove('show')); await later(true); say('later', tLater + 0.12);
  await at(tLater + 0.6);
  await ev(() => {
    state.discardPile = [['5','♠'],['7','♦'],['8','♣'],['9','♠'],['J','♦'],['J','♣'],['Q','♠'],['Q','♦'],['K','♥'],['A','♣'],['A','♥'],['K','♦'],['A','♠'],['K','♣']].map(([r, s]) => V.c(r, s));
    V.me().hand = [['4','♣'],['6','♥'],['9','♦']].map(([r, s]) => V.c(r, s));
    V.turnTo(V.bot(0).id); render();
  });
  await at(tLater + 1.55); await later(false);
  const tJ1 = tLater + 2.0;
  await at(tJ1); await say('joker1', tJ1, 'Then my mate drops<br>a <b>Joker</b>… 🎃'); await shot('revenge');
  // The Pumpkin Joker, in slow motion: the whole Pile comes to you.
  await at(tJ1 + 1.2); await cap(''); await ev(() => V.botPlay(0, 'JOKER'));
  const tJoker = await until(() => (document.getElementById('jokerFxLayer')?.childElementCount || 0) > 0);
  await punch(1.1, 1400, true);
  await at(tJoker + 0.7); await shot('boo');
  await at(tJoker + 1.6);
  await say('joker2', tJoker + 1.6, '…and I get <b>the lot!</b> 💀'); await ev(() => V.highlight('#localHand', 4)); await shot('karma');
  // End card, held so the link can be read.
  const tEnd = tJoker + 2.9;
  await at(tEnd);
  await ev(() => { V.clearHighlights(); document.getElementById('ttCap').classList.remove('show');
    V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>
    <div class="line" style="color:#fbbf24">Think you can<br>beat the dev?<br>Prove it 👇</div>
    <div class="url">shithead-deluxe.web.app</div>
    <div class="sub">Play free in your browser online,<br>vs Friends or vs bots now</div>
    <div class="sub" style="color:#cbd5e1;font-size:16px">Sign in to complete challenges,<br>earn Diamonds and customise<br>your experience</div>`); });
  say('prove', tEnd + 0.3);
  await at(tEnd + 1.2); await shot('end');
  await at(END);
  fs.writeFileSync(SOUND, await g.getAudio());
  const t0 = g.marks.start; // real time of the start mark (finish moves it onto the game's clock)
  await finish(g, SILENT, { lead: 0, virtual: true, latency: LATENCY });
  console.log('voice', VOICE.map(([ns, t]) => `${ns}@${t.toFixed(2)}`).join(' '));
  // Game sound on the game's clock: each sound (an onset after quiet) is moved to the moment it
  // was played, at its own speed.
  const RAW = path.join(__dirname, 'tiktok1-sound.f32'), GAME = path.join(__dirname, 'tiktok1-game.wav'), SR = 48000;
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
  const parts = ['[1:a]aresample=48000,volume=0.8[g]'];
  const inputs = ['-i', SILENT, '-i', GAME], labels = ['[g]'];
  VOICE.forEach(([name, s], i) => {
    inputs.push('-i', path.join(NAR, `tt1-${name}.wav`));
    parts.push(`[${i + 2}:a]aresample=48000,volume=1.35,adelay=${Math.round(s * 1000)}:all=1[v${i}]`); labels.push(`[v${i}]`);
  });
  parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-t', String(END),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
  console.log('saved', OUT);
})();
