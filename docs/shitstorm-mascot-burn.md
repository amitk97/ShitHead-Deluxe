# Approved mascot → Shitstorm burn draft

Prepared on isolated branch `draft/shitstorm-approved-burn`, based on main
`4f361b77dac296218ba4a882ed192a25f436f914` (v510). Claude's newer Lucky Games,
Drop Zone and match-summary updates are included in that baseline. The original
working checkout was not edited. No push, merge into main, hosting deployment or
Firebase write is part of this draft.

## Appearance and runtime

The approved `shitstorm-mascot-production-draft/mascot.glb` and its facial/bone
controller supply the character. Chromium renders its actual rounded geometry,
reference textures, mouth movement and full rotation to transparent frames.
No face redraw, replacement material or new character design is introduced.

Gameplay uses those genuine 3D renders as a 60-frame RGBA WebP atlas, with live
Canvas2D fragments. This is a pre-rendered 3D effect, not a live GLB renderer.
The editable Blender/GLB mascot remains separate for close-up mascot uses.
The atlas is 380,410 bytes, 2048×2048, approximately 16 MiB decoded. The character
needs one atlas draw per animation frame. Canvas DPR respects the game's Lite
mode. Physical-phone frame rate has not been measured.

The source 2.12-second rig action is sampled into the game's existing two-second
burn. The reference-painted scraps on its body remain part of the approved
texture; newly emitted fragments are separate live objects.

| Time | Action |
| --- | --- |
| 0–0.28 s | Actual pile card remains readable; restrained suction/glow |
| 0.28–0.60 s | Card pulls into the rising funnel |
| 0.53–0.83 s | Mean grin is held for readability |
| 0.83–1.40 s | Whole character spins; paper and wet fragments eject |
| 1.40–1.83 s | Rig contracts into the pile |
| 1.83–2.00 s | Short debris and ember tail |

Fragment paths follow the source rotation, then leave on tangents with updraft.
Their attachment positions approximate the lower/middle folds using the
rendered silhouette; gameplay does not run a 3D collision simulation.
Paper samples the affected card face and the burning player's equipped back.
The initial visible card is a DOM clone so its exact deck styling survives the
normal pile removal. Card copies hide only the captured card IDs, never a new
card played into the next pile. Amber lighting and dark torn edges are applied
to fragments. The goo has restrained wet highlights.

## Integration and preferences

`ShLevel3D.play/clear/still` delegate this ID to `ShitstormBurn`; other effects
keep their current renderer. Gameplay, Test Lab and Shop share the delegate.
The game resolves the burn at its existing 600ms; rendering has no game lock.
The game/OS reduced-motion setting and Effects off suppress this spatial burn.
Direct render clients requesting calm mode receive an opacity-only poster.

Sound remains in `sound.js` through `BURN_SOUNDS` and `_burnKit`. It follows the
same pull, grin, acceleration and collapse beats, with existing sound enable and
volume controls. The visual module does not start audio, avoiding double sound.

Replay, completion, hidden tab, detached host/canvas, home navigation, resize
and page exit clean up canvases, copies and hide styles. A watchdog covers
stopped animation frames. Atlas loading happens once while idle on the home
screen. Missing assets produce a brief quiet visual glow without hiding cards,
blocking game resolution or substituting the rejected character.

## Source and rebuilding

The separately delivered editable source is
`/workspace/shitstorm-mascot-production-draft/mascot.blend`, with GLB, controller,
reference maps and rig exports beside it. Capture/packing recipes are under
`tools/shitstorm-mascot-source/` and require Playwright, Chromium, Pillow and NumPy:

```sh
SH_MASCOT_SOURCE=/path/to/approved-mascot SH_MASCOT_OUT=/tmp/shitstorm-bake node tools/shitstorm-mascot-source/capture.cjs
SH_MASCOT_OUT=/tmp/shitstorm-bake python tools/shitstorm-mascot-source/pack.py
```

Copy the resulting `mascot-atlas-v3.webp` (build it from the native 512 frames with `tools/shitstorm-mascot-source/pack512.py`, not pack.py), `mascot-poster.webp` and
`mascot-atlas-v3.json` into `art/burns/shitstorm/`. Source images are truly
transparent WebGL captures; no backdrop color key or generated repaint is used.

## Review and limits

`tools/shitstorm-mascot-browser-test.js` runs the local actual game with all
external services blocked. It covers portrait/landscape/desktop captures,
10/four-of-rank card inputs, different burner backs, actual 600ms resolution,
new-pile visibility, settings, replay and cleanup, plus offline audio rendering.
`tools/shitstorm-browser-test.js` retains the smaller component harness.
`node tools/modular-assets-test.js` checks offline assets and content hashes.

Review media is in `/workspace/shitstorm-burn-review`. Game screenshots/video
are actual Chromium game-runtime captures; the atlas contact sheet is labelled
source frames. A 30fps recording is an output format, not proof of device FPS.
Networked multiplayer, physical Android/iOS and installed-PWA update delivery
have not been exercised. No account or live Firebase was touched.

Release remains separate from this draft. Follow the normal version/release
process only after the user explicitly approves publishing.
