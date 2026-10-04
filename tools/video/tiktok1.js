// TikTok Video 1 "Burnt… then Jokered" (owner, Oct 2026): your 10 burns a 22-card Pile
// with Ghost Flames, then "a few moments later" your mate Jake gets revenge with the
// Pumpkin Joker. 1080×1920, the game's own sounds plus a voiceover in the how-to-play voice
// (narration/tt1-*.wav from tiktok1-voice.py), placed at the same times as the moves below.
// Run (Playwright + Chromium, SH_VIDEO_DEPS, FFMPEG_FULL with libx264):
//   node tools/video/tiktok1.js [--shots]   → tiktok1.mp4 next to this file
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { openGame, finish, wait } = require('./director');
const SILENT = path.join(__dirname, 'tiktok1-silent.webm'), SOUND = path.join(__dirname, 'tiktok1-sound.webm');
const OUT = path.join(__dirname, 'tiktok1.mp4'), NAR = path.join(__dirname, 'narration');
const SHOTS = process.argv.includes('--shots');
const FF = process.env.FFMPEG_FULL || 'ffmpeg';
const END = 15.0;
const LAG = 0.2; // the screencast shows a change ~0.2s after it happens, so the sound waits for the picture
// Voice lines: [file, start (s)].
const VOICE = [['burn', 0.0], ['gone', 3.9], ['later', 5.7], ['joker1', 7.2], ['joker2', 10.4], ['follow', 12.2]];

(async () => {
  const g = await openGame(SILENT, { size: [1080, 1920], frame: [405, 720], audio: true });
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
  await ev(() => { window.showHelperTip = () => {}; document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(1); });
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
  await g.startAudio();
  const t0 = Date.now();
  const at = async (s) => { const d = t0 + s * 1000 - Date.now(); if (d > 0) await wait(page, d); };

  // Each caption is the line being spoken, shown as it starts (VOICE times; both reach
  // the video LAG late, so they stay together).
  const say = (name, html) => cap(html);
  // 0.0 Hook: a 22-card Pile, and your 10.
  await say('burn', '<b>22 cards</b> on the Pile?<br>Watch this! 👀'); await shot('hook');
  await at(2.6); await ev(() => V.mePlay('10'));
  await at(3.5); await punch(1.14, 2000);
  await at(3.9); await say('gone', '<i>GONE!</i> 🔥');
  await at(4.4); await shot('burn');
  // 5.7 Time skip (the flash says it while the voice does).
  await at(5.7);
  await ev(() => { document.getElementById('ttCap').classList.remove('show');
    const f = document.createElement('div'); f.id = 'ttFlash'; f.textContent = 'A few moments later…'; document.body.appendChild(f); });
  await at(6.0);
  await ev(() => {
    state.discardPile = [['5','♠'],['7','♦'],['8','♣'],['9','♠'],['J','♦'],['J','♣'],['Q','♠'],['Q','♦'],['K','♥'],['A','♣'],['A','♥'],['K','♦'],['A','♠'],['K','♣']].map(([r, s]) => V.c(r, s));
    V.me().hand = [['4','♣'],['6','♥'],['9','♦']].map(([r, s]) => V.c(r, s));
    V.turnTo(V.bot(0).id); render();
  });
  await at(7.1); await ev(() => document.getElementById('ttFlash')?.remove());
  await at(7.2); await say('joker1', 'Then my mate drops<br>a <b>Joker</b>… 🎃'); await shot('revenge');
  // 8.6 The Pumpkin Joker: the whole Pile comes to you (its BOO lands after the line).
  await at(8.6); await cap(''); await ev(() => V.botPlay(0, 'JOKER')); await punch(1.1, 1400, true);
  await at(9.3); await shot('boo');
  await at(10.4);
  await say('joker2', '…and I get <b>the lot!</b> 💀'); await ev(() => V.highlight('#localHand', 4)); await shot('karma');
  // 12.0 CTA, held to the end so the link can be read.
  await at(12.0);
  await ev(() => { V.clearHighlights(); document.getElementById('ttCap').classList.remove('show');
    V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>
    <div class="line">Follow for Part 2:<br>the card that folds into a swan 🦢</div>
    <div class="url">shithead-deluxe.web.app</div><div class="sub">Free · plays in your browser</div>`); });
  await at(13.0); await shot('end');
  await at(END);
  fs.writeFileSync(SOUND, await g.getAudio());
  await finish(g, SILENT, { lead: 0 });
  // Game sound under the voice, each line at its time, levelled for TikTok.
  const inputs = ['-i', SILENT, '-i', SOUND], parts = [`[1:a]volume=0.8,aresample=48000,adelay=${LAG * 1000}:all=1[g]`], labels = ['[g]'];
  VOICE.forEach(([name, s], i) => {
    inputs.push('-i', path.join(NAR, `tt1-${name}.wav`));
    parts.push(`[${i + 2}:a]aresample=48000,volume=1.35,adelay=${Math.round((s + LAG) * 1000)}:all=1[v${i}]`); labels.push(`[v${i}]`);
  });
  parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';'), '-map', '0:v', '-map', '[a]', '-t', String(END),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
  console.log('saved', OUT);
})();
