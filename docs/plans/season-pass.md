> **Season 2 (owner, 20 Oct 2026): Ice Age, the era (not the film), 1 Jan to 28 Feb 2027. Idea only, nothing built: tier 10 cave-painting card back, tier 30 woolly mammoth avatar, tier 50 glacier steppe table.**
>
> **Decisions after review (owner, 20 Oct 2026), built in v393:** free track only for Season 1, Premium and tier skips on hold (no way to accept money yet); theme Ancient Egypt; no extra frames (tier 30 is an avatar); rewards are granted the moment a tier is reached (there is no claim step or claim window); Season XP is the normal XP with no event boost; no optional weekly bonus. Where the text below says otherwise, this note wins.

# Season Pass: detailed plan

Status: **PLAN ONLY. Nothing has been built.** Written 20 October 2026.
Decided by the owner: 2-calendar-month seasons, 50 tiers, first season 1 Nov 2026 to 31 Dec 2026, next season starts 1 Jan 2027, a free track and a Premium track, Premium is paid with real money (so it cannot be built on the front end yet).
Everything else here is a recommendation. Section 14 lists the open decisions.

---

## 1. Goals and principles
1. **Reward playing, not paying.** The free track must be good on its own; Premium adds extra cosmetics, never gameplay power.
2. **No new things to learn.** Season XP comes from XP the game already awards. Players do not do anything different.
3. **Server decides everything.** Progress, claims and Premium all live in `users/{uid}`, are server-only fields, and go through the `economy` function, like Diamonds do today.
4. **Cosmetics only, existing item types.** Avatars, card backs, frames, tables, burns, Joker effects, victory effects and emotes already exist, so no new item system.
5. **Calm tone.** No countdown pressure tricks, no "last chance!" shouting; the owner's Voice rules apply.
6. **Honest about limits.** Premium is a one-off purchase for one season, not a subscription.

## 2. Calendar and season keys
- A season = two calendar months, UK time (the game already uses UK days).
- **Season key = the start month**, `YYYY-MM`. For example `2026-11`.

