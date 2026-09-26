// Leaderboards the server keeps, and the congratulations mail.
//   boards/challenges/{uid} = { name, avatar, count, at }  challenges completed
//   boards/gauntlet/{uid}   = { name, avatar, count, at }  Gauntlet bots beaten
// (server-only, publicly readable). The Ranked board is the existing
// leaderboard/{name} (rating). Whenever a player's count or rating changes
// (economy's userTx calls onUserChanged) their entry is rewritten and their
// place checked: the first time they reach the top 10, #3, #2 or #1 on a board
// they get an Inbox mail (activityInbox type 'board'). The best place mailed
// per board is kept in users/{uid}/boardBest/{board} (server-only), so a
// player bouncing around a threshold isn't mailed again and again.
'use strict';
const admin = require('firebase-admin');

const db = () => admin.database();
const TIERS = [1, 2, 3, 10];
const BOARDS = {
  challenges: (u) => Object.keys((u && u.completedChallenges) || {}).length,
  gauntlet: (u) => Number(u && u.gauntlet && u.gauntlet.botsBeaten) || 0
};
const counts = (u) => ({
  challenges: BOARDS.challenges(u),
  gauntlet: BOARDS.gauntlet(u),
  ranked: u && Number.isFinite(Number(u.rating)) && (Number(u.wins) || 0) + (Number(u.losses) || 0) > 0 ? Number(u.rating) : null
});
const tierFor = (rank) => TIERS.find(t => rank <= t) || null;

// 1 + how many entries are strictly above `value` (only up to 10 are read).
async function placeOn(path, field, value, exceptKey) {
  const snap = await db().ref(path).orderByChild(field).startAfter(value).limitToFirst(11).once('value');
  let above = 0;
  snap.forEach(child => { if (child.key !== exceptKey) above++; });
  return above + 1;
}

async function congratulate(uid, board, rank) {
  const tier = tierFor(rank);
  if (!tier) return null;
  const bestRef = db().ref(`users/${uid}/boardBest/${board}`);
  const res = await bestRef.transaction(best => (best && Number(best) <= tier ? undefined : tier), undefined, false);
  if (!res.committed) return null;
  const now = Date.now();
  await db().ref(`users/${uid}/activityInbox/board_${board}_${tier}`).set({ type: 'board', board, rank, tier, sentAt: now });
  return tier;
}

// before/after: the user record around a write (after = what was saved).
// force: rewrite the board entries even if nothing changed (sign-in backfill).
async function onUserChanged(uid, before, after, { force = false } = {}) {
  if (!after || after.deletion) return [];
  const b = counts(before || {}), a = counts(after);
  const name = typeof after.username === 'string' ? after.username : null;
  const mailed = [];
  const tasks = [];
  for (const board of Object.keys(BOARDS)) {
    if (!force && a[board] === b[board]) continue;
    if (!name) continue;
    tasks.push((async () => {
      if (a[board] <= 0) { await db().ref(`boards/${board}/${uid}`).remove(); return; }
      const avatar = (await db().ref(`publicProfiles/${uid}/avatar`).once('value')).val();
      await db().ref(`boards/${board}/${uid}`).set({ name, count: a[board], at: Date.now(), ...(typeof avatar === 'string' ? { avatar } : {}) });
      if (a[board] > b[board] || force) {
        const t = await congratulate(uid, board, await placeOn(`boards/${board}`, 'count', a[board], uid));
        if (t) mailed.push({ board, tier: t });
      }
    })());
  }
  if (a.ranked !== null && name && (force || a.ranked > (b.ranked ?? -1))) {
    tasks.push((async () => {
      const t = await congratulate(uid, 'ranked', await placeOn('leaderboard', 'rating', a.ranked, name.toLowerCase()));
      if (t) mailed.push({ board: 'ranked', tier: t });
    })());
  }
  await Promise.all(tasks);
  return mailed;
}

// Hidden while an account is being deleted; erased with it.
const boardPaths = (uid) => Object.keys(BOARDS).map(board => `boards/${board}/${uid}`);

module.exports = { BOARDS, TIERS, onUserChanged, placeOn, boardPaths };
