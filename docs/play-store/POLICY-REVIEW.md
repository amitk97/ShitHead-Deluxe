# Play Store policy review (25 Nov 2026, v556)

Checked in the repo and by running the game; nothing here has been run against the real Play Console.

## 4. User-generated content (reporting and blocking)
- **What players can write:** usernames, guest nicknames (12 characters), preset emotes only. There is no free-text chat.
- **Reporting:** the player card (tap a name or avatar in a match, leaderboard or Friends) has a Report button with reason chips (cheating, name, abuse, quitting, other) and an optional 200-character note. Reports go to the developer only. Signed-in players can report other signed-in humans.
- **Blocking:** Ignore on the same card, and Friends → Ignored lists and undoes it. Ignoring ends any friendship and removes pending requests, so the person can no longer contact the player.
- **Gap found and fixed (v556):** usernames were checked against a short English profanity and impersonation list, but guest nicknames only had to be non-empty. Online play now refuses a blocked nickname with the same list.
- **Still true:** the list is short and client-side only. A guest cannot be reported (no account to attach a report to). If a reviewer asks, the answer is: no free text, preset emotes, ignore and report exist, the developer reviews reports.

## 5. Account deletion
- In the game: Profile → Danger Zone → Delete account. On the web: `delete-account.html` (public, no sign-in needed, linked from the privacy policy and terms) with steps, the 7-day grace period, what is erased, and an email route for people who cannot get in. All three say the same thing (7 days, then everything erased).
- Matches the Data Safety answer "users can request deletion" in `CONSOLE-PAPERWORK.md`. Finished Ranked/online room records are not erased and the privacy policy says so.
- Paste the `delete-account.html` URL into the Console's data-deletion field.

## 6. Gambling and virtual currency
- Nothing is bought with real money: no purchases, ads or Diamond packs. Diamonds cannot be cashed out, sold or traded (the terms say so).
- Lucky Games (Daily Spin, Scratch Card, Drop Zone) show every prize's percentage chance in the game. Three Cards is a once-a-week shuffle game with fixed prizes.
- Prizes are free Diamonds, XP and cosmetics. The paperwork already answers "simulated gambling: Yes, no real money". Keep that answer; it is the safe one and gives about a 12+/Teen rating.
- If real-money items are ever added, Play Billing becomes mandatory and the odds rules for paid random items apply; the privacy policy and terms both say they would be updated first.

## 7. Legal pages
- Privacy policy and terms match the game: Google sign-in, XP, friends, reports, push tokens, health records, Google Fonts and jsDelivr, 13+, deletion, EU data location. No stale claims found.
- Still open for you: a solicitor has not reviewed either page (`docs/legal/SOLICITOR-BRIEF.md` is the brief), and the England and Wales governing-law line needs your confirmation.
- Keep the Data Safety form identical to the privacy policy whenever either changes.

## 8. Performance and size
Headless Chromium, 390x844 at 2x, CPU throttled 4x, local server with no compression:
- First contentful paint 0.5s, load event 2.6s, 75 requests, 7.6 MB transferred uncompressed (Firebase Hosting compresses text), JS heap 10 MB after settling.
- The Angry Twister burn atlas (about 49 MB decoded) is only fetched when a player equips that burn. Performance Mode already halves its debris. If a low-end phone crashes on it, repack the atlas at 512px (notes in v530).
- Not measured: a real low-end Android phone. Check Android vitals after the closed test.

## 9. Offline, install and wrapper behaviour
- Manifest has name, short name, id, standalone, portrait, 192/512 and maskable icons. The service worker is cache-first for the page and precaches Play Computer, so it opens with no signal.
- The Android hand-off splash (v309) keys on `display-mode: standalone`, which a Trusted Web Activity reports, so it applies.
- **Exit on the home screen cannot close a TWA.** It shows the "Leave Shed Head Deluxe" confirmation and then a closing screen with a Return button; Android Back or Home leaves the app. That is acceptable, but a reviewer may notice.
- `.well-known/assetlinks.json` is still an empty list until the Play signing fingerprint is known. Without it the app shows a browser address bar.
- Must be tested on a real phone before submission: Google sign-in inside the TWA, notification prompt, Back button, keyboard over the nickname box.
