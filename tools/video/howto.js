const path = require('path');
const { openGame, finish, wait } = require('./director');
const OUT = path.join(__dirname, 'shithead-how-to-play.webm');
const SHOTS = process.argv.includes('--shots');
(async () => {
  const g = await openGame(OUT); const { page } = g;
  let n = 0;
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `howto-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const cap = (t) => ev((t) => V.caption(t), t);
  const hi = (sel) => ev((sel) => V.highlight(sel), sel);
  const clear = () => ev(() => V.clearHighlights());
  const BOTS = [{ hand: [['4','♦'],['9','♣'],['K','♠']], faceUp: [['7','♥'],['Q','♦'],['3','♣']], faceDown: [['2','♥'],['6','♠'],['J','♣']] },
                { hand: [['5','♠'],['8','♦'],['A','♠']], faceUp: [['A','♦'],['6','♥'],['2','♠']], faceDown: [['9','♥'],['4','♣'],['Q','♣']] }];
  const DRAW = [['3','♦'],['K','♣'],['Q','♥'],['6','♦'],['J','♠'],['4','♥']];

  await ev(() => { document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(2); });
  await ev(() => V.card(`<div class="line" style="font-size:22px;color:#fde68a">HOW TO PLAY</div><div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">in about a minute ⏱️</div>`)); g.mark('start');
  await shot('title'); await wait(page, 3000);
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number', null, { timeout: 20000 }).catch(() => {});
  await ev(({ BOTS, DRAW }) => {
    V.bot(0).name = 'Noah'; V.bot(1).name = 'Emma';
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
    V.scene({ hand: [['4','♣'],['K','♦'],['7','♠']], faceUp: [['A','♣'],['10','♥'],['2','♦']], faceDown: [['Q','♠'],['8','♣'],['5','♥']], pile: [['Q','♥']], bots: BOTS, draw: DRAW, turn: 0 });
  }, { BOTS, DRAW });
  await ev(() => V.hideCard()); await wait(page, 500);

  // 1. The goal.
  await cap('🎯 Get rid of all your cards'); await shot('goal'); await wait(page, 2600);
  await cap('The last one holding cards is the <b style="color:#fbbf24">ShitHead</b> 💩'); await wait(page, 2800);

  // 2. Your cards.
  await cap('① Your <b style="color:#fbbf24">Hand</b>: play from here first'); await hi('#localHand'); await shot('hand'); await wait(page, 2600);
  await cap('② Then your <b style="color:#fbbf24">Face-Up</b> cards'); await hi('#localTableSlots'); await shot('faceup'); await wait(page, 2400);
  await ev(() => { const me = V.me(); window.__fu = me.faceUp; me.faceUp = []; render(); V.highlight('#localTableSlots'); });
  await cap('③ Last, your <b style="color:#fbbf24">Face-Down</b> cards, played blind!'); await shot('facedown'); await wait(page, 2600);
  await ev(() => { V.me().faceUp = window.__fu; render(); V.highlight('#localTableSlots'); });
  await cap('Tip: before play starts, swap your best cards onto Face-Up 🔄'); await wait(page, 3000);
  await clear();

  // 3. Playing: equal or higher, refill, pick up.
  await cap('Play a card <b style="color:#fbbf24">equal or higher</b> than the pile ⬆️'); await wait(page, 1300);
  await ev(() => V.mePlay('K')); await wait(page, 1200); await shot('play');
  await cap('Your Hand refills to 3 from the Deck'); await hi('#drawPile'); await wait(page, 2300); await clear();
  await ev(() => V.botPlay(1, 'A')); await wait(page, 900);
  await cap("Can't beat it? Pick up the whole pile 😬"); await wait(page, 1300);
  await ev(() => { V.turnTo(V.me().id); executePickup(V.me().id); }); await wait(page, 1200); await shot('pickup'); await wait(page, 900);

  // 4. Power cards.
  const scene = (o) => ev(({ o, BOTS, DRAW }) => V.scene({ faceUp: [['A','♣'],['10','♥'],['2','♦']], faceDown: [['Q','♠'],['8','♣'],['5','♥']], bots: BOTS, draw: DRAW, turn: 0, ...o }), { o, BOTS, DRAW });
  await scene({ hand: [['2','♠'],['6','♣'],['9','♦']], pile: [['A','♥']] });
  await cap('<b style="color:#fbbf24">2</b> = Reset: play it on almost anything'); await wait(page, 1100);
  await ev(() => V.mePlay('2')); await wait(page, 1300); await shot('two'); await wait(page, 900);

  await scene({ hand: [['10','♠'],['6','♣'],['9','♦']], pile: [['K','♥'],['Q','♣']] });
  await cap('<b style="color:#fbbf24">10</b> = Burn the pile, and go again 🔥'); await wait(page, 1000);
  await ev(() => V.mePlay('10')); await wait(page, 1500); await shot('ten'); await wait(page, 1600);

  await scene({ hand: [['4','♣'],['6','♣'],['9','♦']], pile: [['5','♥']], bots: [{ ...BOTS[0], hand: [['7','♦'],['K','♠'],['4','♠']] }, BOTS[1]] });
  await cap('<b style="color:#fbbf24">7</b> = next card must be 7 or lower'); await wait(page, 900);
  await ev(() => V.botPlay(0, '7')); await wait(page, 1300); await shot('seven'); await wait(page, 1300);

  await scene({ hand: [['8','♣'],['6','♣'],['J','♦']], pile: [['6','♥']] });
  await cap('<b style="color:#fbbf24">8</b> = skip the next player ⏭️'); await wait(page, 900);
  await ev(() => V.mePlay('8')); await wait(page, 1300); await shot('eight'); await wait(page, 1300);

  await scene({ hand: [['9','♣'],['6','♣'],['J','♦']], pile: [['6','♥']] });
  await cap('<b style="color:#fbbf24">9</b> = reverse the direction 🔄'); await wait(page, 900);
  await ev(() => V.mePlay('9')); await wait(page, 600); await hi('#gameDirectionBadge'); await wait(page, 900); await shot('nine'); await wait(page, 1200); await clear();

  await scene({ hand: [['JOKER','🃏'],['6','♣'],['J','♦']], pile: [['9','♠'],['J','♥'],['Q','♣'],['A','♥']] });
  await cap('<b style="color:#fbbf24">Joker</b> = make anyone take the pile 🃏'); await wait(page, 900);
  await ev(() => V.mePlay('JOKER')); await wait(page, 1300);
  await ev(() => { const b = [...document.querySelectorAll('#jokerInlineTargets button')].find(x => /Emma/i.test(x.textContent)); b?.click(); });
  await wait(page, 900); await shot('joker'); await wait(page, 1300);

  await scene({ hand: [['5','♣'],['6','♣'],['J','♦']], pile: [['5','♥'],['5','♠'],['5','♦']] });
  await cap('Four of a kind burns the pile too 💥'); await wait(page, 900);
  await ev(() => V.mePlay('5')); await wait(page, 1500); await shot('fourkind'); await wait(page, 1500);

  await cap("Every card's power is one tap away: ⓘ"); await hi('#cardRefBtn'); await wait(page, 2400); await clear();

  // 5. Blind flips.
  await ev(({ BOTS }) => V.scene({ hand: [], faceUp: [], faceDown: [['K','♠'],['4','♣'],['7','♥']], pile: [['8','♥']], bots: BOTS, draw: [], turn: 0 }), { BOTS });
  await cap('Out of cards? Flip Face-Down cards blind 😱'); await wait(page, 1200);
  await ev(() => V.meBlind(0)); await wait(page, 800); await shot('blind'); await wait(page, 2000);

  // 6. Winning.
  await ev(({ BOTS }) => V.scene({ hand: [['A','♠']], faceUp: [], faceDown: [], pile: [['K','♣']], bots: BOTS, draw: [], turn: 0 }), { BOTS });
  await cap('First one out wins 🏆'); await wait(page, 900);
  await ev(() => V.mePlay('A')); await wait(page, 1200);
  await ev(() => { if (!document.querySelector('#victoryFxLayer .rbat')) playVictoryEffect('victory-halloween'); });
  await wait(page, 900); await shot('win'); await wait(page, 1600);
  await cap('The last one still holding cards is the <b style="color:#fbbf24">ShitHead</b> 💩'); await wait(page, 2600);

  await ev(() => { V.hideCaption(); V.card(`<div class="big">💩</div><div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">Ready? Play free now</div><div class="url">shithead-pro.web.app</div><div class="sub">New? Tap Tutorial for the 1-minute Quick Start ⚡</div>`); });
  await shot('end'); await wait(page, 4000);
  await finish(g, OUT);
  console.log('saved', OUT);
})();
