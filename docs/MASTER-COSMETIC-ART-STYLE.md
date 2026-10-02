# ShitHead Deluxe – Master Effect Art Style for Custom Items

**Mandatory reference:** Read and follow this file whenever generating, redrawing, replacing, or changing artwork or visual effects for Custom/Shop cosmetics. This applies to avatars, animated avatars, card backs, frames, table themes, decks, burn effects, Joker effects, victory effects, seasonal cosmetics, earn-only rewards, premium cosmetics, and any future cosmetic category.

The goal is strong visual consistency: every cosmetic may have its own theme, subject, and palette, but it must look as though it belongs to the same **ShitHead Deluxe** collection.

## Core art style

Create the avatar, custom item, or effect in a **premium stylised mobile-game aesthetic** with strong visual consistency across the entire game.

The style should be:

- Bold, polished and high-contrast.
- Semi-realistic but still clearly game-stylised; never photorealistic.
- Clean enough to remain readable at small mobile-game sizes.
- Rich in depth, glow and lighting, but not excessively detailed or cluttered.
- Designed to feel like a premium collectible cosmetic rather than a flat emoji or basic vector icon.

The effect or item itself should stand out clearly.

## Lighting

Use, where appropriate:

- Bright central highlights.
- Soft bloom.
- Subtle rim lighting.
- Glowing particles.
- Controlled sparks, embers, or energy trails.
- Cinematic radial light or circular energy rings.

## Shape and rendering

Objects should have:

- Smooth, rounded, polished shapes.
- Subtle 3D depth.
- Clean, readable silhouettes.
- Strong readable facial expressions where characters or animals are involved.
- Simplified textures rather than tiny realistic surface detail.

For animals, creatures, and mascots, use recognisable real-world anatomy and proportions, but simplify them into a polished game-art style. Avoid childish emoji-style faces, flat clip-art shapes, or excessively exaggerated cartoon proportions.

## Magical, Joker, burn, and victory effects

Use as appropriate:

- Glowing energy rings.
- Particles.
- Sparks.
- Smoke.
- Light rays.
- Confetti or fragments.
- Subtle shockwaves.

Effects should feel energetic without covering the entire screen or hiding important gameplay information.

## Colour treatment

Use a strong primary colour for the cosmetic, supported by gold, warm highlights, or complementary accent colours.

- Avoid muddy colours.
- Keep highlights bright and saturated.
- Keep shadows deep enough to preserve contrast.
- Seasonal items may use their event palette while still following this rendering style.

## Composition and mobile readability

Centre the main subject clearly, with the strongest visual detail concentrated around the centre.

The outer edges should become cleaner and darker so the image still works when displayed inside a small circular, square, or rectangular game UI element.

Before shipping artwork, check that the main subject and defining details remain recognisable at both large preview size and the smallest in-game size.

## Consistency rule

**Do not change the overall rendering style between cosmetics.**

New cosmetics may have different themes, colours, and subjects, but they must always look as though they belong to the same ShitHead Deluxe cosmetic collection.

Avoid:

- Flat emoji art.
- Basic SVG-looking icons.
- Childish clip art.
- Overly realistic photography.
- Excessive micro-detail.
- Cluttered backgrounds.
- Thin details that disappear on mobile.
- Washed-out colours.
- Completely different art styles between effects.

The target visual quality should feel similar to a **high-quality modern mobile card-game cosmetic**, with polished 3D illustration, cinematic lighting, and clear arcade-game readability.

## Animation construction

For animated effects and avatars, design the visual with animation-friendly layers. Where practical, keep these visually separable so they can be animated independently:

- Central subject.
- Glow.
- Particles.
- Rings.
- Smoke.
- Sparks.
- Foreground fragments.
- Character features that move independently, such as eyes, mouth, mane, flame, cloth, or accessories.

Animations should be short, punchy, and readable, generally around **1–2.5 seconds** for gameplay effects.

- Start with anticipation.
- Build quickly to one clear visual payoff.
- Fade or resolve cleanly.
- Use easing rather than abrupt movement.
- Keep particle counts moderate for mobile performance.
- Effects must enhance gameplay without obscuring cards, controls, player names, or other important information.
- Looped avatar animations should be subtle enough to remain pleasant when seen continuously.

## Mandatory sound design for gameplay effects

**Every Joker effect, Victory effect, and Burn effect must have its own matching sound effect. Do not add or change one of these visual effects without also creating or updating its sound design.**

Sound must follow the visual animation beat-for-beat:

- Give the opening/anticipation an appropriate cue.
- Synchronise the main impact with the visual payoff.
- Match secondary waves, bursts, movement, or character actions with corresponding audio details.
- Give particles, debris, magic, smoke, fire, confetti, or other finishing elements a short suitable tail where useful.
- For character or animal effects, use a fitting stylised vocalisation or action sound where appropriate.
- Do not simply reuse another cosmetic's complete sound recipe; each effect should have an identifiable audio character.
- Keep sounds short, responsive, and suitable for repeated play.
- Avoid harsh clipping, excessive bass, or volume spikes.
- Keep perceived loudness consistent with the game's existing effects.
- Sounds must respect the game's sound/effect settings and should not introduce noticeable playback latency on mobile.

