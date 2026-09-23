# ShitHead Deluxe

Single-file web game (`index.html`) on Firebase Hosting + Realtime Database (project `shithead-pro`).

- `index.html` is the live game. `index1.html`, `index2.html`, … are old snapshots — don't edit them (Hosting ignores them).
- `database.rules.json` is the source for the Realtime Database rules. Hosting deploys automatically on merge to `main`, but **rules do not**: after changing them, publish the file's contents in Firebase Console → Realtime Database → Rules.
- **Whenever the rules change, paste the complete `database.rules.json` into the chat reply as one copy-pastable code block.** The owner publishes rules by pasting them into the Console and can't easily open/copy JSON files.
- Tests: open `index.html?dev-tests=1`. Some tests need a live Firebase connection and fail offline; compare against the base branch rather than expecting 100%.

## AmitK test account

- Username `AmitK` / email `amirk2197@googlemail.com` (`isAmitkTestingAccount`).
- Gets a one-time, real 999,999 Diamond balance (`ensureAmitkSpendableTestBalance`, marker `amitKShopTestGrantV4Done`). Spending reduces it; it is never refilled.
- The exception is **Shop spending only**. Do not unlock gameplay (bot difficulties, ranked, etc.) for this account.
- No special Database Rules exception is needed: users may write their own `users/{uid}` and diamonds are capped at 999,999.

## Firebase transaction pitfall (the cause of "has Diamonds but can't buy")

`ref.transaction(update)` first calls `update` with the **local cache**, which is `null` when nothing keeps that path live-synced. Returning `undefined` aborts immediately without ever reading the server. So in any transaction that can abort:

- `if (current === null) return null;` before the checks, so Firebase re-runs with the server value.
- Reset any error/result captured by the closure at the start of every pass, and confirm success from the final pass (see `createCosmeticPurchaseTransaction`).

A write to a parent node re-runs `.validate` on every child, so a whole-`users/{uid}` transaction fails if any existing child (e.g. `equippedCosmetics`) no longer satisfies its rule. `equippedCosmetics` rules accept ownership from `users/{uid}/ownedCosmetics` (canonical) or the legacy `shopPurchases/{uid}/cosmetics` mirror.
