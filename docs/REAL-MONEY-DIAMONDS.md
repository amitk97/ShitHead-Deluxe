# Real-money Diamonds — dormant pre-launch infrastructure

Status: **HARD OFF. NOT PLAYER-VISIBLE. DO NOT ACTIVATE WITHOUT AMIT'S EXPLICIT APPROVAL.**

## Approved packs

| Pack | GBP | Diamonds | Notes |
|---|---:|---:|---|
| gbp_099 | £0.99 | 100 | |
| gbp_199 | £1.99 | 250 | |
| gbp_499 | £4.99 | 650 | |
| gbp_999 | £9.99 | 1,500 | Recommended |
| gbp_1999 | £19.99 | 4,000 | Premium/custom reward to be finalised |
| gbp_4999 | £49.99 | 12,000 | Special premium reward(s) to be finalised |

First-ever purchase: **+25% Diamonds** and the one-time **First Purchase** challenge unlocks the **Animated Supporter Frame**. The challenge stays hidden until purchases launch.

## Safety architecture

`functions/diamond-purchases.js` is provider-neutral and dormant. It is not exported from `functions/index.js`, so there is no public endpoint and no way for the current site to initiate or fulfil a real-money purchase.

The future payment webhook must:
1. Verify the payment provider's signature/authenticity server-side.
2. Read the paid amount/currency from the provider event, never the browser.
3. Map only a known pack id to the server-side catalogue.
4. Call `fulfilVerifiedPurchase` only after payment is final/successful.
5. Use the provider transaction id as the idempotency key.
6. Never accept a Diamond quantity supplied by the client.

The fulfilment transaction awards the fixed server-side amount, applies the first-purchase bonus once, grants the Supporter Frame once, records the challenge once, and records the transaction. A repeated transaction id cannot award a second time.

## Before activation

Do not expose Buy Diamonds UI, the First Purchase challenge, Apple Pay/Google Pay buttons, or a payment endpoint until Amit explicitly says to proceed after Revolut confirmation.

Still required after provider approval:
- choose/confirm the payment provider and obtain test credentials;
- implement and verify its signed webhook;
- add the Animated Supporter Frame to the visible cosmetic catalogue/art and equip allow-list;
- finalise the £19.99 and £49.99 cosmetic rewards;
- add purchase history UI;
- add refund/reversal handling and test it;
- add provider-specific Apple Pay/Google Pay;
- run duplicate-webhook, wrong-amount, failed-payment and replay tests;
- perform a £0.99 end-to-end live test before public launch.

## Commercial/legal launch gate

Before public activation, publish and link from checkout:
- Terms of Sale;
- Refund / digital-content cancellation policy;
- Privacy Policy payment-processing update;
- Virtual Currency Terms.

The terms should make clear that Diamonds are closed-loop virtual currency for ShitHead, have no cash value, cannot be withdrawn or exchanged for money, and are not transferable unless the game explicitly introduces such a feature. Exact UK consumer-law wording should be checked against the final checkout/provider flow before publication.
