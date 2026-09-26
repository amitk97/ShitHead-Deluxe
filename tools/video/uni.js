// ~25s nostalgia clip: "the card game every Brit played at uni". The rules
// everyone remembers, played out fast at a 4-player table.
//   node tools/video/uni.js
const path = require('path');
const { openGame, finish, wait } = require('./director');
const OUT = path.join(__dirname, 'shithead-uni.webm');
(async () => {
  const g = await openGame(OUT); const { page } = g;
  const ev = (fn, arg) => page.evaluate(fn, arg);

  await ev(() => { window.runShuffleIntro = (cb) => cb(); document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(3); });
  await ev(() => V.card(`<div class="big">🍻</div><div class="line">Remember this one?</div><div class="sub">Every uni kitchen, hostel<br>and holiday since forever.</div>`));
  g.mark('start');
  await page.waitForFunction(() => typeof state.currentTurnIndex === 'number' && state.players.length === 4, null, { timeout: 20000 }).catch(() => {});
  await ev(() => {
    V.bot(0).name = 'Jonno'; V.bot(1).name = 'Priya'; V.bot(2).name = 'Kez';
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    V.scene({ hand: [['8','♠'],['10','♥'],['Q','♣'],['5','♦']], faceUp: [['A','♣'],['K','♥'],['3','♦']], faceDown: [['Q','♠'],['8','♣'],['5','♥']],
      pile: [['6','♣']], draw: [['4','♠'],['J','♣'],['3','♦'],['6','♥'],['Q','♥'],['5','♣']], // nothing that matches a play (no Bonus Draw)
      bots: [
        { hand: [['9','♣'],['4','♦'],['J','♠']], faceUp: [['7','♥'],['Q','♦'],['2','♣']], faceDown: [['4','♣'],['6','♥'],['K','♠']] },
        { hand: [['K','♠'],['5','♣'],['6','♦']], faceUp: [['A','♦'],['6','♥'],['9','♠']], faceDown: [['3','♣'],['8','♥'],['J','♦']] },
        { hand: [['2','♦'],['7','♠'],['7','♦'],['7','♣'],['7','♥']], faceUp: [['A','♥'],['J','♣'],['10','♠']], faceDown: [['5','♠'],['9','♥'],['Q','♥']] }
      ], turn: 0 });
  });
  await wait(page, 2700);
  await ev(() => V.hideCard());
  await wait(page, 400);

  // Play the same or higher.
  await ev(() => V.caption('Play the same or higher ⬆️'));
  await wait(page, 600);
  await ev(() => V.mePlay('8')); await wait(page, 1100);
  await ev(() => V.botPlay(0, '9')); await wait(page, 900);
  await ev(() => V.botPlay(1, 'K')); await wait(page, 1000);

  // A 2 resets it.
  await ev(() => V.caption('A 2 goes on anything and resets it 🔄'));
  await wait(page, 500);
  await ev(() => V.botPlay(2, '2')); await wait(page, 1800);

  // A 10 burns the pile.
  await ev(() => V.caption('A 10 burns the whole pile 🔥'));
  await wait(page, 500);
  await ev(() => V.mePlay('10')); await wait(page, 2600);

  // Four of a kind burns too.
  await ev(() => { state.discardPile = [V.c('5', '♣')]; render(); V.caption('Four of a kind? Burn that too 🔥🔥'); });
  await wait(page, 600);
  await ev(() => V.botPlay(2, ['7', '7', '7', '7'])); await wait(page, 2800);

  // Blind flips at the end.
  await ev(() => { V.scene({ hand: [], faceUp: [], faceDown: [['A','♠'],['8','♣']], pile: [['J','♥']], draw: [], turn: 0 }); V.caption('Then it’s down to blind flips 😬'); });
  await wait(page, 900);
  await ev(() => V.meBlind(0)); await wait(page, 2400);

  await ev(() => { V.hideCaption(); V.card(`<div class="big">💩</div><div class="line">Last one holding cards<br>is the ShitHead.</div>`); });
  await wait(page, 2400);
  await ev(() => V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">Now on your phone.<br>Play your mates online.</div><div class="url">shithead-pro.web.app</div><div class="sub">Free · no download</div>`));
  await wait(page, 3200);
  await finish(g, OUT, { from: 'start', lead: 0.3 });
  console.log('saved', OUT);
})();
