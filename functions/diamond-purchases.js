'use strict';

// Dormant real-money Diamond infrastructure.
// IMPORTANT: this module is deliberately not exported as a Firebase Function
// and does not render anything in the client. Nothing here can take payment.
// Activate only after owner approval + payment-provider verification.

const admin = require('firebase-admin');

const PURCHASES_ENABLED = false;
const FIRST_PURCHASE_BONUS_PERCENT = 25;
const SUPPORTER_FRAME_ID = 'frame-supporter-animated';

const PACKS = Object.freeze({
  gbp_099: { pricePence: 99, diamonds: 100 },
  gbp_199: { pricePence: 199, diamonds: 250 },
  gbp_499: { pricePence: 499, diamonds: 650 },
  gbp_999: { pricePence: 999, diamonds: 1500, recommended: true },
  gbp_1999: { pricePence: 1999, diamonds: 4000, premiumReward: 'pending' },
  gbp_4999: { pricePence: 4999, diamonds: 12000, specialRewards: 'pending' }
});

function pack(id) {
  const value = PACKS[String(id || '')];
  if (!value) throw new Error('Unknown Diamond pack.');
  return value;
}

function firstPurchaseBonus(base) {
  return Math.round(Number(base || 0) * FIRST_PURCHASE_BONUS_PERCENT / 100);
}

function entitlementFor(packId, isFirstPurchase) {
  const p = pack(packId);
  const bonus = isFirstPurchase ? firstPurchaseBonus(p.diamonds) : 0;
  return {
    packId,
    pricePence: p.pricePence,
    baseDiamonds: p.diamonds,
    bonusDiamonds: bonus,
    totalDiamonds: p.diamonds + bonus,
    firstPurchase: !!isFirstPurchase,
    supporterFrame: !!isFirstPurchase,
    recommended: !!p.recommended
  };
}

// Provider-neutral fulfilment. A future Revolut/other webhook must verify the
// provider signature and paid amount BEFORE calling this function.
// transactionId is the idempotency key: the same payment can never pay twice.
async function fulfilVerifiedPurchase({ uid, transactionId, packId, amountPence, currency = 'GBP', provider }) {
  if (!PURCHASES_ENABLED) throw new Error('Real-money purchases are disabled.');
  if (!uid || !transactionId || !provider) throw new Error('Missing verified purchase fields.');
  const p = pack(packId);
  if (currency !== 'GBP' || Number(amountPence) !== p.pricePence) throw new Error('Payment does not match the selected pack.');

  const db = admin.database();
  const ledgerRef = db.ref(`diamondPurchases/${uid}/${transactionId}`);
  const existing = await ledgerRef.once('value');
  if (existing.exists()) return { alreadyProcessed: true, ...existing.val() };

  const userRef = db.ref(`users/${uid}`);
  let result = null;
  const now = Date.now();
  const tx = await userRef.transaction((user) => {
    if (!user) return;
    user.realMoneyPurchases = user.realMoneyPurchases || {};
    if (user.realMoneyPurchases[transactionId]) {
      result = { alreadyProcessed: true };
      return;
    }
    const first = !user.firstDiamondPurchaseAt;
    const entitlement = entitlementFor(packId, first);
    user.diamonds = Math.min(999999, Math.max(0, Number(user.diamonds) || 0) + entitlement.totalDiamonds);
    user.realMoneyPurchases[transactionId] = { packId, at: now, diamonds: entitlement.totalDiamonds };
    user.firstDiamondPurchaseAt = user.firstDiamondPurchaseAt || now;
    if (first) {
      user.ownedCosmetics = user.ownedCosmetics || {};
      user.ownedCosmetics[SUPPORTER_FRAME_ID] = { purchasedAt: now, cost: 0, source: 'first-purchase' };
      user.completedChallenges = user.completedChallenges || {};
      user.completedChallenges['first-purchase'] = { completedAt: now, reward: 0 };
      user.activityInbox = user.activityInbox || {};
      user.activityInbox.first_purchase = {
        type: 'shop', unlocked: true, name: 'Animated Supporter Frame',
        cost: 0, requirement: 'Make your first Diamond purchase', sentAt: now
      };
    }
    result = entitlement;
    return user;
  }, undefined, false);

  if (!tx.committed && !result?.alreadyProcessed) throw new Error('Could not fulfil purchase.');
  if (result?.alreadyProcessed) return result;

  const record = {
    uid, transactionId, provider, packId, amountPence: p.pricePence, currency,
    baseDiamonds: result.baseDiamonds, bonusDiamonds: result.bonusDiamonds,
    diamondsAwarded: result.totalDiamonds, firstPurchase: result.firstPurchase,
    supporterFrame: result.supporterFrame, status: 'completed', completedAt: now
  };
  await ledgerRef.set(record);
  return record;
}

module.exports = {
  PURCHASES_ENABLED, FIRST_PURCHASE_BONUS_PERCENT, SUPPORTER_FRAME_ID,
  PACKS, pack, firstPurchaseBonus, entitlementFor, fulfilVerifiedPurchase
};
