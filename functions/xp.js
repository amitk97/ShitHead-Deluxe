// XP & levels, awarded by the server only (the rules make users/{uid}/xp
// server-only). OFF until the owner turns it on: database
// config/features/xp = true (owner-only write). While off, nothing is added
// and nothing changes for players.
//
// users/{uid}/xp = { total, level, backfilled, paidLevel, table, week, weekXp }
//   week / weekXp  the UK week key and the XP earned in it (Levels board,
//                  "This week"; back-dated XP doesn't count)
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
// The UK week (Monday start), same keys as the weekly challenges
// ('2026-W40'); the Levels leaderboard's "This week" view counts XP per week.
const ukDateKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
function ukWeekKey(date = new Date()) {
  const [y, m, dd] = ukDateKey(date).split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, dd));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
// XP earned in `week` (0 when the account's counter belongs to another week).
const weekXp = (user, week) => (user && user.xp && user.xp.week === week ? num(user.xp.weekXp) : 0);
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
function addXp(user, amount, now, addDiamonds, { mailEach = true, countWeek = true } = {}) {
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
  // This week's XP (never the one-time back-dated XP).
  const gained = xp.total - before;
  if (countWeek && gained > 0) {
    const week = ukWeekKey(new Date(now));
    if (xp.week !== week) { xp.week = week; xp.weekXp = 0; }
    xp.weekXp = num(xp.weekXp) + gained;
  }
  const rewards = grantLevelRewards(user, now);
  return { gained, total: xp.total, level: xp.level, levelUps, ...(rewards.length ? { rewards } : {}) };
}

// Level rewards (catalog xp.rewards, v248): free cosmetics that unlock at a
// level (a card back at 15, a frame at 25, a table at 50). Granted into
// ownedCosmetics with an unlock mail once the account's level reaches them:
// in addXp and at sign-in (economy sync, for accounts already past them).
function grantLevelRewards(user, now) {
  const level = num(user.xp && user.xp.level);
  const out = [];
  (RULES.rewards || []).forEach((r) => {
    if (level < num(r.level) || (user.ownedCosmetics && user.ownedCosmetics[r.id])) return;
    user.ownedCosmetics = user.ownedCosmetics || {};
    user.ownedCosmetics[r.id] = { cost: 0, purchasedAt: now, level: num(r.level) };
    user.activityInbox = user.activityInbox || {};
    user.activityInbox[`unlock_${r.id}`] = { type: 'shop', unlocked: true, name: String(r.name).slice(0, 80), cost: 0, requirement: `Reach Lvl ${num(r.level)}`, sentAt: now };
    out.push({ id: r.id, name: r.name, level: num(r.level) });
  });
  return out;
}

// Friends hear about big levels (v248, owner): every 10th level and 99.
// Called after a users/{uid} write commits (economy userTx); only the
// highest such level crossed by one write is mailed (a back-dated jump of
// many levels sends one mail), and never for a re-levelled table.
const FRIEND_MAIL_MAX = 300;
const friendMailLevel = (from, to) => {
  let best = 0;
  for (let L = from + 1; L <= to; L++) if (L % 10 === 0 || L === MAX_LEVEL) best = L;
  return best;
};
async function mailFriendsOnLevel(uid, before, after) {
  const b = before && before.xp, a = after && after.xp;
  if (!a || !b || after.deletion) return 0;
  if (num(a.table) !== num(b.table)) return 0;
  const L = friendMailLevel(num(b.level, 1), num(a.level, 1));
  const name = typeof after.username === 'string' ? after.username : null;
  if (!L || !name) return 0;
  const root = admin.database();
  const friends = Object.keys((await root.ref(`friends/${uid}`).once('value')).val() || {}).slice(0, FRIEND_MAIL_MAX);
  const avatar = (await root.ref(`publicProfiles/${uid}/avatar`).once('value')).val();
  const now = Date.now();
  const updates = {};
  friends.forEach((fid) => {
    updates[`users/${fid}/activityInbox/friendlevel_${uid}_${L}`] = { type: 'friendLevel', uid, name: name.slice(0, 24), level: L, sentAt: now, ...(typeof avatar === 'string' ? { avatar } : {}) };
  });
  if (friends.length) await root.ref().update(updates);
  return friends.length;
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
  const res = addXp(user, amount, now, addDiamonds, { mailEach: false, countWeek: false });
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
// (publicProfiles, the leaderboards: boards.syncLevel, existing entries only). Accounts
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
      // Public profile, Ranked leaderboard and board entries (only existing ones).
      await require('./boards').syncLevel(uid, typeof u.username === 'string' ? u.username : null, level);
      fixed++;
    }
  }
  await doneRef.set(want);
  migratedTable = want;
  return fixed;
}

module.exports = { RULES, enabled, award, grantLevelRewards, mailFriendsOnLevel, friendMailLevel, backfill, pastXp, gauntletBotXp, levelFor, xpForLevel, relevel, migrateAll, resetCache, ukWeekKey, weekXp };
