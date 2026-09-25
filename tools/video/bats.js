const path = require('path');
const { openGame, finish, wait } = require('./director');
const OUT = path.join(__dirname, 'bat-swarm-preview.webm');
(async () => {
  const g = await openGame(OUT); const { page } = g;
  await page.evaluate(() => { document.getElementById('playerNameInput').value = 'You'; startSinglePlayerGame(2); });
  await page.waitForFunction(() => document.getElementById('shuffleIntroOverlay')?.classList.contains('hidden') && typeof state.currentTurnIndex === 'number', null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => { state.phase = 'PLAY'; document.getElementById('swapControlBar').classList.add('hidden'); render(); });
  await wait(page, 600); g.mark('start');
  for (let i = 0; i < 3; i++) { await page.evaluate(() => playVictoryEffect('victory-halloween')); await wait(page, 4000); }
  await finish(g, OUT, { lead: 0 });
  console.log('saved', OUT);
})();