Examples:

- **Burn effect:** ignition, impact, crackle/whoosh, then a short ember/debris tail.
- **Joker effect:** anticipation or magical cue, character/object action, impact/sting, then a brief finish.
- **Victory effect:** celebratory rise or reveal, a strong success hit, themed signature sound, then a short celebratory tail.

Where an effect has multiple timed visual beats, the sound should use the same timing rather than playing one unrelated sound over the whole animation.

## Implementation rule

When creating or changing a cosmetic:

1. Read this file first.
2. Match the established ShitHead Deluxe art style.
3. Check mobile readability.
4. For animated items, keep animation layers separable and performance-conscious.
5. For every **Burn, Joker, or Victory effect**, create/update its unique synchronised sound effect in the same change.
6. Preview the finished cosmetic/effect at actual in-game size before considering it complete.

This document is the source of truth for cosmetic visual and effect style unless the owner explicitly asks for a one-off exception.

## Tables: mandatory responsive full-scene rule

Every table is a full-screen scene, with defining features spread across it. The owner rejected the v269 small isolated motifs. Never shrink the whole artwork into a contained icon or reserve a small safe area away from the cards. Ignore older instructions allowing feature cropping.

1. **Build independent layers:** a filling sky/gradient/texture, a horizon/ground band pinned to the bottom and extended across the full width, left/right features anchored to their respective edges, top features and details scattered throughout. Extend sky, ground, landscape or pattern when the screen changes shape. Never use blank bars or a reduced whole picture.
2. **Keep features large and complete:** use one uniform scale based on the smaller host dimension for each feature. Preserve circular geometry, wing proportions and full Rangoli bounds. Include strokes and any glow inside each feature's bounds. Do not stretch SVGs or use background-size 100% 100%. Only the filling background and continuous texture may crop; no defining feature may cross the screen edge.
3. **Responsive composition:** widen the landscape and reposition edge anchors on PC, tablet, ultra-wide and folded phones. Extend sky and ground vertically on tall phones. Every defining feature remains recognisable at every size. Recompute on resize, zoom, orientation and host-layout changes.
4. **Gameplay contrast:** the art may sit behind Deck/Pile, seats and cards. Use subdued contrast through those regions, readable opaque card faces and pill labels. Never hide art to fit it between controls. Keep the premium style: lighting, depth, controlled glow and complete silhouettes.
5. **All views share the renderer:** game, equipped dimmed home backdrop, Shop, Custom, Collection, showcase and big preview. No animations on tables. Home extends across the viewport and keeps the equipped table during events.
6. **Resolution:** SVG/CSS is preferred. The two existing free seamless 1920px wood/felt textures repeat at 640 CSS pixels (3× source density); never stretch them across a screen. Version new asset filenames and add them to service-worker offline assets.
7. **Validation:** real games in progress at 390×844, 360×640, 768×1024, 1366×768, 1920×1080 and 3840×2160. Inspect all 138 images visually for scene coverage, large complete features, proportions, continuation and card/control readability. Also test 200% zoom and folded/ultra-wide layouts. A dev test must measure every main feature's painted bounds and minimum relative size, at each required size. Geometry checks do not establish art quality.
8. **Owner approval:** show one contact sheet of all 23 themes at all six required sizes. Wait for explicit owner approval before replacing live art or pushing to main. Main deploys automatically. Rejected v269 art must never be published.

### Owner-approved theme details (1 October 2026)

Casino uses the existing deep green surface with subtle diagonals running top-left to bottom-right; Royal uses the existing purple surface with fine gold crosshatching. Both are continuous patterns, with no chips, suit symbols or crowns. Preserve fixed, uniform pattern spacing through the shared responsive renderer. Fireside is an indoor Christmas room with fireplace, garlands and wreath, without trees or snowflakes. Candlelit Dinner has no flowers or petals. Jungle is a dense forest with layered canopy, trunks, vines and undergrowth, rather than isolated oversized leaves.

## Cinematic animation construction — level-burn reference (v294)

The six level-reward Burns in `art/burns/level-v294/` establish the owner-approved direction for future Burn, Joker and other animations: sculpted game-stylised forms, convincing material depth, saturated focal colours, controlled bloom and clear themed actions. Use paper folds, dimensional metal/gems, volumetric smoke and weighted liquid where relevant.

- Thumbnails may show a composed action diorama. In play, use transparent components; never slide, rotate or zoom an entire framed thumbnail as the effect.
- Separate subject, cards, glow, smoke, fire arcs and fragments. Give each an action appropriate to its material.
- Each effect needs a distinct silhouette and movement: sparks snap, smoke expands, fire sweeps, a vortex rises, a crown releases gold fire, and the ShitStorm mascot appears within a whirlwind.
- Build anticipation, one dominant payoff and a clean finish within 1–2.5 seconds. Time the unique sound from the same impact constants as the animation.
- Keep the presentation background/frame out of gameplay. Limit the footprint around the affected cards and use a moderate particle budget.
- Inspect at 40px and at preview size; simplify details that disappear. Provide a stationary reduced-motion dissolve, clean replay behaviour, and background cleanup.
