// XP & levels, awarded by the server only (the rules make users/{uid}/xp
// server-only). OFF until the owner turns it on: database
// config/features/xp = true (owner-only write). While off, nothing is added
// and nothing changes for players.
//
// users/{uid}/xp = { total, level, backfilled, paidLevel, table }
//   total  all XP ever earned (never goes down, stops at xp.maxXp)
//   level  1–99, from the catalog's xp.levels table (total XP per level:
//          a RuneScape-style curve, level 92 is half of 99)
//   backfilled  past play was turned into XP once (see backfill)
//   paidLevel   the highest level whose Diamonds were paid (never paid twice,
//               even if a bigger table moves the account back down)
//   table       the xp.tableVersion the level was worked out with; an older
//               one is re-levelled from the total (relevel / migrateAll)
// A level up pays Diamonds (xp.levelUpDiamonds, or xp.milestoneDiamonds
// instead on every xp.milestoneEvery-th level) and sends an activityInbox
// 'level' mail. There is no daily cap: the match limits already stop farming.
'use strict';

const admin = require('firebase-admin');
const CAT = require('./catalog.json');

const RULES = CAT.xp || {};
const LEVELS = RULES.levels || [0, 0]; // LEVELS[L] = total XP for level L
const MAX_LEVEL = LEVELS.length - 1;
const num = (v, f = 0) => { const n = Number(v); return v !== null && v !== undefined && v !== '' && Number.isFinite(n) ? n : f; };

const xpForLevel = (level) => LEVELS[Math.max(1, Math.min(MAX_LEVEL, level))] || 0;
function levelFor(total) {
  let level = 1;
  while (level < MAX_LEVEL && num(total) >= LEVELS[level + 1]) level++;
  return level;
}
const levelReward = (L) => (num(RULES.milestoneEvery) > 0 && L % num(RULES.milestoneEvery) === 0 ? num(RULES.milestoneDiamonds) : num(RULES.levelUpDiamonds));

// The switch, read at most every 10s per server instance (so flicking it
// takes effect within about 10 seconds).
let cached = { at: 0, on: false };
async function enabled() {
  if (Date.now() - cached.at < 10000) return cached.on;
  let on = false;
  try { on = (await admin.database().ref('config/features/xp').once('value')).val() === true; } catch (e) { on = false; }
  cached = { at: Date.now(), on };
  return on;
}
const resetCache = () => { cached = { at: 0, on: false }; };

// A table change (tableVersion): work the level out again from the total.
// The levels already paid stay paid (paidLevel = the old level), so moving
// back down never pays the same level's Diamonds twice. Returns true when
// something changed.
function relevel(user) {
  const xp = user.xp;
  if (!xp || num(xp.table) === num(RULES.tableVersion, 1)) return false;
  xp.paidLevel = Math.max(num(xp.paidLevel), num(xp.level, 1));
  xp.level = levelFor(num(xp.total));
  xp.table = num(RULES.tableVersion, 1);
  return true;
}

// Adds `amount` XP (mutates `user`) and pays/mails the levels passed.
function addXp(user, amount, now, addDiamonds, { mailEach = true } = {}) {
  relevel(user);
  const xp = user.xp = user.xp || {};
  xp.table = num(RULES.tableVersion, 1);
  const before = num(xp.total);
  const beforeLevel = levelFor(before);
  xp.total = Math.min(num(RULES.maxXp, 1e8), before + Math.max(0, Math.round(amount)));
  xp.level = levelFor(xp.total);
  const levelUps = [];
  const paidUpTo = Math.max(beforeLevel, num(xp.paidLevel));
  if (xp.level > num(xp.paidLevel)) xp.paidLevel = xp.level;
  for (let L = paidUpTo + 1; L <= xp.level; L++) {
    const reward = levelReward(L);
    if (reward) addDiamonds(user, reward);
    if (mailEach) {
      user.activityInbox = user.activityInbox || {};
      user.activityInbox[`level_${L}`] = { type: 'level', level: L, reward, sentAt: now };
    }
    levelUps.push({ level: L, reward });
  }
  return { gained: xp.total - before, total: xp.total, level: xp.level, levelUps };
}

