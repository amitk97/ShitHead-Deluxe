// ~22s Gauntlet clip: "Can you beat 5 bots in a row?" Welcome pop-up with
// the rewards, round 1 won, a life lost to the Hard bot, the Boss beaten,
// the champion screen.   node tools/video/gauntlet.js
const path = require('path');
const { openGame, finish, wait } = require('./director');
const OUT = path.join(__dirname, 'shithead-gauntlet.webm');
(async () => {
  const g = await openGame(OUT); const { page } = g;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const tableReady = () => page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number' && state.players.length === 2, null, { timeout: 20000 }).catch(() => {});
  // Straight to the PLAY phase with a scene; the HUD shows round + lives.
  const setRound = (round, lives, scene, lost) => ev(({ round, lives, scene, lost }) => {
    state.gauntlet = { ...(state.gauntlet || {}), runId: 'v', round, lives, local: true };
    if (lost !== undefined) gauntletHudLives = lost;
    V.bot(0).name = ['Pip', 'Pip', 'Marlow', 'Vex', 'The Boss'][round];
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    V.scene(scene);
  }, { round, lives, scene, lost });

  await ev(() => { document.getElementById('playerNameInput').value = 'You'; });
  await ev(() => V.card(`<div class="big">⚔️</div><div class="logo" style="font-size:54px">The Gauntlet</div><div class="line">5 bots. 3 lives.<br>Can you beat them all?</div>`));
  g.mark('start');
  await wait(page, 2600);

  // The welcome pop-up with the first-time rewards.
  await ev(() => { showGauntlet({ kind: 'welcome', status: { run: null, doneToday: false, firstDone: false, local: false } }); V.hideCard(); });
  await wait(page, 2800);

  // Round 1: in and out.
  await ev(() => { window.runShuffleIntro = (cb) => cb(); }); // no shuffle screen in a short clip
  await ev(() => startGauntletGame({ run: { id: 'v', round: 0, lives: 3 }, local: true }));
  await tableReady();
  await setRound(0, 3, { hand: [['A','♠'],['A','♣']], faceUp: [], faceDown: [], pile: [['Q','♦']], draw: [], bots: [{ hand: [['5','♣'],['9','♦'],['J','♠']], faceUp: [['8','♠'],['Q','♥'],['6','♦']], faceDown: [['4','♣'],['7','♥'],['K','♣']] }], turn: 0 });
  await ev(() => V.caption('Round 1: the Easy bot 🙂'));
  await wait(page, 1000);
  await ev(() => V.mePlay(['A', 'A']));
  await wait(page, 1400);
  await ev(() => { V.hideCaption(); showGauntlet({ kind: 'won', res: { run: { id: 'v', round: 1, lives: 3 } } }); });
  await wait(page, 1900);

  // Round 4: the Hard bot takes a life.
  await ev(() => closeGauntlet());
  await setRound(3, 2, { hand: [['7','♣'],['4','♦'],['5','♠']], faceUp: [['9','♥']], faceDown: [['6','♣']], pile: [['A','♣']], draw: [], bots: [{ hand: [['3','♠'],['J','♥']], faceUp: [], faceDown: [['5','♦']] }], turn: 0 }, 3);
  await ev(() => V.caption('Round 4: Hard. Lose and it costs a life 💔'));
  await wait(page, 2400);

  // Round 5: the Boss, one move from glory.
  await setRound(4, 2, { hand: [['10','♦']], faceUp: [], faceDown: [], pile: [['K','♠'],['A','♥'],['2','♣']], draw: [], bots: [{ hand: [['JOKER','🃏'],['A','♠'],['K','♦']], faceUp: [['2','♠'],['3','♥'],['A','♦']], faceDown: [['Q','♠'],['8','♦'],['9','♠']] }], turn: 0 });
  await ev(() => V.caption('Round 5: the BOSS 😈'));
  await wait(page, 1500);
  await ev(() => V.caption('Burn it. Win it. 🔥'));
  await ev(() => V.mePlay('10'));
  await wait(page, 2200);
  await ev(() => { V.hideCaption(); state.gauntlet = { ...state.gauntlet, round: 5 }; renderGauntletHud(); playVictoryEffect('victory-halloween'); });
  await wait(page, 1600);

  // Champion: the rewards only Gauntlet winners have.
  await ev(() => showGauntlet({ kind: 'completed', lives: 2, res: { diamondsAwarded: 200, first: true, run: null,
    newItems: [{ id: 'avatar-gauntlet', name: 'Gauntlet Champion' }, { id: 'frame-gauntlet', name: 'Gauntlet Gold' }] } }));
  await wait(page, 3200);

  await ev(() => { closeGauntlet(); V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">Take on the Gauntlet.<br>New run every day.</div><div class="url">shithead-pro.web.app</div><div class="sub">Free · no download</div>`); });
  await wait(page, 3000);
  await finish(g, OUT, { from: 'start', lead: 0.3 });
  console.log('saved', OUT);
})();
