# Wishlist extension review

Original request: add Shop wishlist hearts, a Wishlist filter, and account sync. Existing v374 already had these; the user was told the earlier backlog recommendation was stale. This draft preserves that feature and fixes confirmed gaps: shared account cache, whole-list overwrites and stale entry resurrection, silent failed writes, and closed-season wishes missing from the filtered Shop.

Baseline: main commit 9757ccc9e002eb32c7e07506ad5dbc35dca374aa. Root /workspace/shop-wishlist. No main push, deployment or Firebase changes are authorized for this draft. Inspect only; no external writes or messages. Keep other contributors' work intact.

Direction contract: extend the established mobile Shop; retain navy/amber/emerald/rose palette, compact existing catalogue rows and current item artwork. No new visual world, comp or generated imagery. Heart targets are 32px, have named pressed-state labels and focus rings. Wishlist is next to All with a count. Filter results include wished seasonal items even when closed, without changing purchase eligibility. Sync status gives device/account/error feedback and retry. Public profile visibility follows the existing feature and is stated in its UI.

Actual local browser captures (synthetic in-memory accounts; not live Firebase/user data):
- .impeccable/review/mobile.png — 390x844
- .impeccable/review/phone-320.png — 320x568
- .impeccable/review/tablet.png — 768x1024
- .impeccable/review/desktop.png — 1440x900
- .impeccable/review/mobile-sync-error.png — retry/error state
- .impeccable/review/mobile-empty.png — guest/empty state
All six are required evidence. The screenshots show the actual Shop runtime. Screenshot settling was corrected after viewport changes to avoid capturing the incumbent drawer's responsive transition; no global drawer redesign was made.

Implementation: js/wishlist-store.js is the pure controller: account-scoped cache, legacy guest preservation, explicit guest additions transferred once, cloud-authoritative live snapshots, per-item pending journals, generation guards, retry, and per-key Firebase update. app.js wires existing wishlist globals/renderers and the auth boundary. shop.js adjusts saved results/counts/status; game.css increases targets and adds status styles. index.html/sw.js load/cache the module. dev-tests.js isolates its existing wishlist fixture. CI adds unit and browser checks.

Confirmed checks: 12 controller tests pass; tools/wishlist-browser-test.js passes real Chromium interactions (guest keyboard/reload, account A/B separation, pending removal/reload/retry, seasonal visibility with purchase lock, live changes, sign-out, focus, responsive overflow and no page exceptions). JS syntax and modular asset/cache checks pass. Existing full regression suite is running, see /tmp/wishlist-regressions.log. All test backends are synthetic. No live Firebase connectivity/rule deployment or physical phone test is claimed. Database path/schema/ownership rules are unchanged.

Detector: repository Impeccable launcher context failed while checkout was still starting, fallback context read directly; PRODUCT.md/DESIGN.md are absent. One completed detect --json pass returned [] (no findings). No context rerun or global design drift repair. Craft floor: .claude/skills/impeccable/reference/craft-floor.md.

Please independently inspect the six captures and affected code, including account and pending-write races. Do not edit implementation/assets. Return the required finish-review contract: disposition (ship/fix/rebuild/recapture) with actual scope; checked evidence; material findings with paths; quality-bar assessment against this extension; limitations. Write only .impeccable/review/independent-review.md. A source/runtime-local ship is not approval for a live release.
