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
    tiers.push({ tier: t, diamonds, ...(item ? { item: { id: item.id, name: item.name } } : {}) });
  }
  return { key, xp: s.xp, tier: s.tier, gained: gain, tiers };
}

function grantItem(user, key, tier, item, now) {
  if (user.ownedCosmetics && user.ownedCosmetics[item.id]) return;
  user.ownedCosmetics = user.ownedCosmetics || {};
  user.ownedCosmetics[item.id] = { cost: 0, purchasedAt: now, season: key, tier };
  user.activityInbox = user.activityInbox || {};
  user.activityInbox[`unlock_${item.id}`] = { type: 'shop', unlocked: true, name: String(item.name).slice(0, 80), cost: 0, requirement: `Season Pass tier ${tier}`, sentAt: now };
}

// Sign-in repair: items of tiers already reached but missing (a failed write).
function grantReached(user, now) {
  const out = [];
  Object.entries(user.seasonPass || {}).forEach(([key, s]) => {
    const season = SP.seasons[key];
    if (!season) return;
    Object.entries(season.items).forEach(([t, id]) => {
      const item = (SP.items || []).find((i) => i.id === id);
      if (item && num(s.tier) >= num(t) && !(user.ownedCosmetics && user.ownedCosmetics[id])) { grantItem(user, key, num(t), item, now); out.push(id); }
    });
  });
  return out;
}

module.exports = { add, grantReached, tierFor, tierStart, seasonOn };