| Key | Dates | Days | Theme (draft) |
|---|---|---|---|
| 2026-11 | 1 Nov to 31 Dec 2026 | 61 | Midnight Magic |
| 2027-01 | 1 Jan to 28 Feb 2027 | 59 | **Ice Age** (the era; owner's pick, 20 Oct 2026; replaces Shogun Dynasty, which clashes with Lunar New Year) |
| 2027-03 | 1 Mar to 30 Apr | 61 | Wild West Showdown |
| 2027-05 | 1 May to 30 Jun | 61 | Deep Sea Abyss |
| 2027-07 | 1 Jul to 31 Aug | 62 | Steampunk Skies |
| 2027-09 | 1 Sep to 31 Oct | 61 | Mythic Olympus |

- Season dates are computed from the key, with no hard-coded table, so a new year needs nothing extra (compare `functions/seasons.js` for events).
- **Claim window:** tiers reached can be claimed until **7 days after** the season ends (UK midnight). After that they expire. A player who is mid-way sees "Last season: claim by 7 Jan".
- Seasonal **events** (Halloween, Diwali, Christmas and the rest) keep running as they do now, alongside the pass. They are separate; items are not shared between them.

## 3. Season XP (how progress works)

### 3.1 Source: reuse the XP the game already awards
Every XP award already passes through one function on the server, `xp.award` / `addXp` (`functions/xp.js`), called inside the `userTx` transaction for finishes, wins, Ranked, Gauntlet bots, daily and weekly challenges and puzzles. **Season XP is the same amount, added in the same place**, in the same way `weekXp` is already counted.

- **Counted:** exactly what that award pays before the event boost, for the season the UK date falls in.
- **Not counted:** back-dated XP (`backfill`), tutorial, anything refused by the existing caps (40 wins a day, 45 seconds apart, and so on). This means the pass inherits the existing anti-cheat for free.
- **Event boost (1.5x):** I recommend **not** applying it to Season XP, so the pace is the same all year (the December events would otherwise speed up Season 1's second month). It is easy to switch.
- No client reporting is needed, so nothing new can be faked from a phone.

### 3.2 Tier costs
50 tiers, 20,000 Season XP in total. Cheaper at the start (quick first rewards), dearer at the end.

| Tiers | XP per tier | Running total |
|---|---|---|
| 1 to 10 | 250 | 2,500 |
| 11 to 40 | 400 | 14,500 |
| 41 to 50 | 550 | 20,000 |

### 3.3 Expected pace (estimates, to be tuned after Season 1)
Using today's XP values: finish 25, first game of the day +50, win 75, daily challenge 50, weekly challenge 100.

| Player | Typical week | Season XP | Result |
|---|---|---|---|
| Light | 3 days, 2 games, 1 win, 1 daily, 2 weeklies | about 7,600 | around tier 22 |
| Regular | 5 days, 4 games, 2 wins, 2 dailies, 4 weeklies | about 21,000 | tier 50 in the last week |
| Daily | 7 days, same as regular | about 28,750 | tier 50 after about 6 weeks |

Extra XP from Ranked games and Gauntlet bots helps all of these. Target: **a regular player finishes with a few days spare**. The Health records the game already keeps (matches started and finished) give real data after the first season.

### 3.4 Optional levers (not in version 1 unless wanted)
- **Weekly bonus:** first win each UK week gives +150 Season XP (a catch-up for late joiners).
- **Overflow:** XP beyond tier 50 pays 25 Diamonds per extra 600 XP, up to 10 times.
- **Late-joiner discount:** none. Premium buyers get all earlier Premium rewards for tiers already reached (section 5).

## 4. Rewards

### 4.1 Rules
- Every tier gives the free track something. Premium adds a second reward on the same tier.
- Season items **cannot be bought in the Shop, gifted or traded**. Free-track items are "earn only" like the Gauntlet avatars; Premium items are "earn only with Premium".
- Every Burn, Joker and Victory effect gets its own synchronised sound in the same change (the owner's rule).
- Items follow `docs/MASTER-COSMETIC-ART-STYLE.md` and the quality bar for avatars.

### 4.2 Recommended "lean" reward set per season
Art is the real cost, so I recommend a lean set: **3 free items and 6 Premium items**, and Diamonds on the other tiers.

| Tier | Free track | Premium track |
|---|---|---|
| 1 | Diamonds 20 | **Season avatar** (instant reward when you buy) |
| 5 | Diamonds 40 | Diamonds 40 |
| 10 | **Season card back** | Diamonds 60 |
| 15 | Diamonds 60 | **Season burn effect** |
| 20 | Diamonds 80 | Diamonds 80 |
| 25 | Diamonds 80 | **Season Joker or victory effect** |
| 30 | **Season frame** | Diamonds 100 |
| 35 | Diamonds 100 | **Animated season avatar** |
| 40 | Diamonds 100 | Diamonds 100 |
| 45 | Diamonds 120 | **Season emote pack** |
| 50 | **Season table** | **Capstone: animated frame** (a matching set with the table) |
| Other tiers | Diamonds 20 to 40 | Diamonds 10 to 20 |

**Diamond budget** (tunable): free track about 1,000 Diamonds in total; Premium about 800 (roughly the value of a £4.99 pack at the planned pack rates, so it feels like it pays back), with the cosmetics as the real value.

### 4.3 "Full" set (only if art capacity allows)
Add: a free emote pack (tier 5), a free avatar (tier 25), a Premium card back (tier 40) and a Premium table (tier 45). That is about 17 items a season.

### 4.4 Item ids
Use one pattern so the database rules need changing **once**, not every season:

`<kind>-ss<YYMM>-<name>`, for example `avatar-ss2611-magician`, `back-ss2611-playing-cards`, `burn-ss2611-vanish`.

The rules get one extra regular expression per slot, such as `^avatar-ss[0-9]{4}-[a-z0-9-]{3,24}$`. Ownership is still checked against `ownedCosmetics`, so this is safe.

## 5. Premium

### 5.1 What it is
- A **one-off purchase for one season**. It does not renew.
- Unlocks the Premium reward on **every tier you reach in that season**, including tiers reached before you bought it (retroactive).
- Does **not** skip tiers. (I recommend not selling tier skips: they feel pushy and many players are young.)
- Can be bought until the end of the season. Not after it ends.

### 5.2 Price
Suggested **£4.99** per season (final choice is yours). Rough take-home on Google Play: price includes VAT, the store fee is about 15% on most small developers, so you keep roughly **£3.50 before income tax**. Treat that as an estimate only; check Google's current rules.

Honest expectations: a small free game might see 2% to 5% of active players buy. With 200 players active in a month that is 4 to 10 purchases, about £15 to £35. It grows with players, so the first seasons are mostly an investment.

### 5.3 What a purchase does (server side)
1. Phone starts a purchase (Google Play Billing, or a web checkout).
2. The store or payment provider confirms payment to **our server**, never to the browser.
3. The server verifies the receipt, matches it to one known product id (`season_pass_2611`), and sets `seasonPass.premium` for that season in a transaction.
4. The purchase ID is the idempotency key, so a repeated confirmation cannot grant it twice.
5. Premium rewards for already-reached tiers are claimable straight away.
6. Refunds: if the store reports a refund, Premium is revoked and unclaimed Premium rewards are lost; already-claimed items are removed (rule in the Refund Policy draft).

The dormant `functions/diamond-purchases.js` already follows this pattern (verify, fixed catalogue, idempotent fulfilment) and is the model to copy.

### 5.4 Open question: Diamonds-only Premium
If Diamonds can later be bought with real money (that code exists but is off), then pricing Premium in Diamonds means free players can also earn it by saving Diamonds. Options: real money only; Diamonds only; **both** (recommended once Diamond packs exist). See section 14.

## 6. Data model

### 6.1 Per player (server-only, no client write)
`users/{uid}/seasonPass/{seasonKey}`:
```
{
  xp:         number,   // Season XP so far
  tier:       number,   // derived, kept for the boards and mail (0 to 50)
  claimedFree: [tier numbers],      // or a compact bitmask
  claimedPremium: [tier numbers],
  premium:    { at, via: 'play'|'web', ref: purchaseId }   // absent until bought
}
```
- **A named field in `database.rules.json`, with no `.write`.** If it is not named, the `$field` catch-all makes it player-writable. This is the same trap that is already documented for other server-only fields.
- Keep one season node per season. Old seasons stay until account deletion.

### 6.2 Catalog (exported from the game, read by the server)
`functions/catalog.json` gains `seasonPass`:
```
{
  tierCosts: [ ...50 numbers ],
  claimDays: 7,
  premiumProduct: { id, price },
  seasons: {
    "2026-11": {
      name, theme,
      rewards: { free: { "10": {item:"back-ss2611-..."}, "5": {diamonds:40}, ... },
                 premium: { ... } }
    }
  }
}
```
Run `node tools/export-catalog.js` after any change, as the project already requires. A dev test fails if the game and server disagree.

### 6.3 Server code
- New module `functions/season-pass.js`: `seasonFor(date)`, `addSeasonXp(user, amount, now)`, `tierFor(xp)`, `claim(user, track, tier, now)`, `grantPremium(user, seasonKey, purchase)`.
- One hook: the same place `weekXp` is counted in `addXp`. Skipped for back-dated XP.
- New economy action `seasonPass` with ops `status`, `claim` `{track, tier}` and `claimAll`. Claims are in the `userTx` transaction with the null-first-pass rule from CLAUDE.md.
- Rewards: Diamonds with `addDiamonds` (cap 999,999 still applies); items into `ownedCosmetics` with an `unlock_<id>` mail, the way `grantLevelRewards` works.
- Premium grant: part of a verified payment webhook, never a client call.
- Season mail: `activityInbox/season-pass_<key>_<event>` for "Season starts", "7 days left", "claim window ends". Server-written, same as other mails.
- Optional push: extend the daily scheduled job that already announces events.

## 7. Client design (game)

### 7.1 Where it lives
**A second tab on the Level Ladder** (menu page), as you suggested: `Levels | Season Pass`. The Ladder's hero (avatar, name, XP bar) stays pinned.

### 7.2 Season Pass tab
- Header: season name and art, "Day 23 of 61", days left, Season XP bar to the next tier.
- The **track**: a horizontal rail of 50 tier tiles, two rows (Free above, Premium below). Reached tiers glow. Tiles use the shared cosmetic preview. Tap = big preview (existing); a claim button on claimable tiles.
- **Claim All** button, a claimed tick, a lock on Premium tiles when not bought.
- A clear **Get Premium** card at the top (price, what you unlock, "one-off, no subscription", links to the Terms of Sale and Refund Policy).
- Reduced-motion friendly; the same press-guard rules as the rest of the UI.

### 7.3 Everywhere else
- **Home chip** (like the event chip): "Midnight Magic: Tier 14 · 38 days left".
- **Match summary:** a Season XP line and "Tier 14 reached" with the existing animated bar.
- **Level Ladder entry points** (home level badge, header XP bar) are unchanged.
- **Inbox mail** for starts, tier milestones, last 7 days and the claim window.
- **Custom:** a new group, "Season Pass", with the season in the label; locked tiles say "Midnight Magic tier 25 (Premium)". Collection and filters work as for other earn-only items.
- **Helper tips:** first time a tier is claimable; first time Premium is offered.
- **What's New** KEY note, Guide section and Key Terms (Season Pass, Season XP, Tier, Premium).
- Not for guests (a sign-in prompt, like Ranked).

### 7.4 Important exclusions
Season items are not giftable (`giftableItem`), not sold in the Shop, not in bundles, and bots do not use them.

## 8. Technical risks and edge cases
| Case | Plan |
|---|---|
| XP at 23:59:59 UK on 31 Dec | The server uses the transaction time, so it belongs to the old season. |
| Daylight saving | The UK date key function already handles it. |
| Double claims / two phones | Claims are in a transaction, with the claimed list as the guard. |
| Premium bought on web and Android | One account flag; the second purchase should be refused or refunded (check at purchase time). |
| Refund / chargeback | Revoke Premium, remove claimed Premium items. |
| Account deletion | The pass data goes with the account. The sales record is kept separately (see the legal notes). |
| Player at Diamond cap | Claim is refused for Diamond rewards, with a message, rather than wasting them. |
| Back-dated XP / tutorial | Never counted. |
| Old clients | The new field is server-only, so older builds simply do not see the tab. |
| AmitK test account | Does **not** get Premium for free (the exception is Shop spending only). Use Play "licence testers" for test purchases. |

## 9. Testing
- **Unit:** `tools/season-pass-test.js` with an in-memory database: tier maths, season keys across year ends, XP at boundaries, backfill excluded, idempotent claims, retroactive Premium, refund revocation.
- **Emulator:** a new "Season pass" block in `tools/economy-emulator-test.js`.
- **Dev tests:** tab renders, claim flow, locks, groups in Custom, catalog matches server, every season item has an id matching the rule regex, every effect has a sound.
- **Browser:** phone widths (320 to 1440) for the tab and chip.
- **Purchase:** end-to-end with Google Play licence testers on a closed-test build, then a real small-value live test.

## 10. Season content pipeline (repeat every 2 months)
1. **8 weeks before:** pick the theme, write the brief (colours, mood, one-line story).
2. **6 weeks:** items designed (the owner's own art, as for the other premium items).
3. **4 weeks:** items built, sounds made, previews checked at 40px and 200px.
4. **2 weeks:** catalog entry, ids, test on the closed track, Play review for the Premium product.
5. **1 week:** What's New, Guide, mail text, push text.
6. **1st of the month:** season starts. **Last week:** reminder mail.

Per season checklist: theme brief, 3 free and 6 Premium items (lean), sounds for any effect items, `catalog.json` entry, export, tests, What's New KEY note, store listing screenshot update.

## 11. Roadmap

### Phase A: foundations (can start now, invisible to players)
1. Server module, hook in `addXp`, claim action, catalog block, tests.
2. Rules: the `seasonPass` field and the item-id patterns. **This needs a rules paste and a Functions deploy (in that order: deploy Functions first).**

### Phase B: free track in the game
3. Level Ladder tab, claims, home chip, mail, Custom group, Guide and Key Terms, What's New.
4. Season 1 reward art and sounds for the free items.

### Phase C: Premium
5. Legal pack published and linked from the app (see `docs/legal-drafts/`), including terms acceptance and age confirmation.
6. Business bank account, tax and ICO set up.
7. Google Play developer account, closed test, Play Billing and server receipt checking. Optional web payments.
8. Switch Premium on.

### Dates
| When | What |
|---|---|
| 20 to 30 Oct | Phase A, and Phase B if art is ready |
| **1 Nov 2026** | **Season 1 starts. Free track only ("Founders Season"), with a locked Premium preview** |
| Nov to mid Dec | Phase C (legal, bank, Play Console, closed test) |
| **1 Jan 2027** | **Season 2 starts with real Premium**, if Phase C is done; otherwise the free track continues and Premium opens mid-season (retroactive, so nothing is lost) |

**Honest risk:** the 1 November date is under two weeks away and the free track needs art for its three items. If the art is not ready, the free track can launch with Diamonds-only tiers and the three items arrive mid-season (the claim UI supports a "coming soon" tile).

## 12. Ongoing costs and work
- Art and sound for roughly 9 items every 2 months (the biggest cost).
- Rules need one paste for the new id patterns, then nothing per season.
- A catalog export and a Functions deploy per season (to add the new season block); this can be done days before the start.
- Customer support: refund requests, missing purchases.
- Accounts, tax records and a yearly Play fee/review.

## 13. What I recommend
1. Build Phase A and B for Season 1 with the lean reward set.
2. Keep the pass free-only for Season 1 and market it as the "Founders Season".
3. Launch Premium for Season 2 on 1 January if the legal and payment steps are done in time.
4. Do not apply the event XP boost to Season XP.
5. Do not sell tier skips.
6. Price Premium at £4.99, one-off.

## 14. Open decisions (need the owner)
1. **Season 1 start:** free-only on 1 Nov, or wait and launch everything on 1 Jan?
2. **Premium price:** £4.99? Higher or lower?
3. **Premium payment route:** real money only, or also Diamonds (once Diamond packs are on sale)?
4. **Reward set:** lean (3 free + 6 Premium) or full (about 17)?
5. **Season 1 theme:** Midnight Magic, or another from the list?
6. **Claim window:** 7 days after the season ends, or longer?
7. **Event boost:** counted in Season XP or not? (I recommend not.)
8. **Weekly bonus and overflow Diamonds:** include in version 1?
9. **Who makes the art:** the owner's own art for each season, or should I propose looks?
10. **Web payments:** only Google Play at first, or also a web checkout (more work and VAT questions)?

## 15. Where this connects to other documents
- `docs/legal-drafts/` (kept locally, not in the repo): Terms of Sale, Refund Policy, Privacy Policy and Play Console answers, with the list of fixes the game needs before taking money.
- `docs/REAL-MONEY-DIAMONDS.md`: the dormant Diamond purchase design; the Premium purchase should use the same verified-purchase pattern.
- `docs/MASTER-COSMETIC-ART-STYLE.md`: required reading for every season item.
