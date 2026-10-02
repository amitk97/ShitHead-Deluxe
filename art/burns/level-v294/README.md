# Level-reward Burns — v294

Owner-requested implementation of the six level-reward concepts from 2 October 2026.

- `concepts.webp`: presentation artwork, cropped only in thumbnail SVG viewports.
- `layers.webp`: transparent 1536×1024 component atlas; six 512×512 cells, left to right, top to bottom: spark, smoke, fire crescent, tornado, ruby crown, ShitStorm mascot.
- `effects.js`: shared thumbnail renderer, independent animated cards/components/fragments, cleanup, reduced motion and six sound recipes.

The two images were created with the built-in image generator and encoded as WebP. Keep their dimensions and alpha; the renderer owns their crop coordinates. Do not use the opaque concept image as a gameplay layer. No ownership, level, ID, catalog or database changes are needed.

Atlas art direction: premium stylised dimensional mobile-game illustration matching the level-reward concept sheet; isolated warm starburst, internally lit smoke, orange-red flame crescent, tiered fire tornado, polished ruby-and-gold crown and mischievous sculpted brown mascot. Equal 3×2 cells, transparent padding, no labels, frames, floor or baked-in cards. Cards and particles are independently animated in code.

## Checks

Install Playwright separately, then run `SH_CHROMIUM=/path/to/chromium node tools/level-burns-browser-test.js` (or omit `SH_CHROMIUM` for Playwright's installed browser). `CODEX_PRIMARY_RUNTIME_NODE_MODULES` can select the Work runtime's Playwright. `SH_BURN_OUT` selects the temporary screenshot/report directory.

The check runs the existing level-burn suite, renders 40px thumbnails and desktop/mobile previews, tests repeated playback and both reduced-motion settings, measures the real Web Audio recipes with OfflineAudioContext, checks background cleanup and captures all six effects on actual mobile and desktop bot-game tables.

Also run `node tools/v264-client-test.js`, `node tools/v265-art-test.js` and `node tools/v268-client-test.js` for adjacent regression coverage.
