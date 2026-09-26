// Account data: export ("Download my data") and deletion with a recovery
// window. Used by the economy callable (actions accountData / deleteAccount)
// and the daily purgeDeletedAccounts job in index.js.
//
// Deleting: the request hides the player at once (public profile, leaderboard
// entry, friends' lists stop showing them) and sets
// users/{uid}/deletion = { requestedAt, purgeAt }. Signing back in before
// purgeAt can cancel it (the game offers "Keep my account"). After purgeAt the
// daily job erases everything and the sign-in itself.
'use strict';
const admin = require('firebase-admin');

const DELETION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const db = () => admin.database();
const val = async (path) => (await db().ref(path).once('value')).val();

// Everything stored about one account, as one JSON-able object. Push tokens
// are left out (device secrets, not personal data worth handing out).
async function collectAccountData(uid, authUser = null) {
  const [user, publicProfile, friends, friendRequests, ignores, shopPurchases, gifts, gameInvites, errorReports, playerReports] = await Promise.all([
    val(`users/${uid}`), val(`publicProfiles/${uid}`), val(`friends/${uid}`), val(`friendRequests/${uid}`),
    val(`ignores/${uid}`), val(`shopPurchases/${uid}`), val(`gifts/${uid}`), val(`gameInvites/${uid}`),
    val(`errorReports/${uid}`), val('playerReports')
  ]);
  const username = user && typeof user.username === 'string' ? user.username : null;
  const reportsMade = [];
  Object.entries(playerReports || {}).forEach(([reported, byReporter]) => {
    const mine = byReporter && byReporter[uid];
    if (mine) reportsMade.push({ reportedUid: reported, ...mine });
  });
  const friendRequestsSent = [];
  const allRequests = await val('friendRequests');
  Object.entries(allRequests || {}).forEach(([to, from]) => { if (from && from[uid]) friendRequestsSent.push({ toUid: to, ...from[uid] }); });
  return {
    about: 'Everything ShitHead Deluxe stores about your account (shithead-pro.web.app).',
    exportedAt: new Date().toISOString(),
    account: {
      uid,
      email: authUser?.email || null,
      emailVerified: authUser ? !!authUser.emailVerified : null,
      signInMethods: authUser ? (authUser.providerData || []).map(p => p.providerId) : null,
      createdAt: authUser?.metadata?.creationTime || null,
      lastSignInAt: authUser?.metadata?.lastSignInTime || null,
      username
    },
    profile: user || {},
    publicProfile: publicProfile || null,
    leaderboardEntry: username ? await val(`leaderboard/${username.toLowerCase()}`) : null,
    friends: Object.keys(friends || {}),
    friendRequestsReceived: friendRequests || {},
    friendRequestsSent,
    ignoredPlayers: Object.keys(ignores || {}),
    shopPurchases: shopPurchases || {},
    giftsWaiting: gifts || {},
    gameInvitesWaiting: gameInvites || {},
    errorReports: errorReports || {},
    playerReportsMade: reportsMade
  };
}

// Hides the account straight away; the data stays until purgeAt.
async function requestDeletion(uid, now = Date.now()) {
  const username = await val(`users/${uid}/username`);
  const deletion = { requestedAt: now, purgeAt: now + DELETION_GRACE_MS };
  const updates = {
    [`users/${uid}/deletion`]: deletion,
    [`publicProfiles/${uid}`]: null,
    [`pushTokens/${uid}`]: null
  };
  if (typeof username === 'string' && username.trim()) updates[`leaderboard/${username.trim().toLowerCase()}`] = null;
  await db().ref().update(updates);
  return deletion;
}
async function cancelDeletion(uid) {
  await db().ref(`users/${uid}/deletion`).remove();
}

// Erases the account everywhere, including other players' friend lists and
// requests, then the sign-in itself.
async function purgeAccount(uid) {
  const [user, friends, allRequests, allReports, codes] = await Promise.all([
    val(`users/${uid}`), val(`friends/${uid}`), val('friendRequests'), val('playerReports'), val('referralCodes')
  ]);
  const username = user && typeof user.username === 'string' ? user.username.trim().toLowerCase() : '';
  const updates = {};
  ['users', 'publicProfiles', 'friends', 'friendRequests', 'ignores', 'shopPurchases', 'gifts', 'gameInvites', 'pushTokens', 'errorReports', 'playerReports']
    .forEach(root => { updates[`${root}/${uid}`] = null; });
  Object.keys(friends || {}).forEach(f => { updates[`friends/${f}/${uid}`] = null; });
  Object.entries(allRequests || {}).forEach(([to, from]) => { if (from && from[uid]) updates[`friendRequests/${to}/${uid}`] = null; });
  Object.entries(allReports || {}).forEach(([reported, by]) => { if (by && by[uid]) updates[`playerReports/${reported}/${uid}`] = null; });
  Object.entries(codes || {}).forEach(([code, owner]) => { if (owner && owner.uid === uid) updates[`referralCodes/${code}`] = null; });
  if (username) {
    if ((await val(`usernames/${username}`)) === uid) updates[`usernames/${username}`] = null;
    updates[`leaderboard/${username}`] = null;
  }
  await db().ref().update(updates);
  try { await admin.auth().deleteUser(uid); } catch (e) { if (e?.code !== 'auth/user-not-found') throw e; }
  return Object.keys(updates).length;
}

// Accounts whose recovery window has ended.
async function purgeDueAccounts(now = Date.now()) {
  const snap = await db().ref('users').orderByChild('deletion/purgeAt').startAt(1).endAt(now).once('value');
  const due = [];
  snap.forEach(child => { if (Number(child.child('deletion/purgeAt').val()) <= now) due.push(child.key); });
  for (const uid of due) await purgeAccount(uid);
  return due;
}

module.exports = { DELETION_GRACE_MS, collectAccountData, requestDeletion, cancelDeletion, purgeAccount, purgeDueAccounts };
