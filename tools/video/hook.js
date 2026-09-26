// ~15s social hook: everything on one blind flip. Straight into the action
// (no title card first): Noah flips blind and has to pick up, you flip your
// last card and win.   node tools/video/hook.js
const path = require('path');
const { openGame, finish, wait } = require('./director');
const OUT = path.join(__dirname, 'shithead-hook-blind-flip.webm');
(async () => {
  const g = await openGame(OUT); const { page } = g;
  const ev = (fn, arg) => page.evaluate(fn, arg);

  await ev(() => { document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(2); });
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number', null, { timeout: 20000 }).catch(() => {});
  await ev(() => {
    V.bot(0).name = 'Noah'; V.bot(1).name = 'Emma';
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    // Everyone is down to their face-down cards.
    V.scene({ hand: [], faceUp: [], faceDown: [['2','♥']], pile: [['9','♣'],['J','♦'],['K','♠']], draw: [],
      bots: [{ hand: [], faceUp: [], faceDown: [['6','♦'],['Q','♣']] }, { hand: [['K','♥']], faceUp: [], faceDown: [['8','♠']] }], turn: 1 });
    V.caption('Last card. Face down. 😱');
  });
  g.mark('start');
  await wait(page, 1500);

  // Noah flips a 6 on a King: red, he takes the pile.
  await ev(() => { V.caption('Noah flips blind…'); const p = V.bot(0); V.turnTo(p.id); executePlayCards(p.id, [p.faceDown[0]], true); });
  await wait(page, 2600);
  await ev(() => V.caption('💀 Pick up the pile, Noah'));
  await wait(page, 1300);

  // Emma slams a King back down.
  await ev(() => { V.hideCaption(); V.botPlay(1, 'K'); });
  await wait(page, 1200);

  // Your last card: a 2 goes on anything.
  await ev(() => V.caption('Your turn. One card. One flip.'));
  await wait(page, 1300);
  await ev(() => V.meBlind(0));
  await wait(page, 1500);
  await ev(() => { V.caption('A 2 goes on anything. YOU WIN 🏆'); if (!document.querySelector('#victoryFxLayer .rbat')) playVictoryEffect('victory-halloween'); });
  await wait(page, 2600);

  await ev(() => { V.hideCaption(); V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">The card game you played<br>at uni. Now on your phone.</div><div class="url">shithead-pro.web.app</div><div class="sub">Free · no download</div>`); });
  await wait(page, 2800);
  await finish(g, OUT, { from: 'start', lead: 0 });
  console.log('saved', OUT);
})();
