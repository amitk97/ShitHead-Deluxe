// Season Pass (free track): a season is two calendar months (UK days). Every
// XP an account earns while the season is on (xp.award, never back-dated and
// never the seasonal-event boost) also fills users/{uid}/seasonPass/<key> =
// { xp, tier }. Reaching a tier pays its Diamonds and any item at once; there
// is no claim step. Numbers and items come from catalog.seasonPass.
'use strict';

const CAT = require('./catalog.json');

const SP = CAT.seasonPass || { tiers: 0, costs: [], diamonds: [], seasons: {} };
const num = (v, f = 0) => { const n = Number(v); return v !== null && v !== undefined && v !== '' && Number.isFinite(n) ? n : f; };
const ukDateKey = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// XP needed to reach tier t from zero (tier 0 = 0).
const tierStart = (t) => { let n = 0; for (let i = 1; i <= Math.min(t, num(SP.tiers)); i++) n += num(SP.costs[i]); return n; };
const tierFor = (xp) => { let t = 0; while (t < num(SP.tiers) && num(xp) >= tierStart(t + 1)) t++; return t; };
// The season key (start month) live on a UK date, or null.
const seasonOn = (day) => Object.keys(SP.seasons || {}).find((k) => day >= SP.seasons[k].start && day <= SP.seasons[k].end) || null;

// Adds season XP (mutates `user`) and grants the tiers passed. Returns null off-season.
function add(user, amount, now, addDiamonds) {
  const key = seasonOn(ukDateKey(new Date(now)));
  const gain = Math.max(0, Math.round(num(amount)));
  if (!key || !gain || !num(SP.tiers)) return null;
  const all = user.seasonPass = user.seasonPass || {};
  const s = all[key] = all[key] || { xp: 0, tier: 0 };
  const before = tierFor(s.xp);
  s.xp = Math.min(tierStart(num(SP.tiers)), num(s.xp) + gain);
  s.tier = tierFor(s.xp);
  const tiers = [];
  for (let t = before + 1; t <= s.tier; t++) {
    const diamonds = num(SP.diamonds[t]);
    if (diamonds) addDiamonds(user, diamonds);
    const itemId = SP.seasons[key].items[t];
    const item = itemId && (SP.items || []).find((i) => i.id === itemId);
    if (item) grantItem(user, key, t, item, now);
    const fin = t === num(SP.finale && SP.finale.tier) ? grantFinale(user, key, s, now, addDiamonds) : null;
    tiers.push({ tier: t, diamonds: diamonds + (fin ? fin.diamonds : 0), ...(item ? { item: { id: item.id, name: item.name } } : {}), ...(fin ? { finale: fin } : {}) });
  }
  return { key, xp: s.xp, tier: s.tier, gained: gain, tiers };
}

// The finale item every season's last tier adds (catalog seasonPass.finale): granted like any pass item, or, when the
// account already owns it, paid as Diamonds instead. Once per season (s.finale), so a sign-in repair never repeats it.
function grantFinale(user, key, s, now, addDiamonds) {
  const F = SP.finale;
  if (!F || !F.id || s.finale) return null;
  s.finale = true;
  user.activityInbox = user.activityInbox || {};
  if (user.ownedCosmetics && user.ownedCosmetics[F.id]) {
    const diamonds = num(F.ownedDiamonds);
    if (diamonds) addDiamonds(user, diamonds);
    user.activityInbox[`seasonpass_${key}_finale`] = { type: 'seasonPass', key, when: 'finale', name: String(F.name || F.id).slice(0, 80), diamonds, sentAt: now };
    return { id: F.id, name: F.name, owned: true, diamonds };
  }
  grantItem(user, key, num(F.tier), { id: F.id, name: F.name || F.id }, now);
  return { id: F.id, name: F.name, owned: false, diamonds: 0 };
}

function grantItem(user, key, tier, item, now) {
  if (user.ownedCosmetics && user.ownedCosmetics[item.id]) return;
  user.ownedCosmetics = user.ownedCosmetics || {};
  user.ownedCosmetics[item.id] = { cost: 0, purchasedAt: now, season: key, tier };
  user.activityInbox = user.activityInbox || {};
  user.activityInbox[`unlock_${item.id}`] = { type: 'shop', unlocked: true, name: String(item.name).slice(0, 80), cost: 0, requirement: `Season Pass tier ${tier}`, sentAt: now };
}

// Sign-in repair: items of tiers already reached but missing (a failed write).
function grantReached(user, now, addDiamonds) {
  const out = [];
  Object.entries(user.seasonPass || {}).forEach(([key, s]) => {
    const season = SP.seasons[key];
    if (!season) return;
    Object.entries(season.items).forEach(([t, id]) => {
      const item = (SP.items || []).find((i) => i.id === id);
      if (item && num(s.tier) >= num(t) && !(user.ownedCosmetics && user.ownedCosmetics[id])) { grantItem(user, key, num(t), item, now); out.push(id); }
    });
    if (SP.finale && num(s.tier) >= num(SP.finale.tier) && !s.finale && typeof addDiamonds === 'function') {
      const fin = grantFinale(user, key, s, now, addDiamonds);
      if (fin && !fin.owned) out.push(fin.id);
    }
  });
  return out;
}

module.exports = { add, grantReached, tierFor, tierStart, seasonOn };

// ---- Mailbox notice the day before a season starts and ends ----------------
const shiftDay = (key, n) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
// [{key, when: 'start'|'end'}] to mail on UK date `day` (the season begins / ends the next day).
function mailsDue(day) {
  const tomorrow = shiftDay(day, 1), out = [];
  Object.entries(SP.seasons || {}).forEach(([key, s]) => {
    if (s.start === tomorrow) out.push({ key, when: 'start' });
    if (s.end === tomorrow) out.push({ key, when: 'end' });
  });
  return out;
}
// Mails every account once (server-only marker seasonPassMail/<key>/<when> is taken first, so a re-run sends nothing).
async function sendSeasonMails(day = ukDateKey(new Date())) {
  const admin = require('firebase-admin'), root = admin.database();
  let sent = 0;
  for (const { key, when } of mailsDue(day)) {
    const marker = await root.ref(`seasonPassMail/${key}/${when}`).transaction((cur) => (cur === null ? Date.now() : undefined));
    if (!marker.committed) continue;
    const now = Date.now(), id = `seasonpass_${key}_${when}`;
    let token;
    do {
      const page = await admin.auth().listUsers(1000, token);
      const uids = page.users.filter(u => !u.disabled).map(u => u.uid);
      const pending = (await Promise.all(uids.map((uid) => root.ref(`users/${uid}/deletion`).once('value')))).map(s => s.exists());
      const updates = {};
      uids.forEach((uid, i) => { if (!pending[i]) updates[`users/${uid}/activityInbox/${id}`] = { type: 'seasonPass', key, when, sentAt: now }; });
      if (Object.keys(updates).length) await root.ref().update(updates);
      sent += Object.keys(updates).length;
      token = page.pageToken;
    } while (token);
  }
  return sent;
}

module.exports.mailsDue = mailsDue;
module.exports.sendSeasonMails = sendSeasonMails;
