# Tutorial and settings fixes — review draft

Baseline: `49ffa01f564486191e8d94f5ee4c5a520e0ddd22` (Claude's v488). Branch: `codex/tutorial-settings-fixes`.

The seven requested fixes were implemented in order:

1. **Hidden helpers:** lessons temporarily show Card Powers and Play Matrix. The saved Helper Icons preference is unchanged and restored on exit.
2. **Compact phone layouts:** screens up to 720px tall reserve space for the caption and allow the lesson table to scroll. Required actions are brought into view on entering a step; the hold lesson supports scrolling between Pile and Hand. Real spacing below the history keeps the helper button out of the Play controls' hit area. Larger layouts retain the existing floating caption.
3. **Caption collisions:** module names occupy their own row above Step and Skip. Long names wrap.
4. **Keyboard focus:** closed drawer is inert and aria-hidden, hidden header shortcuts leave focus navigation, and Settings tabs implement roving focus with Left/Right/Home/End and tab/panel relationships.
5. **Readability and targets:** Settings descriptions and labels are 12px, Search is 16px, close controls and tutorial actions have 44px targets. Header hit areas grow vertically without overlapping adjacent icons. Compact Settings puts Game Speed controls on their own row. Existing compact ON/OFF switch labels are preserved.
6. **Settings within lessons:** sound and accessibility controls remain usable. Gameplay and lesson helper controls are disabled with an explanation. Pending tutorial timers retain their remaining delay while Settings is open and resume on closing, including Escape. Locks are restored on exit.
7. **Rules copy:** modules identify Standard Rules, the reference instruction no longer claims every card has a power, and the core zone-order explanation acknowledges Cross-Phase Combo. Queen/King descriptions distinguish No Mercy.

No release number was allocated. No push, merge, Firebase change or deployment was performed. This draft preserves v488's unrelated avatar and Multiple Decks changes.

## Validation

`node tools/tutorial-settings-browser-test.js` passes:

- Complete Quick Start at 320×568 and 360×640 with Helper Icons saved OFF; the saved preference is restored afterwards.
- Long caption header separation, closed-menu focus, Settings tab keyboard navigation.
- All four Settings tabs, cross-tab search and close target/layout bounds at 320×568, 360×640, 390×844 and 1366×768.
- Settings opened during a pending Coach reply: the reply waits; mute, contrast and Reduce Motion remain usable; gameplay controls stay disabled; the Coach resumes after closing.
- All 25 tutorial modules complete through their real card/button actions at 390×844. Module entry uses the game's existing launcher; no forced advancement of steps or fake game outcomes.
- Back/replay restores the lesson board; Skip clears pending timers and prompt overlays.
- Mute, contrast and Reduce Motion persist after reload; no page exceptions.

The regression is added to `.github/workflows/ci.yml`. Syntax and modular asset/cache-hash checks pass; script/style URLs and service-worker precache entries have been regenerated.

The existing broad gameplay suite reports **671/676** on both the draft and a clean v488 checkout. The same five failures predate this patch:

- Smoke Show / earned-avatar ordering expectation.
- README refresh due since v480.
- What's New key-note expectation.
- Profile showcase item scrolling.
- Hamburger item-order expectation omits Daily Spin.

The existing native carousel/home-navigation test also fails on the clean baseline (first swipe) and the draft (held swipe), so it is not a passing gate. That existing gesture test has not been changed here.

The mechanical UI detector reported no findings on changed lines. Existing warnings elsewhere were not rewritten.

Tests use Chromium, local assets, mobile viewport/touch emulation and guest/offline service fallbacks. They do not verify physical phones, Safari, real signed-in cloud sync, audible output or hardware haptics. Small-screen scrolling is an intentional recovery path, not a claim that every table zone is simultaneously visible.
