# Wishlist review evidence

This is a local draft of an ordinary extension to the existing v374 wishlist, prepared as v466 from main `9757ccc9e002eb32c7e07506ad5dbc35dca374aa`. The original recommendation was stale: hearts, Wishlist filtering, profiles and account sync already existed. The draft retains them and fixes account cache isolation, per-item sync/retry and saved closed-season visibility. See [feature and reproduction notes](../../docs/shop-wishlist.md).

Read [REVIEW-PACKET.md](REVIEW-PACKET.md) for the initial evidence handoff, [independent-review.md](independent-review.md) for the initial **fix** disposition and F1, and [independent-verdict.md](independent-verdict.md) for the final **ship at F1/F2-only scope**. F1 concerned lost Retry feedback after editing following a failed initial read; it is resolved. F2, preservation of valid entries during concurrent additions at the cap, is also resolved. The client cap blocks new additions at 30 without truncating existing cloud/cache entries; simultaneous devices may temporarily exceed 30. No server-enforced count limit is claimed. The final verdict scores F1/F2 only and grants no main merge, deployment, Firebase or game-wide release approval.

All captures show the actual local Shop runtime with synthetic in-memory accounts, not live Firebase or user data:

| Capture | Evidence |
| --- | --- |
| [mobile.png](mobile.png) | 390×844 Shop |
| [phone-320.png](phone-320.png) | 320×568 constrained catalogue |
| [tablet.png](tablet.png) | 768×1024 Shop |
| [desktop.png](desktop.png) | 1440×900 Shop |
| [mobile-sync-error.png](mobile-sync-error.png) | Write failure and retry |
| [mobile-empty.png](mobile-empty.png) | Guest empty state |
| [mobile-read-error.png](mobile-read-error.png) | Initial read failure followed by an edit; truthful error and visible Retry |

The six original captures were recaptured for the verdict; the seventh demonstrates F1 recovery feedback. Viewport settling avoids the existing drawer's responsive transition. No global drawer redesign was made.

All 13 controller tests pass. The focused Chromium browser suite passed after F1 and is being rerun after the cap-only fix. The browser suite includes the visible Retry click and successful backend persistence. The independent reviewer reran the controller tests and inspected browser regression source/captures, without rerunning that browser script. The final full run (`/tmp/wishlist-final-regressions.log`) finished 670/671, with only the Profile showcase scroll check failing (971–1075 of 844). This identical intermittent failure predates wishlist changes: `/tmp/sh-fixed-tests.log` recorded it during the previous regression task, after which serial/GitHub CI passed 671/671. The separate 671/671 run before F1 is historical evidence. The final suite is not fully green; CI on the final branch remains pending. Reproduction commands and npm/browser dependency details are in the feature notes.

Evidence is limited to synthetic local tests and Chromium captures. No physical device, live Firebase, deployed rules or real account was tested. There are no server rules/schema/ownership/pricing changes. Nothing is deployed or merged to main. User approval is required after review. Global files remain intact, including stale TODO/CLAUDE reminders; absent PRODUCT.md/DESIGN.md were not invented.
