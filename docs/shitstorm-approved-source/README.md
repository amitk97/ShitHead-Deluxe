# Approved Shitstorm mascot source handoff

This is the exact approved production mascot used for v526. Do not recreate its design or textures.

source/mascot.glb contains the embedded textures, geometry, skeleton and morphs.
source/ contains the matching viewer, facial controller, timing and bundled Three.js modules.
tools/shitstorm-mascot-source/capture.cjs is the capture recipe committed with the burn integration.

Install Playwright, then run from this extracted folder:

SH_MASCOT_SOURCE="$PWD/source" SH_MASCOT_OUT="$PWD/capture" node tools/shitstorm-mascot-source/capture.cjs

Set SH_CHROMIUM to your Chromium executable if it is not /usr/bin/chromium.
The recipe captures 60 native 512x512 transparent PNGs, 30fps, two seconds, source time scaled by 1.06.
The existing pack.py intentionally downsamples to 256px cells; do NOT run it unchanged for a 512px atlas.
Keep framing and tip coordinates consistent when repacking. Use multiple sheets to bound decoded memory.

The separate Native-512-Frames.zip already contains all 60 original captures, so recapture is optional.
These are real WebGL alpha renders, not enlarged 256px exports. Index 000..059 corresponds to game time index/30 seconds.
No assets have been changed in the live game by this handoff.
