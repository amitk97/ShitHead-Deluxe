// TikTok / Reels clip 2 "The Gauntlet" (Easy), ~21s, 1080×1920 with the game's own sounds and a
// voiceover in the how-to-play voice (narration/tt2-*.wav from tt23-voice.py): the welcome pop-up
// (5 bots, 3 lives), round 1 won, a life lost, the Boss round burnt with Ghost Flames, the champion
// pop-up, then the end card. The Ghost Flames and the victory effect are recorded 10× slower and laid
// out on the game's clock (the director's warp), so the WebGL burn plays back smooth.
// Run (Playwright + Chromium, SH_VIDEO_DEPS, FFMPEG_FULL with libx264):
//   node tools/video/tiktok2.js [--shots]   → tiktok2.mp4 next to this file
const path = require('path');
const { openGame, finish, wait } = require('./director');
const { tools, mux } = require('./tt-common');
const SILENT = path.join(__dirname, 'tiktok2-silent.webm'), SOUND = path.join(__dirname, 'tiktok2-sound.webm');
const GAME = path.join(__dirname, 'tiktok2-game.wav'), OUT = path.join(__dirname, 'tiktok2.mp4'), NAR = path.join(__dirname, 'narration');
const SHOTS = process.argv.includes('--shots');
const SLOW = 10;

