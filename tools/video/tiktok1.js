// TikTok Video 1 "Jokered" (owner-approved script, Oct 2026): a mate dumps a
// 22-card Pile on you with a Joker, then you melt their next Pile with Lava Melt.
// 1080×1920 with the game's own sounds. Run (Playwright + Chromium, SH_VIDEO_DEPS):
//   node tools/video/tiktok1.js [--shots]   → tiktok1.mp4 next to this file
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { openGame, finish, wait } = require('./director');
const SILENT = path.join(__dirname, 'tiktok1-silent.webm'), SOUND = path.join(__dirname, 'tiktok1-sound.webm');
const OUT = path.join(__dirname, 'tiktok1.mp4');
const SHOTS = process.argv.includes('--shots');
const FF = process.env.FFMPEG_FULL || 'ffmpeg'; // needs libx264 + libopus

(async () => {
  const g = await openGame(SILENT, { size: [1080, 1920], frame: [405, 720], audio: true });
  const { page } = g;
  let n = 0;
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `tt1-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // Big centred TikTok captions, clear of TikTok's own buttons (right edge, bottom fifth).
  const cap = (html) => ev((html) => {
    let c = document.getElementById('ttCap');
    if (!c) {
      const css = document.createElement('style');
      css.textContent = `#ttCap { position:fixed; left:22px; right:46px; top:49%; z-index:100002; pointer-events:none; text-align:center;
          font-family:'Outfit',sans-serif; font-weight:900; font-size:27px; line-height:1.12; color:#fff; padding:10px 12px; border-radius:16px;
          background:rgba(2,6,23,.72); text-shadow:0 2px 0 #000, 0 0 12px rgba(0,0,0,.8); opacity:0; transform:scale(.9);
          transition:opacity .15s ease, transform .22s cubic-bezier(.2,1.5,.4,1); }
        #ttCap.show { opacity:1; transform:none; } #ttCap b { color:#fbbf24; }
        #ttFlash { position:fixed; inset:0; z-index:100003; display:flex; align-items:center; justify-content:center; background:#fff;
          font-family:'Outfit',sans-serif; font-weight:900; font-size:34px; color:#0f172a; animation:ttFlash .75s ease-out forwards; }
        @keyframes ttFlash { 0% { background:#fff; color:#0f172a; } 35% { background:#020617; color:#fff; } 100% { background:#020617; color:#fff; } }`;
      document.head.appendChild(css);
      c = document.createElement('div'); c.id = 'ttCap'; document.body.appendChild(c);
    }
    if (!html) { c.classList.remove('show'); return; }
    c.innerHTML = html; c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  }, html);

  // A 2-player Vs Bots table: you and your "mate" Jake.
  await ev(() => { window.showHelperTip = () => {}; document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(1); });
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number', null, { timeout: 25000 }).catch(() => {});
  await ev(() => {
    const mate = V.bot(0); mate.name = 'Jake';
    mate.cosmetics = { ...(mate.cosmetics || {}), jokerEffect: 'joker-grin' };
    equippedCosmetics.burnEffect = 'burn-lava';
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    const ranks = ['K','9','Q','6','A','8','J','4','K','5','Q','9','7','A','J','6','8','Q','5','K','9','A'];
    const suits = ['♠','♥','♦','♣'];
    V.scene({ hand: [['4','♣'],['5','♦'],['7','♠']], faceUp: [['Q','♣'],['8','♥'],['6','♦']], faceDown: [['K','♠'],['9','♣'],['5','♥']],
      pile: ranks.map((r, i) => [r, suits[i % 4]]),
      bots: [{ hand: [['JOKER','🃏'],['6','♣'],['9','♦']], faceUp: [['A','♦'],['J','♥'],['2','♠']], faceDown: [['9','♥'],['4','♣'],['Q','♣']] }],
      draw: [['3','♦'],['K','♣'],['Q','♥'],['6','♦'],['J','♠']], turn: 1 });
  });
  await wait(page, 800);
  await g.startAudio();
  const t0 = Date.now();
  const at = async (s) => { const d = t0 + s * 1000 - Date.now(); if (d > 0) await wait(page, d); };

  // 0.0–2.0 Hook: Jake's Joker dumps the whole Pile on you.
  await cap('My mate just did <b>THIS</b> to me 💀'); await shot('hook');
  await at(0.35); await ev(() => V.botPlay(0, 'JOKER'));
  await at(1.2); await shot('joker');
  // 2.0–3.5 The damage.
  await at(2.1);
  const count = await ev(() => V.me().hand.length);
  await cap(`<b>${count} cards.</b> In my hand.`); await ev(() => V.highlight('#localHand', 4)); await shot('hand');
  // 3.5–4.2 Time skip.
  await at(3.5);
  await ev(() => { V.clearHighlights(); document.getElementById('ttCap').classList.remove('show');
    const f = document.createElement('div'); f.id = 'ttFlash'; f.textContent = '3 turns later…'; document.body.appendChild(f); });
  await at(3.75);
  await ev(() => {
    const me = V.me(); me.hand = me.hand.filter(c => c.rank !== '10').slice(0, 16).concat([V.c('10', '♥')]);
    state.discardPile = [['5','♠'],['7','♦'],['8','♣'],['9','♠'],['J','♦'],['J','♣'],['Q','♠'],['Q','♦'],['K','♥'],['A','♣'],['A','♥'],['K','♦']].map(([r, s]) => V.c(r, s));
    V.turnTo(me.id); render();
  });
  await at(4.25); await ev(() => document.getElementById('ttFlash')?.remove());
  // 4.2–5.0 Revenge: the 10 lifts out of the hand.
  await cap('<b>Revenge.</b>'); await shot('revenge');
  await at(4.45); await ev(() => V.mePlay('10'));
  // 5.0–7.5 Payoff: Lava Melt, no caption.
  await at(5.15); await cap('');
  await at(5.9); await shot('lava1');
  await at(6.6); await shot('lava2');
  // 7.5–9.5 CTA.
  await at(7.5);
  await ev(() => V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>
    <div class="line">Follow for Part 2:<br>the card that folds into a swan 🦢</div>
    <div class="url">shithead-deluxe.web.app</div><div class="sub">Free · plays in your browser</div>`));
  await at(8.3); await shot('end');
  await at(9.6);
  const sound = await g.getAudio();
  fs.writeFileSync(SOUND, sound);
  await finish(g, SILENT, { lead: 0 });
  execFileSync(FF, ['-y', '-loglevel', 'error', '-i', SILENT, '-i', SOUND, '-map', '0:v', '-map', '1:a', '-t', '9.6',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
  console.log('saved', OUT);
})();
