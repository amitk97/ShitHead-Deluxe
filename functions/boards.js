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
      const level = Number(after.xp && after.xp.level) || 0;
      await db().ref(`boards/${board}/${uid}`).set({ name, count: a[board], at: Date.now(), ...(typeof avatar === 'string' ? { avatar } : {}), ...(level > 0 ? { level } : {}) });
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
  // A new level (XP & levels) reaches every place other players see it.
  const levelBefore = Number(before && before.xp && before.xp.level) || 0;
  const levelAfter = Number(after.xp && after.xp.level) || 0;
  if (levelAfter > 0 && (force || levelAfter !== levelBefore)) tasks.push(syncLevel(uid, name, levelAfter));
  await Promise.all(tasks);
  return mailed;
}

// Writes a player's level onto the entries that already exist (never adds
// one): their public profile, the Ranked leaderboard and the server boards.
async function syncLevel(uid, name, level) {
  const paths = [`publicProfiles/${uid}`, ...Object.keys(BOARDS).map(board => `boards/${board}/${uid}`)];
  if (name) paths.push(`leaderboard/${name.toLowerCase()}`);
  const updates = {};
  await Promise.all(paths.map(async (path) => {
    const snap = await db().ref(path).once('value');
    if (!snap.exists() || Number(snap.child('level').val()) === level) return;
    if (path.startsWith('leaderboard/') && snap.child('username').val() !== name) return;
    updates[`${path}/level`] = level;
  }));
  if (Object.keys(updates).length) await db().ref().update(updates);
  return Object.keys(updates).length;
}

// A new picture or name reaches the player's existing board entries at once
// (the publicProfiles trigger in index.js). Only entries that are already
// there are touched, so this never puts anyone on a board.
async function refreshProfile(uid) {
  const [user, avatar] = await Promise.all([
    db().ref(`users/${uid}`).once('value').then(s => s.val()),
    db().ref(`publicProfiles/${uid}/avatar`).once('value').then(s => s.val())
  ]);
  if (!user || user.deletion) return 0;
  const name = typeof user.username === 'string' && user.username.trim() ? user.username : null;
  const updates = {};
  for (const board of Object.keys(BOARDS)) {
    const entry = (await db().ref(`boards/${board}/${uid}`).once('value')).val();
    if (!entry) continue;
    const pic = typeof avatar === 'string' ? avatar : null;
    if ((entry.avatar || null) !== pic) updates[`boards/${board}/${uid}/avatar`] = pic;
    if (name && entry.name !== name) updates[`boards/${board}/${uid}/name`] = name;
  }
  if (Object.keys(updates).length) await db().ref().update(updates);
  return Object.keys(updates).length;
}

// Hidden while an account is being deleted; erased with it.
const boardPaths = (uid) => Object.keys(BOARDS).map(board => `boards/${board}/${uid}`);

module.exports = { syncLevel, BOARDS, TIERS, onUserChanged, placeOn, boardPaths, refreshProfile };
