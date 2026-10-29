# No Mercy demo video: script v1 (15 seconds, NOT built yet)

Working title: **"No Mercy. Nobody is safe."**
Length: 15 seconds. Format: 9:16 vertical (1080x1920), game audio on, voiceover in the how-to-play voice, every caption = the line spoken.
Status: script only. Claude builds it later, when the owner says so (headless `tools/video/director.js`, scripted game state, no live recording). Paused frames go to the owner for a "go" before it is published.

Facts used (check against the game when building): Queen = X-ray, you see a random card in the next player's hand. King = the next player takes a card from the bottom of the Pile (a King at the bottom cannot be taken). A Joker cannot be played on a 4. Unlocks at Lvl 25. Look: red No Mercy card, Crimson Verdict deck/back if equipped.

## 1. Hook (0:00 to 0:02)

**Action:** Home carousel snaps to the red No Mercy card, quick open. Cut to a table, three players.
**Voiceover:** "Normal rules? Not here."
**Caption:** No Mercy

## 2. Queen X-ray (0:02 to 0:06)

**Action:** Play a Queen. The scan sweeps the next player's hand (`noMercyPeekFx`); one card turns face up with a cyan ring, a `.nm-known` tag stays under their seat.
**Voiceover:** "Play a Queen, and see their card."
**Caption:** Queen: X-ray

## 3. King (0:06 to 0:10)

**Action:** Play a King. A card is pulled from the very bottom of the Pile and flies into the next player's hand (banner shows it).
**Voiceover:** "Play a King, and they take from the bottom."
**Caption:** King: take from the bottom

## 4. Joker blocked (0:10 to 0:13)

**Action:** A 4 is on top. Try the Joker: it is refused with the banner.
**Voiceover:** "And no Joker on a four."
**Caption:** No Joker on a 4

## 5. Close (0:13 to 0:15)

**Action:** End card: red No Mercy badge, "Unlocks at Level 25", shithead-deluxe.web.app.
**Voiceover:** "No Mercy. Reach level twenty-five."
**Caption:** No Mercy, Lvl 25

---

Same treatment as the Lucky Games video: voiceover yes, end-card link shithead-deluxe.web.app. Not built; wait for the owner.