// XP for what an account did before levels existed, worked out from its
// records (each counted once, never again): games finished, wins, Ranked
// games and wins, Gauntlet bots (runs always go easy, easy, medium, hard,
// boss) and daily/weekly challenges. Runs before the first XP an account
// gets, so the game being reported isn't counted twice. The levels it passes
// pay their Diamonds, with ONE mail for the lot.
function pastXp(user) {
  const c = user.matchCounters || {};
  const rs = user.rankedStats || {};
  const rankedWins = num(user.wins);
  const rankedGames = rankedWins + num(user.losses) + num(rs.draws);
  const casualWins = num(c.wins);
  const finished = Math.max(num(c.finished), casualWins + rankedGames);
  const rounds = (CAT.gauntlet && CAT.gauntlet.rounds) || [];
  const perBot = RULES.gauntletBot || {};
  const bots = num(user.gauntlet?.botsBeaten);
  let gauntlet = 0;
  for (let i = 0; i < bots && rounds.length; i++) gauntlet += num(perBot[rounds[i % rounds.length]]);
  const keys = Object.keys(user.completedChallenges || {});
  const daily = keys.filter(k => k.startsWith('daily_')).length;
  const weekly = keys.filter(k => k.startsWith('weekly_')).length;
  return finished * num(RULES.finish) + casualWins * num(RULES.win) + rankedGames * num(RULES.ranked)
    + rankedWins * num(RULES.rankedWin) + gauntlet + daily * num(RULES.daily) + weekly * num(RULES.weekly);
}
function backfill(user, now, addDiamonds) {
  if (user.xp && user.xp.backfilled) return null;
  const amount = pastXp(user);
  const res = addXp(user, amount, now, addDiamonds, { mailEach: false });
  user.xp.backfilled = true;
  if (res.levelUps.length) {
    user.activityInbox = user.activityInbox || {};
    user.activityInbox.level_backfill = { type: 'level', backfill: true, level: res.level, xp: res.gained, reward: res.levelUps.reduce((s, u) => s + u.reward, 0), sentAt: now };
  }
  return res;
}

// Adds XP inside a users/{uid} transaction (mutates `user`). `parts` is a
// list of [reason, amount]. Returns { gained, total, level, levelUps } or
// null when nothing was added. `addDiamonds` pays level-up rewards.
function award(user, parts, now, addDiamonds) {
  const wanted = parts.reduce((s, [, n]) => s + Math.max(0, num(n)), 0);
  if (!wanted) return null;
  return addXp(user, wanted, now, addDiamonds);
}

// Gauntlet XP for beating the bot of round `round` (0-based).
const gauntletBotXp = (round) => {
  const rounds = (CAT.gauntlet && CAT.gauntlet.rounds) || [];
  return num((RULES.gauntletBot || {})[rounds[round]]);
};

// Re-levels EVERY account after a table change (tableVersion), once per
// table: fixes users/{uid}/xp/level and the public copy other players see
// (publicProfiles/{uid}/level, only if the profile still exists). Accounts
// that play re-level themselves anyway (addXp); this covers everyone else.
let migratedTable = 0;
async function migrateAll() {
  const want = num(RULES.tableVersion, 1);
  if (migratedTable === want) return 0;
  const root = admin.database();
  const doneRef = root.ref('config/xpTableDone');
  if (num((await doneRef.once('value')).val()) === want) { migratedTable = want; return 0; }
  const users = (await root.ref('users').once('value')).val() || {};
  let fixed = 0;
  for (const [uid, u] of Object.entries(users)) {
    if (!u || !u.xp || num(u.xp.table) === want) continue;
    let level = null;
    await root.ref(`users/${uid}/xp`).transaction((xp) => {
      if (xp === null) return null;
      const holder = { xp };
      relevel(holder);
      level = holder.xp.level;
      return holder.xp;
    });
    if (level) {
      const pub = root.ref(`publicProfiles/${uid}`);
      if ((await pub.once('value')).exists()) await pub.child('level').set(level);
      fixed++;
    }
  }
  await doneRef.set(want);
  migratedTable = want;
  return fixed;
}

module.exports = { RULES, enabled, award, backfill, pastXp, gauntletBotXp, levelFor, xpForLevel, relevel, migrateAll, resetCache };
