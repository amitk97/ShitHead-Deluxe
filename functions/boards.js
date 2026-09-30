// Leaderboards the server keeps, and the congratulations mail.
//   boards/challenges/{uid} = { name, avatar, count, at }  challenges completed
//   boards/gauntlet/{uid}   = { name, avatar, count, at }  Gauntlet bots beaten
//   boards/levels/{uid}     = { name, avatar, count, level, at }  total XP
//   boards/xpweek_<week>/{uid} = { name, avatar, count, level, at }  XP this UK week
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
  gauntlet: (u) => Number(u && u.gauntlet && u.gauntlet.botsBeaten) || 0,
  // Levels tab, All-time: total XP (the entry also carries the level).
  levels: (u) => Number(u && u.xp && u.xp.total) || 0
};
// Levels tab, This week: boards/xpweek_<UK week>/{uid} = {name, avatar,
// count (XP this week), level, at}, one board per week (so a new week starts
// empty). Only this week's and last week's exist: older ones are deleted.
const xpMod = () => require('./xp');
const weekBoard = (now = Date.now()) => `xpweek_${xpMod().ukWeekKey(new Date(now))}`;
const WEEK_MS = 7 * 86400000;
const liveWeekBoards = (now = Date.now()) => [now, now - WEEK_MS].flatMap(at => ['xpweek', 'challengesweek', 'gauntletweek'].map(prefix => `${prefix}_${xpMod().ukWeekKey(new Date(at))}`));
const boardKeys = (now = Date.now()) => [...Object.keys(BOARDS), ...liveWeekBoards(now)];
const counts = (u) => ({
  challenges: BOARDS.challenges(u),
  gauntlet: BOARDS.gauntlet(u),
  levels: BOARDS.levels(u),
  ranked: u && Number.isFinite(Number(u.rating)) && (Number(u.wins) || 0) + (Number(u.losses) || 0) > 0 ? Number(u.rating) : null
});
// Challenge completion timestamps already exist; historical Gauntlet wins
// have no trustworthy timestamps and must never be invented as weekly wins.
function weeklyCounts(user, week) {
  return {
    challenges: Object.values(user?.completedChallenges || {}).filter(c => Number(c?.completedAt) > 0 && xpMod().ukWeekKey(new Date(Number(c.completedAt))) === week).length,
    gauntlet: user?.gauntlet?.week === week ? Number(user.gauntlet.weekBotsBeaten) || 0 : 0
  };
}
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
  // This week's XP (Levels → This week). No congratulations mail here: the
  // weekly places move all the time.
  const week = xpMod().ukWeekKey(new Date());
  const wA = xpMod().weekXp(after, week), wB = xpMod().weekXp(before || {}, week);
  if (name && wA > 0 && (force || wA !== wB)) {
    tasks.push((async () => {
      const board = `xpweek_${week}`;
      const avatar = (await db().ref(`publicProfiles/${uid}/avatar`).once('value')).val();
      const level = Number(after.xp && after.xp.level) || 0;
      await db().ref(`boards/${board}/${uid}`).set({ name, count: wA, at: Date.now(), ...(typeof avatar === 'string' ? { avatar } : {}), ...(level > 0 ? { level } : {}) });
      // Weeks before last week are gone for good.
      const now = Date.now();
      await db().ref().update({ [`boards/${weekBoard(now - 2 * WEEK_MS)}`]: null, [`boards/${weekBoard(now - 3 * WEEK_MS)}`]: null });
    })());
  }
  const weeklyA = weeklyCounts(after, week), weeklyB = weeklyCounts(before || {}, week);
  for (const kind of ['challenges', 'gauntlet']) {
    if (!name || (!force && weeklyA[kind] === weeklyB[kind])) continue;
    tasks.push((async () => {
      const path = `boards/${kind}week_${week}/${uid}`;
      if (weeklyA[kind] <= 0) { await db().ref(path).remove(); return; }
      const avatar = (await db().ref(`publicProfiles/${uid}/avatar`).once('value')).val();
      const level = Number(after.xp?.level) || 0;
      await db().ref(path).set({ name, count: weeklyA[kind], at: Date.now(), ...(typeof avatar === 'string' ? { avatar } : {}), ...(level > 0 ? { level } : {}) });
    })());
  }
  // Same retention as XP: this and last week; account deletion/profile sync
  // include all three weekly boards through boardKeys.
  if (force || weeklyA.challenges !== weeklyB.challenges || weeklyA.gauntlet !== weeklyB.gauntlet) {
    const old = {};
    for (const age of [2, 3]) for (const kind of ['challenges', 'gauntlet']) old[`boards/${kind}week_${xpMod().ukWeekKey(new Date(Date.now() - age * WEEK_MS))}`] = null;
    tasks.push(db().ref().update(old));
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
  const paths = [`publicProfiles/${uid}`, ...boardKeys().map(board => `boards/${board}/${uid}`)];
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
  for (const board of boardKeys()) {
    const entry = (await db().ref(`boards/${board}/${uid}`).once('value')).val();
    if (!entry) continue;
    const pic = typeof avatar === 'string' ? avatar : null;
    if ((entry.avatar || null) !== pic) updates[`boards/${board}/${uid}/avatar`] = pic;
    if (name && entry.name !== name) updates[`boards/${board}/${uid}/name`] = name;
  }
  if (Object.keys(updates).length) await db().ref().update(updates);
  return Object.keys(updates).length;
}

// Hidden while an account is being deleted; erased with it (older weekly
// boards are already gone, see onUserChanged).
const boardPaths = (uid) => boardKeys().map(board => `boards/${board}/${uid}`);

module.exports = { syncLevel, BOARDS, TIERS, onUserChanged, placeOn, boardPaths, refreshProfile, weekBoard, weeklyCounts };
