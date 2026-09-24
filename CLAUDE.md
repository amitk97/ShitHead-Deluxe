# ShitHead Deluxe

Single-file web game (`index.html`) on Firebase Hosting + Realtime Database (project `shithead-pro`).

- `index.html` is the live game. `index1.html`, `index2.html`, … are old snapshots — don't edit them (Hosting ignores them).
- `database.rules.json` is the source for the Realtime Database rules. Hosting deploys automatically on merge to `main`, but **rules do not**: after changing them, publish the file's contents in Firebase Console → Realtime Database → Rules.
- **Commit and push straight to `main`** (it deploys live automatically). No branches, PRs or merge steps unless the owner asks for one — there are no other players yet.
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

## Profile pictures

- Cosmetic type `avatar` (category `Profile Pictures`). Art is inline SVG in `AVATAR_ART`; every picture uses the same 1:1 rounded-square tile via `avatarHtml(id, size)`. Keep new pictures in that style (shared tile, glow tone, metal/suit gradients).
- Free = `BUILT_IN_COSMETICS` (Bronze Crown is also what `default` shows). Shop = `COSMETIC_SHOP_ITEMS`. Earn-only = `EARNED_AVATARS`, granted into `ownedCosmetics` by `grantEarnedAvatars`. The Platinum Crown (id `avatar-crown-diamond`, kept for compatibility) is earned at Platinum.
- Bots get a random free picture, never shared with another bot at the table (`pickBotAvatar` / `ensureBotAvatars`).
- Adding a picture also needs the rules updated: `equippedCosmetics/avatar` id list and the `shopPurchases` price list.
- The page's Tailwind CSS is precompiled: new utility class names silently do nothing. Use custom CSS classes or inline styles for new UI.

## Shop / Custom layout

- Both pages use section tabs driven by `COSMETIC_TABS` (Custom adds a Deck tab via `CUSTOM_TABS`). A new cosmetic category = one entry there.
- Custom shows every cosmetic as a tile (`.cosmetic-tile-grid`, 2 per row; pictures 3 per row).
- Table themes are CSS on `body[data-equipped-table-theme="…"] #gameTable` plus a `--table-label-border` accent and a Shop preview background in `shopCosmeticPreviewMarkup`. New themes also need the rules id list and price.
