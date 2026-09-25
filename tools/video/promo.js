const path = require('path');
const { openGame, finish, wait } = require('./director');
const OUT = path.join(__dirname, 'shithead-promo.webm');
const SHOTS = process.argv.includes('--shots');
(async () => {
  const g = await openGame(OUT); const { page } = g;
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `promo-${n}.png`) }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // Deal a 3-player game behind the title card.
  await ev(() => { document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(2); });
  await ev(() => V.card(`<div class="big">💩</div><div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">Don't be the last one holding cards.</div>`)); g.mark('start');
  await shot('01-title'); await wait(page, 3200);
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number', null, { timeout: 20000 }).catch(() => {});
  await ev(() => {
    V.bot(0).name = 'Noah'; V.bot(1).name = 'Emma';
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    V.scene({ hand: [['6','♣'],['J','♦'],['10','♠']], faceUp: [['A','♣'],['K','♥'],['2','♦']], faceDown: [['Q','♠'],['8','♣'],['5','♥']], pile: [],
      bots: [{ hand: [['4','♦'],['9','♣'],['K','♠']], faceUp: [['7','♥'],['Q','♦'],['3','♣']] }, { hand: [['5','♠'],['8','♦'],['JOKER','🃏']], faceUp: [['A','♦'],['6','♥'],['2','♠']] }],
      draw: [['3','♦'],['7','♣'],['2','♥'],['4','♠'],['K','♣'],['Q','♥']], turn: 1 });
  });
  await ev(() => V.hideCard()); await wait(page, 500);

  // 1. Quick plays around the table.
  await ev(() => V.caption('Play vs Bots, friends or Ranked ⚔️'));
  await wait(page, 700);
  await ev(() => V.botPlay(0, '4')); await wait(page, 900);
  await ev(() => V.botPlay(1, '5')); await wait(page, 900);
  await ev(() => V.mePlay('6')); await wait(page, 1000); await shot('02-plays');
  await ev(() => V.botPlay(0, 'K')); await wait(page, 1200);

  // 2. Burn with a 10: Ghost Flames.
  await ev(() => V.caption('Burn the pile with a 10 🔥')); await wait(page, 700);
  await ev(() => V.mePlay('10')); await wait(page, 1300); await shot('03-burn'); await wait(page, 2000);

  // 3. Blind flip.
  await ev(() => { V.scene({ hand: [], faceUp: [], faceDown: [['K','♠'],['8','♣'],['5','♥']], pile: [['9','♥']], draw: [], turn: 0 }); V.caption('Flip blind… and pray 😱'); });
  await wait(page, 900);
  await ev(() => V.meBlind(0)); await wait(page, 700); await shot('04-blind'); await wait(page, 1600);

  // 4. Joker: pass the whole pile to someone.
  await ev(() => { V.scene({ hand: [['JOKER','🃏'],['4','♣'],['7','♦']], faceUp: [['A','♣'],['K','♥'],['2','♦']], faceDown: [['Q','♠'],['8','♣'],['5','♥']], pile: [['9','♠'],['J','♥'],['Q','♣'],['K','♦'],['A','♥']], draw: [['3','♦'],['6','♣']], turn: 0 }); V.caption('Joker? Make someone take the pile 🃏'); });
  await wait(page, 800);
  await ev(() => V.mePlay('JOKER')); await wait(page, 1300);
  await ev(() => { const b = [...document.querySelectorAll('#jokerInlineTargets button')].find(x => /Noah/i.test(x.textContent)); b?.click(); });
  await wait(page, 600); await shot('05-joker'); await wait(page, 1700);

  // 5. Last card alert.
  await ev(() => { V.bot(1).hand = []; V.bot(1).faceUp = []; V.bot(1).faceDown = [V.c('7','♠')]; V.caption('Never miss a last card ☝️'); render(); });
  await wait(page, 600); await shot('06-lastcard'); await wait(page, 2100);

  // 6. Win with the Bat Swarm.
  await ev(() => { V.scene({ hand: [['A','♠']], faceUp: [], faceDown: [], pile: [['K','♣']], draw: [], turn: 0 }); V.caption('Win in style 🦇🏆'); });
  await wait(page, 700);
  await ev(() => V.mePlay('A')); await wait(page, 1100);
  await ev(() => { if (!document.querySelector('#victoryFxLayer .rbat')) playVictoryEffect('victory-halloween'); });
  await wait(page, 900); await shot('07-win'); await wait(page, 2400);

  // End card.
  await ev(() => { V.hideCaption(); V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">Free on your phone.<br>No download needed.</div><div class="url">shithead-pro.web.app</div><div class="sub">Add it to your home screen 📲</div>`); });
  await shot('08-end'); await wait(page, 3600);
  await finish(g, OUT);
  console.log('saved', OUT);
})();
