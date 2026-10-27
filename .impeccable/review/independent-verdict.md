## Disposition

**ship — F1 verdict pass only.** The single requested recovery-state fix is resolved for the local wishlist draft. This scores the original finding; it does not reopen the full review or grant main merge, production deployment, live Firebase or game-wide release approval.

## Evidence checked

Inspected js/wishlist-store.js:103, the revised failed-initial-read controller regression, and tools/wishlist-browser-test.js:69–79. Independently ran the controller suite: all 12 tests pass. The browser regression explicitly checks failed read → heart edit → retained error → visible Retry and failure copy → button click → synced state and backend item persisted. Its successful run is reported by the build thread; I inspected its source rather than rerunning the browser capture script.

Opened all six recaptured original files with view_image: mobile.png, phone-320.png, tablet.png, desktop.png, mobile-sync-error.png and mobile-empty.png. Also opened mobile-read-error.png, which visibly demonstrates the exact edited-after-read-failure state with the saved item, truthful “Account sync failed” message and Retry sync button. Captures remain valid evidence at their stated viewports.

## Material finding score

| Finding | Score | Evidence |
| --- | --- | --- |
| F1: initial read failure loses Retry and falsely claims saving after a heart edit | **resolved** | toggle retains error while journaling the edit. With ready=false, flush leaves that error intact. Existing status rendering therefore preserves actionable failure feedback. Retry reconnects; unit regression verifies successful persistence. Browser regression covers the actual visible control and click path, corroborated by mobile-read-error.png. |

No original material finding remains open in this verdict pass.

## Quality-bar assessment

The fix supplies the operational error/recovery behavior required by the original narrow extension. Its presentation continues the incumbent Shop's compact navy/rose styling; the error copy and Retry control remain legible, grouped and visibly actionable after editing. The recaptured normal, empty and write-error states retain their previous composition. This is a finding-specific quality assessment, not a new whole-surface approval.

## Limitations

Synthetic local backend and Chromium capture evidence only; no live Firebase, physical-device or real-account verification. Full-suite 671/671 completion before this final recovery-state change was reported by the build thread; final committed-source regression/CI is outside this verdict's evidence. Only independent-verdict.md was written; implementation and assets were untouched.

## Supplemental scoped verdict: F2 cap-edge data preservation

**ship — F1 and F2 finding scores only.** F1 remains resolved. F2 is **resolved** for preserving valid existing choices when concurrent device additions exceed the client addition limit.

Inspected the two affected ingestion paths in js/wishlist-store.js: cached IDs and authoritative snapshot IDs now retain all valid existing entries rather than truncating to max. New additions remain blocked by toggle when ids.size >= max; removals remain available. Inspected the new concurrent-addition regression in tools/wishlist-store-test.js and independently reran the complete controller suite: **13/13 pass**. The new case starts two clients at max−1, adds different items before the write microtasks run, checks both clients show all three choices with max=2, checks a further addition is blocked, and reloads the persisted account cache to confirm the third choice survives offline. This directly addresses the reported hiding mechanism and checks its preservation across both ingestion paths.

This implements a client addition limit, not a distributed strict maximum: simultaneous devices may legitimately leave the account above 30. The change preserves that existing cloud truth instead of hiding a valid saved item. It introduces no UI or style change; the seven previously inspected captures remain visual evidence, not evidence of the concurrency scenario itself. The quality requirement here is truthful complete saved-item visibility, which the revised ingestion and regression establish at the synthetic controller level.

No new visual hunt was performed. No live backend, deployed rules, physical device or adversarial client behavior was verified. Final full regression/CI completion remains outside this supplemental evidence; the last reported full 671/671 run preceded the final F1/F2 fixes. This supplement scores only these two concrete findings and authorizes no main merge or deployment. Only this review document was updated.
