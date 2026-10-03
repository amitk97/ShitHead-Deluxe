// How-to-play video with a voiceover (v309).
// 1. python3 tools/video/narrate.py  → narration/scene-NN.wav + narration/timing.json
// 2. node tools/video/howto-voice.js [--shots]  → shithead-how-to-play.webm / .mp4 (with the voice)
// Each scene starts on its own narration line and its moves are cued to the
// phrase start times, so the picture always matches what is being said.
const path = require('path'), fs = require('fs');
const { openGame, finish, wait } = require('./director');
const NAR = path.join(__dirname, 'narration');
const T = JSON.parse(fs.readFileSync(path.join(NAR, 'timing.json'), 'utf8'));
const OUT = path.join(__dirname, 'shithead-how-to-play-silent.webm');
const SHOTS = process.argv.includes('--shots');
const PAD = 0.55; // quiet gap between scenes (s)
(async () => {
  const g = await openGame(OUT); const { page } = g;
  let n = 0;
  const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(__dirname, `hv-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const cap = (t, pos) => ev(({ t, pos }) => V.caption(t, pos), { t, pos });
  const hi = (sel) => ev((sel) => V.highlight(sel), sel);
  const clear = () => ev(() => V.clearHighlights());
  const Y = (s) => `<b style="color:#fbbf24">${s}</b>`;
  const BOTS = [{ hand: [['4','♦'],['9','♣'],['K','♠']], faceUp: [['7','♥'],['Q','♦'],['3','♣']], faceDown: [['2','♥'],['6','♠'],['J','♣']] },
                { hand: [['5','♠'],['8','♦'],['A','♠']], faceUp: [['A','♦'],['6','♥'],['2','♠']], faceDown: [['9','♥'],['4','♣'],['Q','♣']] }];
  const DRAW = [['3','♦'],['K','♣'],['Q','♥'],['6','♦'],['J','♠'],['4','♥'],['8','♠'],['5','♦']];
  const FU = [['A','♣'],['10','♥'],['2','♦']], FD = [['Q','♠'],['8','♣'],['5','♥']];
  const play = (o) => ev(({ o, BOTS, DRAW, FU, FD }) => V.scene({ faceUp: FU, faceDown: FD, bots: BOTS, draw: DRAW, turn: 0, ...o }), { o, BOTS, DRAW, FU, FD });
  const marks = [];
  const scene = async (i, fn) => {
    const t0 = Date.now(); marks.push(t0 / 1000);
    const at = async (s) => { const d = t0 + s * 1000 - Date.now(); if (d > 0) await wait(page, d); };
    await fn(at, T.starts[i]);
    await at(T.durs[i] + PAD);
  };

  // No one-time helper tips in the recording.
  await ev(() => { window.showHelperTip = () => {}; document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(2); });
  await ev(() => V.card(`<div class="line" style="font-size:22px;color:#fde68a">HOW TO PLAY</div><div class="logo">ShitHead</div><div class="deluxe">DELUXE</div>`));
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && state.phase === 'SWAP', null, { timeout: 25000 }).catch(() => {});
  await ev(({ BOTS, DRAW }) => {
    V.bot(0).name = 'Noah'; V.bot(1).name = 'Emma';
    V.scene({ hand: [['2','♠'],['10','♦'],['A','♥']], faceUp: [['4','♣'],['5','♦'],['7','♠']], faceDown: [['Q','♠'],['8','♣'],['5','♥']], pile: [], bots: BOTS, draw: DRAW, turn: 0 });
  }, { BOTS, DRAW });
  await wait(page, 600);
  g.mark('start');

  // 1. Welcome + the aim.
  await scene(0, async (at, s) => {
    await shot('title');
    await at(s[1] - 0.1); await ev(() => V.hideCard());
    await at(s[2]); await cap(`Don't be the ${Y('last one')} holding cards!`, 'top'); await shot('aim');
  });

  // 2. The deal.
  await scene(1, async (at, s) => {
    await ev(() => { const me = V.me(); window.__fu = me.faceUp; me.faceUp = []; render(); V.highlight('#localTableSlots'); });
    await cap(`3 cards ${Y('Face-Down')}`, 'top'); await shot('facedown');
    await at(s[1]); await ev(() => { V.me().faceUp = window.__fu; render(); V.highlight('#localTableSlots'); });
    await cap(`3 ${Y('Face-Up')} on top`, 'top');
    await at(s[2]); await hi('#localHand'); await cap(`3 in your ${Y('Hand')}`, 'top'); await shot('hand');
    await at(s[3]); await ev(() => { const me = V.me(); me.faceUp = []; render(); V.highlight('#localTableSlots'); });
    await cap(`Face-Down cards are a ${Y('mystery')}… even to you!`, 'top');
    await at(T.durs[1]); await ev(() => { V.me().faceUp = window.__fu; render(); }); await clear();
  });

  // 3. Swap phase.
  await scene(2, async (at, s) => {
    await hi('#swapControlBar'); await cap(`${Y('Swap')} before play begins`, 'top');
    await at(s[1] + 0.6); await clear();
    const swap = async (rank, slot) => {
      await ev((rank) => { const c = V.me().hand.find(x => x.rank === rank); handleSwapHandClick(c.id); }, rank);
      await wait(page, 450);
      await ev((slot) => handleSwapFaceUpClick(slot), slot);
    };
    await at(s[2]); await cap(`Strongest cards ${Y('Face-Up')}`, 'top'); await swap('2', 0);
    await at(s[3] + 0.3); await swap('10', 1);
    await at(s[4]); await cap(`${Y('2 · 3 · 10 · A · Joker')}<small>or simply your highest cards</small>`, 'top'); await swap('A', 2); await shot('swapped');
    await at(s[6]); await hi('#finishSwapBtn'); await cap(`Press ${Y('Ready')}`, 'top');
    await at(T.durs[2]); await clear();
  });

  // Into play.
  await ev(() => {
    state.phase = 'PLAY'; state.players.forEach(p => { p.isReady = true; });
    document.getElementById('swapControlBar').classList.add('hidden');
    document.getElementById('playActionControls').classList.remove('hidden');
  });

  // 4. Playing a card, several of a rank, drawing back up.
  await scene(3, async (at, s) => {
    await play({ hand: [['K','♦'],['A','♣'],['A','♠']], pile: [['Q','♥']] });
    await cap(`Play ${Y('equal or higher')} than the Pile`);
    await at(s[1] + 0.9); await ev(() => V.mePlay('K')); await shot('playK');
    await at(s[2]); await cap(`Play ${Y('several of a rank')} at once`);
    await ev(() => V.mePlay(['A', 'A'])); await shot('playAA');
    await at(s[3]); await cap(`Draw back up to ${Y('3')}`); await hi('#drawPile');
    await at(T.durs[3]); await clear();
  });

  // 5. Picking up.
  await scene(4, async (at, s) => {
    await play({ hand: [['4','♣'],['5','♦'],['6','♠']], pile: [['9','♠'],['J','♥'],['K','♣'],['A','♥']] });
    await cap(`Can't play?`);
    await at(s[1]); await cap(`Pick up the ${Y('whole Pile')}`); await ev(() => { V.turnTo(V.me().id); executePickup(V.me().id); }); await shot('pickup');
  });

  // 6. Powers: 2, 3, 6 / J, 7.
  await scene(5, async (at, s) => {
    await play({ hand: [['2','♠'],['3','♣'],['9','♦']], pile: [['A','♥']] });
    await cap(`Some cards have ${Y('powers')}`);
    await at(s[1]); await cap(`${Y('2')} = Reset: anything can follow`); await ev(() => V.mePlay('2'));
    await at(s[3] - 0.2); await play({ hand: [['3','♣'],['6','♣'],['9','♦']], pile: [['9','♠']] });
    await cap(`${Y('3')} = See-through: beat the card beneath`); await ev(() => V.mePlay('3')); await shot('three');
    await at(s[5] - 0.2); await play({ hand: [['4','♣'],['8','♣'],['9','♦']], pile: [['5','♥']], bots: [{ ...BOTS[0], hand: [['6','♦'],['K','♠'],['4','♠']] }, BOTS[1]] });
    await cap(`${Y('6')} = Even only · ${Y('J')} = Odd only`); await ev(() => V.botPlay(0, '6')); await shot('six');
    await at(s[7] - 0.2); await play({ hand: [['4','♣'],['8','♣'],['9','♦']], pile: [['5','♥']], bots: [BOTS[0], { ...BOTS[1], hand: [['7','♦'],['K','♠'],['4','♠']] }] });
    await cap(`${Y('7')} = 7 or lower`); await ev(() => V.botPlay(1, '7')); await shot('seven');
  });

  // 7. Powers: 8, 9, 10, four of a kind.
  await scene(6, async (at, s) => {
    await play({ hand: [['8','♣'],['9','♣'],['J','♦']], pile: [['6','♥']] });
    await cap(`${Y('8')} = Skip the next player`); await ev(() => V.mePlay('8'));
    await at(s[1]); await play({ hand: [['9','♣'],['6','♣'],['J','♦']], pile: [['8','♥']] });
    await cap(`${Y('9')} = Reverse direction`); await ev(() => V.mePlay('9'));
    await wait(page, 700); await hi('#gameDirectionBadge'); await shot('nine');
    await at(s[2] - 0.15); await clear(); await play({ hand: [['10','♠'],['6','♣'],['J','♦']], pile: [['K','♥'],['Q','♣'],['A','♦']] });
    await cap(`${Y('10')} = Burn the Pile!`); await ev(() => V.mePlay('10')); await wait(page, 1300); await shot('ten');
    await at(s[3] + 0.5); await play({ hand: [['5','♣'],['6','♣'],['J','♦']], pile: [['5','♥'],['5','♠'],['5','♦']] });
    await cap(`${Y('Four of a kind')} burns it too`); await ev(() => V.mePlay('5')); await wait(page, 1200); await shot('four');
    await at(s[4]); await cap(`Whoever burns it ${Y('goes again')}!`);
  });

  // 8. Card Powers + Play Matrix buttons.
  await scene(7, async (at, s) => {
    await play({ hand: [['4','♣'],['8','♣'],['K','♦']], pile: [['7','♠']] });
    await cap(`No need to ${Y('remember')} it all!`, 'top');
    await at(s[1]); await hi('#cardRefBtn'); await cap(`Tap ${Y('ⓘ')} for Card Powers`, 'top');
    await at(s[1] + 1.0); await clear(); await ev(() => toggleCardReference()); await shot('cardpowers');
    await at(s[3] - 0.35); await ev(() => toggleCardReference(true));
    await at(s[3]); await hi('#matrixRefBtn'); await cap(`Tap ${Y('the grid')} for the Play Matrix`, 'top');
    await at(s[3] + 1.0); await clear(); await ev(() => toggleMatrixReference()); await shot('matrix');
    await at(s[5]); await cap(`Always there on the ${Y('table')}`, 'top');
    await at(T.durs[7] + 0.1); await ev(() => toggleMatrixReference(true));
  });

  // 9. Joker.
  await scene(8, async (at, s) => {
    await play({ hand: [['JOKER','🃏'],['6','♣'],['J','♦']], pile: [['9','♠'],['J','♥'],['Q','♣'],['A','♥']] });
    await cap(`${Y('Joker')} = Make anyone pick up the Pile`); await ev(() => V.mePlay('JOKER'));
    await wait(page, 1100);
    await ev(() => { const b = [...document.querySelectorAll('#jokerInlineTargets button')].find(x => /Emma/i.test(x.textContent)); b?.click(); });
    await wait(page, 500); await shot('joker');
    await at(s[1]); await cap(`Unless they ${Y('block it')} with a Joker`);
  });

  // 10. Face-up, then blind face-down.
  await scene(9, async (at, s) => {
    await ev(({ BOTS }) => V.scene({ hand: [], faceUp: [['K','♣'],['7','♦'],['9','♠']], faceDown: [['4','♣'],['J','♥'],['8','♦']], pile: [['Q','♦']], bots: BOTS, draw: [], turn: 0 }), { BOTS });
    await hi('#drawPile'); await cap(`Deck and Hand ${Y('empty')}?`);
    await at(s[1]); await clear(); await hi('#localTableSlots'); await cap(`Play your ${Y('Face-Up')} cards`);
    await ev(() => { const me = V.me(); V.turnTo(me.id); executePlayCards(me.id, [me.faceUp.find(c => c.rank === 'K')]); });
    await at(s[2] - 0.2); await clear();
    await ev(() => { const me = V.me(); me.faceUp = []; state.discardPile = [V.c('A', '♠')]; render(); });
    await cap(`Then flip ${Y('Face-Down')} cards blind`);
    await at(s[3] - 0.1); await ev(() => V.meBlind(0)); await shot('blind');
    await at(s[4] + 0.2); await cap(`Can't go? ${Y('Pick the Pile up')}`); await shot('blindpick');
  });

  // 11. Escape, ShitHead, good luck.
  await scene(10, async (at, s) => {
    await ev(({ BOTS }) => V.scene({ hand: [['A','♠']], faceUp: [], faceDown: [], pile: [['K','♣']], bots: BOTS, draw: [], turn: 0 }), { BOTS });
    await cap(`Empty all your cards to ${Y('escape')}`); await ev(() => V.mePlay('A'));
    await wait(page, 1000);
    await ev(() => { if (!document.querySelector('#victoryFxLayer *')) playVictoryEffect('victory-halloween'); }); await shot('win');
    await at(s[1]); await cap(`The last one holding cards is the ${Y('ShitHead')}`);
    await at(s[2] - 0.2);
    await ev(() => { V.hideCaption(); V.card(`<div class="logo">ShitHead</div><div class="deluxe">DELUXE</div><div class="line">Good luck… and don't let it be you!</div><div class="url">shithead-pro.web.app</div>`); });
    await wait(page, 600); await shot('end');
    await at(T.durs[10] + 2.2);
  });

  fs.writeFileSync(path.join(NAR, 'marks.json'), JSON.stringify({ start: g.marks.start, scenes: marks }));
  await finish(g, OUT, { lead: 0 });
  console.log('saved', OUT);
})();
