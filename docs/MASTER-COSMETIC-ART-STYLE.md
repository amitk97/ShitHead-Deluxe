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
