'use strict';

const assert = require('node:assert/strict');
const P = require('./diamond-purchases');

assert.equal(P.PURCHASES_ENABLED, false, 'real-money purchasing must remain hard-off');
assert.deepEqual(
  Object.fromEntries(Object.entries(P.PACKS).map(([id, p]) => [id, [p.pricePence, p.diamonds]])),
  {
    gbp_099: [99, 100],
    gbp_199: [199, 250],
    gbp_499: [499, 650],
    gbp_999: [999, 1500],
    gbp_1999: [1999, 4000],
    gbp_4999: [4999, 12000]
  }
);
assert.equal(P.PACKS.gbp_999.recommended, true);
assert.equal(P.entitlementFor('gbp_099', true).totalDiamonds, 125);
assert.equal(P.entitlementFor('gbp_199', true).totalDiamonds, 313);
assert.equal(P.entitlementFor('gbp_499', true).totalDiamonds, 813);
assert.equal(P.entitlementFor('gbp_999', true).totalDiamonds, 1875);
assert.equal(P.entitlementFor('gbp_1999', true).totalDiamonds, 5000);
assert.equal(P.entitlementFor('gbp_4999', true).totalDiamonds, 15000);
assert.equal(P.entitlementFor('gbp_999', false).totalDiamonds, 1500);
assert.equal(P.entitlementFor('gbp_999', true).supporterFrame, true);

console.log('diamond-purchases: dormant configuration tests passed');