(async () => {
  const g = await openGame(SILENT, { size: [1080, 1920], frame: [405, 720], audio: true, warp: true });
  const { page } = g;
  const { ev, cap, punch, at, until, VOICE, say } = tools(g);
  let n = 0;
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `tt2-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const setRound = (round, lives, scene) => ev(({ round, lives, scene }) => {
    const names = ['Pip', 'Pip', 'Marlow', 'Vex', 'The Boss'];
    state.gauntlet = { ...(state.gauntlet || {}), runId: 'v', round, lives, local: true };
    V.bot(0).name = names[round];
    state.gauntlet.bot = { name: names[round], avatar: V.bot(0).avatar };
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    V.scene(scene);
  }, { round, lives, scene });

  await ev(() => { window.showHelperTip = () => {}; window.runShuffleIntro = (cb) => cb(); document.getElementById('playerNameInput').value = 'You'; });
  // The round 1 table is set up first, so the welcome pop-up opens over it.
  await ev(() => startGauntletGame({ run: { id: 'v', round: 0, lives: 3 }, local: true }));
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number' && state.players.length === 2, null, { timeout: 25000 }).catch(() => {});
  await setRound(0, 3, { hand: [['A','♠'],['A','♣'],['5','♦']], faceUp: [['K','♣'],['8','♥'],['6','♦']], faceDown: [['4','♠'],['9','♣'],['5','♥']], pile: [['Q','♦']], draw: [['3','♦'],['K','♦'],['7','♥']],
    bots: [{ hand: [['5','♣'],['9','♦'],['J','♠']], faceUp: [['8','♠'],['Q','♥'],['6','♦']], faceDown: [['4','♣'],['7','♥'],['K','♥']] }], turn: 0 });
  await wait(page, 1200);
  await g.startAudio();
  // 0.0 Hook: the welcome pop-up, 5 bots and 3 lives.
  say('tt2-hook', 0.1);
  await ev(() => showGauntlet({ kind: 'welcome', status: { run: null, doneToday: false, firstDone: false, local: false } }));
  await cap('<b>5 bots</b> · <b>3 lives</b><br>1 shot a day ⚔️', '9%'); await shot('hook');
  await at(3.2); await cap(''); await ev(() => closeGauntlet());
  const t1 = 3.3;
  say('tt2-easy', t1); await cap('Round 1 · <b>Easy</b> 🙂'); await shot('round1');
  await at(t1 + 0.9); await cap(''); await ev(() => V.mePlay(['A', 'A']));
  await at(t1 + 2.2);
  await ev(() => showGauntlet({ kind: 'won', res: { run: { id: 'v', round: 1, lives: 3 } } })); await shot('won');
  await at(t1 + 3.6);
  // Round 4: the Hard bot takes a life.
  await ev(() => closeGauntlet());
  await setRound(3, 3, { hand: [['7','♣'],['4','♦'],['5','♠']], faceUp: [['9','♥'],['6','♣'],['8','♦']], faceDown: [['6','♥'],['K','♠'],['4','♥']], pile: [['A','♣']], draw: [['3','♦'],['J','♥']],
    bots: [{ hand: [['3','♠'],['J','♥'],['K','♦']], faceUp: [['A','♦'],['A','♥'],['2','♣']], faceDown: [['5','♦'],['9','♠'],['Q','♠']] }], turn: 0 });
  const t4 = t1 + 3.8;
  await at(t4); await cap('Round 4 · <b>Hard</b> 😬'); await shot('round4');
  await at(t4 + 1.1); say('tt2-life', t4 + 1.1); await cap('');
  await ev(() => showGauntlet({ kind: 'lost', res: { run: { id: 'v', round: 3, lives: 2 } } })); await shot('lost');
  await at(t4 + 3.3);
  // Round 5: the Boss, and a Pile of 22.
  await ev(() => closeGauntlet());
  const ranks = ['K','9','Q','6','A','8','J','4','K','5','Q','9','7','A','J','6','8','Q','5','K','9','A'], suits = ['♠','♥','♦','♣'];
  await setRound(4, 2, { hand: [['10','♥'],['5','♦'],['7','♠']], faceUp: [['Q','♣'],['8','♥'],['6','♦']], faceDown: [['K','♠'],['9','♣'],['5','♥']], pile: ranks.map((r, i) => [r, suits[i % 4]]), draw: [['3','♦'],['K','♣'],['Q','♥'],['6','♦']],
    bots: [{ hand: [['9','♦'],['6','♣'],['Q','♣']], faceUp: [['A','♦'],['J','♥'],['2','♠']], faceDown: [['9','♥'],['4','♣'],['Q','♥']] }], turn: 0 });
  const t5 = t4 + 3.5;
  await at(t5); say('tt2-boss', t5); await cap('Round 5 · the <b>BOSS</b> 😈'); await shot('boss');
  await at(t5 + 1.5); await cap('<b>22 cards</b> on the Pile.<br>Burn it! 🔥');
  await at(t5 + 2.4); await cap('');
  // Ghost Flames, in slow motion.
  await g.setRate(1 / SLOW);
  await ev(() => V.mePlay('10'));
  const tBurn = await until(() => (document.getElementById('burnFxLayer')?.childElementCount || 0) > 0);
  await punch(1.14, 1800);
  await at(tBurn + 0.3); say('tt2-burnt', tBurn + 0.3); await cap('<i>BURNT!</i> 🔥');
  await at(tBurn + 1.2); await shot('burn');
  await at(tBurn + 2.25); await cap('');
  // The victory effect, then the champion pop-up.
  await ev(() => { state.gauntlet = { ...state.gauntlet, round: 5 }; renderGauntletHud(); playVictoryEffect('victory-halloween'); });
  await at(tBurn + 3.6); await shot('victory');
  await ev(() => showGauntlet({ kind: 'completed', lives: 2, res: { diamondsAwarded: 200, first: true, run: null,
    newItems: [{ id: 'avatar-gauntlet', name: 'Gauntlet Champion' }, { id: 'frame-gauntlet', name: 'Gauntlet Gold' }] } }));
  say('tt2-clear', tBurn + 3.7);
  await g.setRate(1);
  await at(tBurn + 6.3); await shot('champion');
  // End card.
  const tEnd = tBurn + 6.6;
  await at(tEnd);
  await ev(() => { closeGauntlet(); V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>
    <div class="line" style="color:#fbbf24">Your turn.<br>Clear the Gauntlet 👇</div>
    <div class="url">shithead-deluxe.web.app</div>
    <div class="sub">Play free in your browser</div>
    <div class="sub" style="color:#cbd5e1;font-size:16px">Sign in to earn Diamonds<br>and the Gauntlet avatar</div>`); });
  say('tt2-end', tEnd + 0.3);
  await at(tEnd + 1.2); await shot('end');
  const END = tEnd + 3.0; await at(END);
  await mux({ g, finish, SILENT, SOUND, GAME, END, VOICE, NAR, OUT });
})();
