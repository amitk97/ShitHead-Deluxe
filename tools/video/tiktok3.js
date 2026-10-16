// TikTok / Reels clip 3 "Halloween is live", ~20s, 1080×1920 with the game's own sounds and a
// voiceover in the how-to-play voice (narration/tt3-*.wav from tt23-voice.py): the event pop-up
// scrolled through, a Ghost Flames burn, the Pumpkin Joker, what the event pays, then the end card.
// Needs a Halloween event live (15 Oct – 2 Nov): the pop-up reads the real event window.
// The burn and the Joker are recorded 10× slower and laid out on the game's clock (the director's warp).
// Run (Playwright + Chromium, SH_VIDEO_DEPS, FFMPEG_FULL with libx264):
//   node tools/video/tiktok3.js [--shots]   → tiktok3.mp4 next to this file
const path = require('path');
const { openGame, finish, wait } = require('./director');
const { tools, mux } = require('./tt-common');
const SILENT = path.join(__dirname, 'tiktok3-silent.webm'), SOUND = path.join(__dirname, 'tiktok3-sound.webm');
const GAME = path.join(__dirname, 'tiktok3-game.wav'), OUT = path.join(__dirname, 'tiktok3.mp4'), NAR = path.join(__dirname, 'narration');
const SHOTS = process.argv.includes('--shots');
const SLOW = 10;

(async () => {
  const g = await openGame(SILENT, { size: [1080, 1920], frame: [405, 720], audio: true, warp: true });
  const { page } = g;
  const { ev, cap, punch, at, until, VOICE, say } = tools(g);
  let n = 0;
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `tt3-${String(++n).padStart(2, '0')}-${name}.png`) }); };

  // A 2-player table: you and your "mate" Jake, who holds the Pumpkin Joker.
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
    const ranks = ['K','9','Q','6','A','8','J','4','K','5','Q','9','7','A','J','6','8','Q','5','K','9','A'], suits = ['♠','♥','♦','♣'];
    V.scene({ hand: [['10','♥'],['5','♦'],['7','♠']], faceUp: [['Q','♣'],['8','♥'],['6','♦']], faceDown: [['K','♠'],['9','♣'],['5','♥']],
      pile: ranks.map((r, i) => [r, suits[i % 4]]),
      bots: [{ hand: [['JOKER','🃏'],['6','♣'],['9','♦']], faceUp: [['A','♦'],['J','♥'],['2','♠']], faceDown: [['9','♥'],['4','♣'],['Q','♣']] }],
      draw: [['3','♦'],['K','♣'],['Q','♥'],['6','♦'],['J','♠'],['4','♥'],['8','♣']], turn: 0 });
    const css = document.createElement('style');
    css.textContent = `.ttRow { display:flex; flex-direction:column; align-items:center; gap:2px; opacity:0; animation:ttRow .5s cubic-bezier(.2,1.4,.4,1) forwards; }
      .ttRow b { font-family:'Outfit',sans-serif; font-weight:900; font-size:40px; line-height:1; color:#fbbf24; }
      .ttRow span { font-family:'Outfit',sans-serif; font-weight:800; font-size:18px; color:#e2e8f0; }
      @keyframes ttRow { from { opacity:0; transform:translateY(18px) scale(.9); } to { opacity:1; transform:none; } }`;
    document.head.appendChild(css);
  });
  await wait(page, 700);
  await g.startAudio();

  // 0.0 Hook.
  say('tt3-hook', 0.1); await cap('Halloween just took over<br>my card game 🎃'); await shot('hook');
  // 2.1 The event pop-up, scrolled through.
  await at(1.8); await cap('');
  await at(2.3); await ev(() => showEventPopup(activeSeasonalEvents()[0]));
  say('tt3-shop', 2.4); await shot('popup');
  const steps = 14;
  for (let i = 1; i <= steps; i++) { await at(2.9 + (i / steps) * 2.0); await ev((f) => { const c = document.getElementById('eventPopupCard'); c.scrollTop = (c.scrollHeight - c.clientHeight) * f; }, i / steps); }
  await shot('popup-end');
  await at(5.0);
  await ev(() => document.getElementById('eventPopupModal').classList.add('hidden'));
  // 5.0 Ghost Flames, in slow motion.
  say('tt3-burn', 5.05); await cap('<b>Ghost Flames</b> 🔥');
  await at(5.5); await g.setRate(1 / SLOW);
  await ev(() => { document.getElementById('ttCap').classList.remove('show'); V.mePlay('10'); });
  const tBurn = await until(() => (document.getElementById('burnFxLayer')?.childElementCount || 0) > 0);
  await punch(1.14, 1800);
  await at(tBurn + 1.2); await shot('burn');
  await at(tBurn + 2.25);
  // The Pumpkin Joker: the Pile comes back, and Jake drops the Joker.
  await ev(() => {
    state.discardPile = [['5','♠'],['7','♦'],['8','♣'],['9','♠'],['J','♦'],['J','♣'],['Q','♠'],['Q','♦'],['K','♥'],['A','♣'],['A','♥'],['K','♦'],['A','♠'],['K','♣']].map(([r, s]) => V.c(r, s));
    V.me().hand = [['4','♣'],['6','♥'],['9','♦']].map(([r, s]) => V.c(r, s));
    V.turnTo(V.bot(0).id); render();
  });
  const tJ = tBurn + 2.4;
  await at(tJ); say('tt3-joker', tJ); await cap('The <b>Pumpkin Joker</b> 🎃');
  await at(tJ + 1.0); await cap(''); await ev(() => V.botPlay(0, 'JOKER'));
  const tJoker = await until(() => (document.getElementById('jokerFxLayer')?.childElementCount || 0) > 0);
  await punch(1.1, 1400, true);
  await at(tJoker + 0.7); await shot('boo');
  await at(tJoker + 2.0);
  await g.setRate(1);
  // What the event pays, one row at a time with the voice.
  const tE = tJoker + 2.1;
  await at(tE);
  say('tt3-earn', tE);
  await ev(() => V.card(`<div class="logo" style="font-size:44px">Halloween</div><div class="deluxe">EVENT</div>
    <div class="ttRow" style="animation-delay:.1s"><b>+30 💎</b><span>extra on your daily login</span></div>
    <div class="ttRow" style="animation-delay:1.6s"><b>1.5× XP</b><span>on everything you play</span></div>
    <div class="ttRow" style="animation-delay:3.2s"><b>Top 10</b><span>win Diamonds on the event leaderboard</span></div>`));
  await at(tE + 1.0); await shot('earn');
  // End card.
  const tEnd = tE + 5.3;
  await at(tEnd);
  await ev(() => { document.getElementById('vCard').classList.remove('show'); setTimeout(() => V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>
    <div class="line" style="color:#fbbf24">Halloween ends<br>2 November 🎃</div>
    <div class="url">shithead-deluxe.web.app</div>
    <div class="sub">Play free in your browser</div>
    <div class="sub" style="color:#cbd5e1;font-size:16px">Sign in to earn Diamonds<br>and customise your look</div>`), 450); });
  say('tt3-end', tEnd + 0.6);
  await at(tEnd + 1.6); await shot('end');
  const END = tEnd + 3.4; await at(END);
  await mux({ g, finish, SILENT, SOUND, GAME, END, VOICE, NAR, OUT });
})();
