// Static inline SVG/avatar artwork definitions.
const AVATAR_ART = {
  'avatar-crown-bronze': crownAvatarArt('bronze'),
  'avatar-suit-spades':  { tone: 'navy', art: `<path d="${AV_SPADE}" fill="url(#av-m-pearl)" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>` },
  'avatar-suit-hearts':  { tone: 'navy', art: `<path d="${AV_HEART}" fill="url(#av-m-crimson)" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>` },
  'avatar-suit-diamonds':{ tone: 'navy', art: `<path d="${AV_DIAMOND}" fill="url(#av-m-crimson)" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/><path d="M32 17 26 32" stroke="rgba(255,255,255,.4)" stroke-width="1.4" stroke-linecap="round"/>` },
  'avatar-suit-clubs':   { tone: 'navy', art: `<g fill="url(#av-m-pearl)" stroke="rgba(0,0,0,.35)" stroke-width="1.2">${AV_CLUB}</g>` },

  'avatar-ace-spades':   { tone: 'silver', art: avCard('A', '#0f172a', `<path d="${AV_SPADE}" transform="translate(32 33) scale(.52) translate(-32 -32)" fill="#0f172a"/>`) },
  'avatar-queen-hearts': { tone: 'red', art: avCard('Q', '#be123c', `<g transform="translate(34 22.5) scale(.24) translate(-32 -32)">${AV_CROWN('gold')}</g><path d="${AV_HEART}" transform="translate(32 37) scale(.46) translate(-32 -32)" fill="url(#av-m-crimson)"/>`) },
  'avatar-joker':        { tone: 'purple', art: `
    <path d="M20 43C18 33 13 27 9.5 22.5 18 22 24 28 27 37Z" fill="#a855f7" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M44 43c2-10 7-16 10.5-20.5C46 22 40 28 37 37Z" fill="#f43f5e" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M25 43c0-12 3.5-21.5 7-28.5 3.5 7 7 16.5 7 28.5Z" fill="#10b981" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="17" y="42" width="30" height="7" rx="2.5" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <circle cx="9.5" cy="22.5" r="3.2" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.35)"/><circle cx="32" cy="14.5" r="3.2" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.35)"/><circle cx="54.5" cy="22.5" r="3.2" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.35)"/>` },
  // Burn Flame: a layered bonfire (outer ember, orange body, gold heart,
  // white-hot core) with a heat halo, a bed of coals and drifting sparks.
  'avatar-burn-flame':   { tone: 'ember', art: `
    <circle cx="32" cy="34" r="22" fill="url(#av-phx-halo)"/>
    <ellipse cx="32" cy="50.5" rx="15" ry="3.2" fill="#1c0a03"/><ellipse cx="32" cy="49.6" rx="12" ry="2.2" fill="#9a3412" opacity=".9"/>
    <path d="M22 50c1.5-1.2 3.5-1.4 5-.6M36 49.4c1.6-.9 3.6-.9 5.2.2" stroke="#fb923c" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".85"/>
    <path d="M32 8.5c5.2 9.3 16.5 14.6 16.5 28 0 9.6-7.4 14.5-16.5 14.5S15.5 46.1 15.5 36.5c0-7.8 4.4-12.8 7.8-17.1.2 6.6 3.3 9.7 5.6 10-1.1-7.3-.4-13.8 3.1-20.9Z" fill="#b91c1c" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
    <path d="M32 13.5c4.4 8.2 13.4 12.8 13.4 23.8 0 8-6 11.8-13.4 11.8s-13.4-3.8-13.4-11.8c0-6.4 3.4-10.4 6.2-14 .3 5.4 2.6 8 4.5 8.3-.9-6-.3-11.6 2.7-18.1Z" fill="url(#av-m-flame)"/>
    <path d="M32 24c3.3 5.3 8.8 8.3 8.8 15 0 5.3-4 8.3-8.8 8.3s-8.8-3-8.8-8.3c0-4.2 2.3-6.8 4.2-9.2.3 3.2 1.7 5 2.9 5.3-.5-3.8-.1-7.2 1.7-11.1Z" fill="#fbbf24"/>
    <path d="M32 33.5c2.4 3.3 5 5.2 5 9 0 3.1-2.3 4.8-5 4.8s-5-1.7-5-4.8c0-3.4 2.6-5.6 5-9Z" fill="url(#av-m-core)"/>
    <path d="M26.2 22.5c-1.9 3-3.2 6.3-2.9 10.4" stroke="#fde68a" stroke-width="1" stroke-linecap="round" fill="none" opacity=".7"/>
    <circle cx="47" cy="17" r="1" fill="#fde047"/><circle cx="17.5" cy="21" r=".8" fill="#fb923c"/><circle cx="44" cy="10" r=".6" fill="#fef08a"/><circle cx="21" cy="12.5" r=".6" fill="#fdba74"/>` },
  // Transparent Ghost: see-through, lit from inside, with a wispy tail,
  // hollow glowing eyes and a trail of mist.
  'avatar-ghost':        { tone: 'ghost', art: `
    <circle cx="32" cy="30" r="21" fill="url(#av-ghost-halo)"/>
    <path d="M18 52.5c3-1.6 6.2-1.8 9-.4M39 53c2.6-1.4 5.6-1.5 8.2-.3" stroke="rgba(226,232,240,.35)" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M18.5 49.5V29.5c0-9.6 6-16.5 13.5-16.5s13.5 6.9 13.5 16.5v20l-3.4-3.6-3.3 4.4-3.4-4.4-3.4 4.4-3.4-4.4-3.3 4.4-3.4-4.4Z" fill="url(#av-ghost-body)" stroke="rgba(255,255,255,.9)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M23 22c1.8-3 4.6-4.8 8-5.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".85"/>
    <path d="M22 30c0 8 1 14 3 18" stroke="rgba(255,255,255,.35)" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <ellipse cx="27" cy="30.5" rx="3" ry="4.2" fill="#0b1220"/><ellipse cx="37" cy="30.5" rx="3" ry="4.2" fill="#0b1220"/>
    <ellipse cx="27" cy="31.3" rx="1.3" ry="1.8" fill="#7dd3fc"/><ellipse cx="37" cy="31.3" rx="1.3" ry="1.8" fill="#7dd3fc"/>
    <ellipse cx="32" cy="39.8" rx="2.4" ry="3" fill="#0b1220" opacity=".85"/>` },
  // Frozen: an Ace of spades locked inside a cracked block of ice, frost
  // creeping over it, with glints and a snowflake.
  'avatar-frozen':       { tone: 'ice', art: `
    <rect x="16" y="11" width="32" height="42" rx="5" fill="url(#av-ice-block)" stroke="#e0f2fe" stroke-width="1.3"/>
    <g opacity=".75" transform="rotate(-6 32 32)">${avCard('A', '#0c4a6e', `<path d="${AV_SPADE}" transform="translate(32 33) scale(.5) translate(-32 -32)" fill="#0c4a6e"/>`)}</g>
    <rect x="16" y="11" width="32" height="42" rx="5" fill="url(#av-ice-sheen)"/>
    <path d="M22 15l5 7 -2 5 6 4M42 20l-4 6 3 4-5 5M20 44l6-3 3 4" stroke="#f0f9ff" stroke-width=".7" fill="none" opacity=".8" stroke-linejoin="round"/>
    <path d="M16.6 46c3-1 5.5-3.5 6.5-7M47.4 17c-2.6.6-4.6 2.5-5.4 5.2" stroke="#fff" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".75"/>
    <g stroke="#f0f9ff" stroke-width="1.1" stroke-linecap="round" transform="translate(47.5 49.5)"><path d="M0-5V5M-4.3-2.5 4.3 2.5M-4.3 2.5 4.3-2.5"/><path d="M-1.4-3.6 0-2.3 1.4-3.6M-1.4 3.6 0 2.3 1.4 3.6" fill="none" stroke-width=".8"/></g>
    <path d="m19 12.5.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z" fill="#fff"/>` },
  'avatar-burning-ten':  { tone: 'ember', animated: true, art: `
    <g class="av-flicker"><path d="${AV_FLAME}" transform="translate(21 27) scale(.62 .72) translate(-32 -32)" fill="url(#av-m-flame)"/></g>
    <g class="av-flicker av-flicker-2"><path d="${AV_FLAME}" transform="translate(43 25) scale(.7 .8) translate(-32 -32)" fill="url(#av-m-flame)"/></g>
    <g class="av-flicker"><path d="${AV_FLAME}" transform="translate(32 21) scale(.8 .9) translate(-32 -32)" fill="url(#av-m-flame)"/><path d="${AV_FLAME_CORE}" transform="translate(32 24) scale(.7) translate(-32 -40)" fill="url(#av-m-core)"/></g>
    <g transform="translate(0 6) rotate(-8 32 34)">${avCard('10', '#0f172a', `<path d="${AV_SPADE}" transform="translate(32 34) scale(.46) translate(-32 -32)" fill="#0f172a"/>`)}</g>` },
  'avatar-fanned-hand':  { tone: 'navy', animated: true, art: `
    <g class="av-fan av-fan-l"><rect x="22" y="15" width="20" height="30" rx="3.2" fill="url(#av-m-crimson)" stroke="rgba(0,0,0,.4)" stroke-width="1.1"/><path d="${AV_HEART}" transform="translate(32 30) scale(.3) translate(-32 -32)" fill="#fff" opacity=".9"/></g>
    <g class="av-fan av-fan-r"><rect x="22" y="15" width="20" height="30" rx="3.2" fill="#1e293b" stroke="rgba(255,255,255,.35)" stroke-width="1.1"/><path d="${AV_DIAMOND}" transform="translate(32 30) scale(.3) translate(-32 -32)" fill="url(#av-m-gold)"/></g>
    <g><rect x="22" y="15" width="20" height="30" rx="3.2" fill="url(#av-m-ivory)" stroke="rgba(0,0,0,.45)" stroke-width="1.1"/><text x="24.5" y="22.5" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="6.5" fill="#0f172a">A</text><path d="${AV_SPADE}" transform="translate(32 31) scale(.34) translate(-32 -32)" fill="#0f172a"/></g>` },
  'avatar-joker-card':   { tone: 'purple', animated: true, art: `
    <g class="av-sway">
      <rect x="19" y="11" width="26" height="40" rx="4" fill="url(#av-m-joker)" stroke="url(#av-m-gold)" stroke-width="1.6"/>
      <g transform="translate(32 31) scale(.5) translate(-32 -32)">
        <path d="M20 43C18 33 13 27 9.5 22.5 18 22 24 28 27 37Z" fill="#a855f7"/><path d="M44 43c2-10 7-16 10.5-20.5C46 22 40 28 37 37Z" fill="#f43f5e"/><path d="M25 43c0-12 3.5-21.5 7-28.5 3.5 7 7 16.5 7 28.5Z" fill="#10b981"/>
        <rect x="17" y="42" width="30" height="7" rx="2.5" fill="url(#av-m-gold)"/><circle cx="9.5" cy="22.5" r="3.4" fill="url(#av-m-gold)"/><circle cx="32" cy="14.5" r="3.4" fill="url(#av-m-gold)"/><circle cx="54.5" cy="22.5" r="3.4" fill="url(#av-m-gold)"/>
      </g>
      <text x="22.3" y="19.5" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="5.5" fill="#fcd34d">JKR</text>
      <g clip-path="url(#av-clip-card)"><g transform="rotate(18 32 32)"><rect class="av-shine" x="6" y="0" width="10" height="64" fill="url(#av-shine)"/></g></g>
    </g>` },

  'avatar-shithead':     { tone: 'brown', art: `
    <path d="M17 46.5c0-4 3.5-6.5 8-6.5h14c4.5 0 8 2.5 8 6.5S43.5 52 39 52H25c-4.5 0-8-1.5-8-5.5Z" fill="url(#av-m-poo)" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path d="M21 38.5c0-3.5 3-5.5 6.5-5.5h9c3.5 0 6.5 2 6.5 5.5S40 43 36.5 43h-9C24 43 21 42 21 38.5Z" fill="url(#av-m-poo)" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path d="M25 31c0-3 2.5-4.5 5-4.5h4.5c2.5 0 4.5 1.5 4.5 4.3 0 2.7-2 4.2-4.5 4.2h-5C27 35 25 34 25 31Z" fill="url(#av-m-poo)" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path d="M30 26.5c.5-3.5 3-5.5 5.5-6.5-.5 2.5 0 4.5 1.5 6" fill="url(#av-m-poo)" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="27.5" cy="38" r="2.6" fill="#fff"/><circle cx="36.5" cy="38" r="2.6" fill="#fff"/><circle cx="28" cy="38.4" r="1.2" fill="#1c0f06"/><circle cx="37" cy="38.4" r="1.2" fill="#1c0f06"/>
    <path d="M27 46.5c3 2.5 7 2.5 10 0" fill="none" stroke="#1c0f06" stroke-width="1.6" stroke-linecap="round"/>` },
  // Gauntlet Champion (earn-only): the owner's green crest (v254), drawn
  // from its photo art after this table (installGauntletAvatars).
  // Recruiter (earn-only): a friend brought to the table, with a gold +.
  'avatar-recruiter':    { tone: 'green', animated: true, art: `
    <g stroke="rgba(0,0,0,.4)" stroke-width="1.1">
      <circle cx="38" cy="26" r="6.5" fill="url(#av-m-silver)"/>
      <path d="M26.5 47c0-7.5 5-12.5 11.5-12.5S49.5 39.5 49.5 47Z" fill="url(#av-m-silver)"/>
      <circle cx="24.5" cy="29" r="7.5" fill="url(#av-m-gold)"/>
      <path d="M11 53c0-8.5 6-14 13.5-14S38 44.5 38 53Z" fill="url(#av-m-gold)"/>
    </g>
    <circle cx="50" cy="15" r="7.6" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.45)" stroke-width="1.1"/>
    <path d="M50 10.6v8.8M45.6 15h8.8" stroke="#14532d" stroke-width="2.8" stroke-linecap="round"/>
    <g clip-path="url(#av-clip-tile)"><g transform="rotate(18 32 32)"><rect class="av-shine" x="6" y="0" width="10" height="64" fill="url(#av-shine)"/></g></g>` },
  'avatar-centurion':    { tone: 'red', art: `
    <text x="32" y="38" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="21" fill="#ef4444" stroke="#7f1d1d" stroke-width=".8" letter-spacing="-1">100</text>
    <path d="M13.5 43.5 50 41.5M15.5 48.5 47 46.8" stroke="#ef4444" stroke-width="2.6" stroke-linecap="round"/>` },
  'avatar-crown-silver': crownAvatarArt('silver'),
  'avatar-crown-gold': crownAvatarArt('gold'),
  'avatar-crown-diamond': crownAvatarArt('platinum'),
  'avatar-crown-master': crownAvatarArt('master'),
  // Premium animated pictures (2500): richer loops, same tile and metals.
  'avatar-royal-flush':  { tone: 'gold', animated: true, art: `
    <g class="av-bob"><g transform="translate(32 13) scale(.3) translate(-32 -32)">${AV_CROWN('gold')}${AV_CROWN_GEMS('#b91c1c')}</g></g>
    <g class="av-rf" style="--a:-34deg"><rect x="24" y="23" width="16" height="24" rx="2.4" fill="url(#av-m-ivory)" stroke="url(#av-m-gold)" stroke-width="1.1"/><text x="25.6" y="29.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="4.6" fill="#0f172a" letter-spacing="-.4">10</text><path d="${AV_SPADE}" transform="translate(32 37) scale(.2) translate(-32 -32)" fill="#0f172a"/></g><g class="av-rf" style="--a:-17deg"><rect x="24" y="23" width="16" height="24" rx="2.4" fill="url(#av-m-ivory)" stroke="url(#av-m-gold)" stroke-width="1.1"/><text x="25.6" y="29.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="5.4" fill="#0f172a" letter-spacing="-.4">J</text><path d="${AV_SPADE}" transform="translate(32 37) scale(.2) translate(-32 -32)" fill="#0f172a"/></g><g class="av-rf" style="--a:0deg"><rect x="24" y="23" width="16" height="24" rx="2.4" fill="url(#av-m-ivory)" stroke="url(#av-m-gold)" stroke-width="1.1"/><text x="25.6" y="29.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="5.4" fill="#0f172a" letter-spacing="-.4">Q</text><path d="${AV_SPADE}" transform="translate(32 37) scale(.2) translate(-32 -32)" fill="#0f172a"/></g><g class="av-rf" style="--a:17deg"><rect x="24" y="23" width="16" height="24" rx="2.4" fill="url(#av-m-ivory)" stroke="url(#av-m-gold)" stroke-width="1.1"/><text x="25.6" y="29.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="5.4" fill="#0f172a" letter-spacing="-.4">K</text><path d="${AV_SPADE}" transform="translate(32 37) scale(.2) translate(-32 -32)" fill="#0f172a"/></g><g class="av-rf" style="--a:34deg"><rect x="24" y="23" width="16" height="24" rx="2.4" fill="url(#av-m-ivory)" stroke="url(#av-m-gold)" stroke-width="1.1"/><text x="25.6" y="29.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="5.4" fill="#0f172a" letter-spacing="-.4">A</text><path d="${AV_SPADE}" transform="translate(32 37) scale(.2) translate(-32 -32)" fill="#0f172a"/></g>
    <g class="av-twinkle "><path d="m12 16.8 0.96 2.24 2.24 0.96-2.24 0.96-0.96 2.24-0.96-2.24-2.24-0.96 2.24-0.96Z" fill="#fff7d6"/></g><g class="av-twinkle av-twinkle-2"><path d="m52 15.4 0.78 1.82 1.82 0.78-1.82 0.78-0.78 1.82-0.78-1.82-1.82-0.78 1.82-0.78Z" fill="#fff"/></g><g class="av-twinkle av-twinkle-3"><path d="m50 49.8 0.66 1.54 1.54 0.66-1.54 0.66-0.66 1.54-0.66-1.54-1.54-0.66 1.54-0.66Z" fill="#fde68a"/></g>
    <g clip-path="url(#av-clip-tile)"><g transform="rotate(18 32 32)"><rect class="av-shine" x="6" y="0" width="10" height="64" fill="url(#av-shine)"/></g></g>` },
  'avatar-cosmic-ace':   { tone: 'cosmos', animated: true, art: `
    <g class="av-twinkle "><path d="m11 11.4 0.78 1.82 1.82 0.78-1.82 0.78-0.78 1.82-0.78-1.82-1.82-0.78 1.82-0.78Z" fill="#fff"/></g><g class="av-twinkle av-twinkle-2"><path d="m53 10 0.60 1.40 1.40 0.60-1.40 0.60-0.60 1.40-0.60-1.40-1.40-0.60 1.40-0.60Z" fill="#e9d5ff"/></g><g class="av-twinkle av-twinkle-3"><path d="m54 47.6 0.72 1.68 1.68 0.72-1.68 0.72-0.72 1.68-0.72-1.68-1.68-0.72 1.68-0.72Z" fill="#fff"/></g><g class="av-twinkle av-twinkle-4"><path d="m9 48.2 0.54 1.26 1.26 0.54-1.26 0.54-0.54 1.26-0.54-1.26-1.26-0.54 1.26-0.54Z" fill="#c7d2fe"/></g>
    <g transform="rotate(-18 32 31)">
      <path d="M5 31a27 8 0 0 1 54 0" fill="none" stroke="rgba(196,181,253,.45)" stroke-width=".9"/>
      <g class="av-orbit"><g class="av-orbit-back"><circle cx="32" cy="31" r="3.4" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.4)" stroke-width=".8"/><circle cx="31" cy="30" r="1" fill="#fff" opacity=".7"/></g></g>
    </g>
    <g class="av-float">
      <rect x="21" y="13" width="22" height="34" rx="3.5" fill="url(#av-m-cosmos)" stroke="url(#av-m-gold)" stroke-width="1.4"/>
      <circle cx="25" cy="24" r=".45" fill="#e0e7ff" opacity="0.8"/><circle cx="38" cy="21" r=".45" fill="#e0e7ff" opacity="0.6"/><circle cx="27" cy="40" r=".45" fill="#e0e7ff" opacity="0.7"/><circle cx="39" cy="37" r=".45" fill="#e0e7ff" opacity="0.9"/><circle cx="35" cy="26" r=".45" fill="#e0e7ff" opacity="0.5"/><circle cx="24" cy="33" r=".45" fill="#e0e7ff" opacity="0.5"/><circle cx="40" cy="29" r=".45" fill="#e0e7ff" opacity="0.6"/>
      <circle class="av-pulse" cx="32" cy="31" r="10" fill="url(#av-m-glow)"/>
      <g class="av-pulse"><path d="${AV_SPADE}" transform="translate(32 31) scale(.36) translate(-32 -32)" fill="url(#av-m-pearl)" stroke="#fff" stroke-width="1.5"/></g>
      <text x="23.3" y="20.2" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="6.2" fill="#fcd34d">A</text>
      <text x="23.3" y="20.2" transform="rotate(180 32 30)" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="6.2" fill="#fcd34d">A</text>
    </g>
    <g transform="rotate(-18 32 31)">
      <path d="M59 31a27 8 0 0 1-54 0" fill="none" stroke="rgba(196,181,253,.7)" stroke-width="1"/>
      <g class="av-orbit"><g class="av-orbit-front"><circle cx="32" cy="31" r="3.4" fill="url(#av-m-gold)" stroke="rgba(0,0,0,.4)" stroke-width=".8"/><circle cx="31" cy="30" r="1" fill="#fff" opacity=".7"/></g></g>
    </g>` },
  ...PREMIUM_PHOTO_AVATARS.art
};

document.body.insertAdjacentHTML('afterbegin', AVATAR_DEFS_SVG);
// Windows' emoji font has no country flags (they show as two letters,
// e.g. "GB"). If this device can't draw a flag, load Twemoji's flag-only
// font (CC-BY 4.0, via country-flag-emoji-polyfill) for flag characters
// only; every other character keeps the normal fonts. Devices that
// already draw flags (phones, Macs) are left untouched.
(function installFlagEmojiFallback() {
  const drawsFlags = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 24;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.textBaseline = 'top';
      ctx.font = '20px sans-serif';
      ctx.fillText('\u{1F1EC}\u{1F1E7}', 0, 0);
      const px = ctx.getImageData(0, 0, 24, 24).data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 0 && (Math.abs(px[i] - px[i + 1]) > 40 || Math.abs(px[i + 1] - px[i + 2]) > 40)) return true;
      }
      return false;
    } catch (e) { return true; }
  };
  if (drawsFlags()) return;
  const style = document.createElement('style');
  style.id = 'flagEmojiFallback';
  style.textContent = "@font-face{font-family:'Twemoji Country Flags';unicode-range:U+1F1E6-1F1FF,U+1F3F4,U+E0062-E0063,U+E0065,U+E0067,U+E006C,U+E006E,U+E0073-E0074,U+E0077,U+E007F;src:url('https://cdn.jsdelivr.net/npm/country-flag-emoji-polyfill@0.1/dist/TwemojiCountryFlags.woff2') format('woff2');font-display:swap;}"
    + "body{font-family:'Twemoji Country Flags','Outfit',sans-serif;}";
  document.head.appendChild(style);
  document.body.classList.add('flag-font-fallback');
})();
const DEFAULT_AVATAR_ID = 'avatar-crown-bronze';
function resolveAvatarId(id) {
  return AVATAR_ART[id] ? id : DEFAULT_AVATAR_ID;
}
// Every size keeps the animated layers, including Shop, Custom and
// compact player pictures. Visibility and Reduce Motion control playback.
// § Gauntlet avatars (v254): the owner's three crests, one per mode
// (avatar-gauntlet = Easy, green; -hard = crimson; -boss = amethyst), as
// photo tiles (tools/make-gauntlet-avatars.py: art/avatars/gauntlet-*.webp
// and GAUNTLET_AVATAR_LAYOUT) under a gold rim, with moving light on
// top: a shine runs up each sword blade in turn, the gems glint, the heart
// glows and a few sparks rise. One 5s loop; paused offscreen or hidden
// (avatarMotionWatch), stopped by Reduce Motion (the still art shows).
const GAUNTLET_ART_V = 254;
const GAUNTLET_AVATAR_LAYOUT = {"easy":{"blades":[[[100,92],[301,321],34],[[918,92],[701,321],34]],"gems":[[500,148],[500,316],[204,809],[788,809]],"heart":[500,517,115]},"hard":{"blades":[[[93,61],[315,293],41],[[912,61],[686,293],41]],"gems":[[495,94],[498,268],[498,676],[177,798],[820,798]],"heart":[500,481,117]},"boss":{"blades":[[[93,63],[313,293],41],[[910,63],[686,293],41]],"gems":[[498,99],[500,284],[500,690],[498,822],[178,798],[820,798]],"heart":[500,500,111]}};
const GAUNTLET_AVATAR_GLOW = { easy: '#4ade80', hard: '#fb7185', boss: '#d8b4fe' };
function gauntletAvatarArt(mode) {
  const L = GAUNTLET_AVATAR_LAYOUT[mode], glow = GAUNTLET_AVATAR_GLOW[mode], id = `gx-${mode}`;
  const f = (n) => Math.round(n * 10) / 10;
  let bladeClips = '';
  const blades = L.blades.map(([[tx, ty], [bx, by], w], i) => {
    const len = Math.hypot(bx - tx, by - ty), dx = (bx - tx) / len, dy = (by - ty) / len, nx = -dy, ny = dx;
    const pts = [[tx, ty], [tx + dx * w * 1.3 + nx * w, ty + dy * w * 1.3 + ny * w], [bx + nx * w, by + ny * w], [bx - nx * w, by - ny * w], [tx + dx * w * 1.3 - nx * w, ty + dy * w * 1.3 - ny * w]];
    // The gleam: a soft band across the blade, starting at its base and
    // travelling to the tip (--dx/--dy), clipped to the blade's shape.
    const g = 30; // half the gleam's width along the blade
    const band = [[bx + nx * w * 2 + dx * g, by + ny * w * 2 + dy * g], [bx + nx * w * 2 - dx * g, by + ny * w * 2 - dy * g], [bx - nx * w * 2 - dx * g, by - ny * w * 2 - dy * g], [bx - nx * w * 2 + dx * g, by - ny * w * 2 + dy * g]];
    bladeClips += `<clipPath id="${id}-b${i}"><polygon points="${pts.map(p => p.map(f).join(',')).join(' ')}"/></clipPath>`;
    return `<g clip-path="url(#${id}-b${i})"><polygon class="av-gx-shine" style="--dx:${f(tx - bx)}px;--dy:${f(ty - by)}px;animation-delay:${i * 0.45}s" points="${band.map(p => p.map(f).join(',')).join(' ')}" fill="url(#${id}-gleam)"/></g>`;
  }).join('');
  const glints = L.gems.map(([x, y], i) => `<g transform="translate(${x} ${y})"><path class="av-gx-glint" style="animation-delay:${1.3 + i * 0.32}s" d="M0 -44 7 -7 44 0 7 7 0 44 -7 7 -44 0 -7 -7Z" fill="#fff"/></g>`).join('');
  const [hx, hy, hr] = L.heart;
  const sparks = [[160, 900], [300, 960], [720, 950], [860, 880], [420, 980], [580, 930]].map(([x, y], i) =>
    `<circle class="av-gx-spark" style="animation-delay:${i * 0.8}s" cx="${x}" cy="${y}" r="${7 + (i % 3) * 2}" fill="${i % 2 ? '#fde68a' : glow}"/>`).join('');
  // Gradients and clips live once in #gauntletAvatarDefs (ids must be unique).
  const defs = `<linearGradient id="${id}-gleam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}-heart"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${glow}" stop-opacity=".7"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
      <clipPath id="${id}-tile"><rect width="1000" height="1000" rx="234"/></clipPath>${bladeClips}`;
  return { defs, art: `
    <rect width="1000" height="1000" rx="234" fill="#07070c"/>
    <image href="art/avatars/gauntlet-${mode}.webp?v=${GAUNTLET_ART_V}" width="1000" height="1000" preserveAspectRatio="xMidYMid slice" style="clip-path:inset(0 round 234px)"/>
    <g clip-path="url(#${id}-tile)">
      <circle class="av-gx-heart" cx="${hx}" cy="${hy}" r="${Math.round(hr * 1.5)}" fill="url(#${id}-heart)"/>
      ${blades}${glints}${sparks}
    </g>
    <rect x="17" y="17" width="966" height="966" rx="217" fill="none" stroke="url(#av-m-gold)" stroke-width="34"/>
    <rect x="35" y="35" width="930" height="930" rx="200" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="5"/>
    <rect x="4" y="4" width="992" height="992" rx="230" fill="none" stroke="rgba(255,244,184,.55)" stroke-width="4"/>` };
}
(function installGauntletAvatars() {
  let defs = '';
  [['avatar-gauntlet', 'easy'], ['avatar-gauntlet-hard', 'hard'], ['avatar-gauntlet-boss', 'boss']].forEach(([aid, mode]) => {
    const made = gauntletAvatarArt(mode);
    defs += made.defs;
    AVATAR_ART[aid] = { photo: true, tone: 'gold', animated: true, art: made.art };
  });
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  holder.id = 'gauntletAvatarDefs';
  holder.setAttribute('width', '0'); holder.setAttribute('height', '0'); holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  holder.innerHTML = `<defs>${defs}</defs>`;
  document.body.appendChild(holder);
})();
function avatarSvg(id, size = 64) {
  const art = AVATAR_ART[resolveAvatarId(id)];
  if (art.photo) {
    const inset = art.edgeToEdge ? 0 : 2, extent = art.edgeToEdge ? 64 : 60;
    const body = `<svg x="${inset}" y="${inset}" width="${extent}" height="${extent}" viewBox="0 0 1000 1000" overflow="hidden">${art.art}</svg>`;
    return `<svg viewBox="0 0 64 64" class="avatar-svg" aria-hidden="true" focusable="false">${body}</svg>`;
  }
  const [, , rim] = AVATAR_TONES[art.tone];
  return `<svg viewBox="0 0 64 64" class="avatar-svg" aria-hidden="true" focusable="false">
    <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#av-bg-${art.tone})" stroke="${rim}" stroke-width="2"/>
    <rect x="4.5" y="4.5" width="55" height="55" rx="12.5" fill="none" stroke="rgba(255,255,255,.07)"/>
    <g clip-path="url(#av-clip-tile)">${art.art}</g>
  </svg>`;
}
// size: px. Every surface uses this so the aspect ratio (1:1 rounded
// square, matching the default profile icon) is identical everywhere.
// The one place that decides which picture a seat shows: you see your own
// equipped picture, bots carry theirs on the seat, and other people's
// come from the public loadout they publish into the room.
function getPlayerAvatarId(player) {
  if (!player) return DEFAULT_AVATAR_ID;
  if (player.id === state?.localPlayerId && !player.isBot) return resolveAvatarId(equippedCosmetics?.avatar);
  if (player.isBot) return resolveAvatarId(player.avatar);
  return resolveAvatarId(player.cosmetics?.avatar);
}
// Bots wear a random FREE picture, never the same as another bot at the
// table. pickBotAvatar is used when a bot is created; ensureBotAvatars is
// a deterministic safety net at render time (same result on every client,
// since it only depends on seat order and ids) for bots from older saves.
function pickBotAvatar(players = []) {
  const taken = new Set(players.filter(p => p && p.isBot).map(p => p.avatar));
  const options = FREE_AVATAR_IDS.filter(id => !taken.has(id));
  const pool = options.length ? options : FREE_AVATAR_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
// Native bots carry their random free back in the saved/shared seat.
// Older seats use a stable hash so clients and rerenders agree.
function freeBotCardBackIds() {
  return ['default', ...BUILT_IN_COSMETICS.filter(item => item.category === 'Card Backs' && item.cost === 0).map(item => item.id)];
}
function pickBotCardBack() {
  const pool = freeBotCardBackIds();
  return pool[Math.floor(Math.random() * pool.length)];
}
function ensureBotCardBacks(players = []) {
  const pool = freeBotCardBackIds();
  players.forEach(p => {
    if (!p?.isBot || p.cosmetics?.cardBack) return;
    const seed = Array.from(String(p.id || '') + ':' + String(p.name || '')).reduce((hash, ch) => (Math.imul(hash, 31) + ch.charCodeAt(0)) >>> 0, 0);
    p.cosmetics = { ...p.cosmetics, cardBack: pool[seed % pool.length] };
  });
}
function ensureBotAvatars(players = []) {
  const used = new Set();
  players.forEach(p => {
    if (!p || !p.isBot) return;
    if (FREE_AVATAR_IDS.includes(p.avatar) && !used.has(p.avatar)) { used.add(p.avatar); return; }
    const seed = String(p.id || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const pick = FREE_AVATAR_IDS.map((_, i) => FREE_AVATAR_IDS[(seed + i) % FREE_AVATAR_IDS.length]).find(id => !used.has(id)) || FREE_AVATAR_IDS[seed % FREE_AVATAR_IDS.length];
    p.avatar = pick;
    used.add(pick);
  });
}
function avatarHtml(id, size = 32, extraClass = '') {
  const item = getAvatarItem(resolveAvatarId(id));
  const art = AVATAR_ART[resolveAvatarId(id)];
  const anim = art?.animated ? ' data-av-anim' : '';
  return `<span class="avatar-tile ${extraClass}"${anim} style="width:${size}px;height:${size}px" role="img" aria-label="${item ? escapeAttr(item.name) : 'Avatar'}">${avatarSvg(id, size)}</span>`;
}
// Animated pictures only move while they can be seen: one shared
// IntersectionObserver pauses any that are offscreen (.av-still), and a
// hidden app pauses them all (body.app-hidden). No per-picture timers:
// every loop is plain CSS.
const avatarMotionWatch = (() => {
  if (typeof IntersectionObserver !== 'function') return null;
  const io = new IntersectionObserver((entries) => entries.forEach(e => e.target.classList.toggle('av-still', !e.isIntersecting)));
  let queued = false;
  const scan = () => {
    queued = false;
    document.querySelectorAll('[data-av-anim]:not([data-av-watched])').forEach((el) => { el.setAttribute('data-av-watched', ''); io.observe(el); });
  };
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(scan); } }).observe(document.body, { childList: true, subtree: true });
  const syncHidden = () => document.body.classList.toggle('app-hidden', document.hidden);
  document.addEventListener('visibilitychange', syncHidden);
  syncHidden();
  scan();
  return { io, scan };
})();


// ============================================================
// ILLUSTRATED TABLE THEMES
// Each scene is an inline SVG (as a data URI) so it stays sharp on any
// screen with no image hosting. One copy per scene feeds both the live
// table (a style tag built below) and the Shop preview.
// ============================================================
const TABLE_ART = {
  'candyfloss': "art/tables/candyfloss.svg",
  'desert': "art/tables/desert.svg",
  'jungle': "art/tables/jungle.svg",
  'devilish': "art/tables/devilish.svg",
  'angelic': "art/tables/angelic.svg",
  // Premium (3000): vector scenes, sharp at any size.
  'neon': "art/tables/neon.svg",
  'aurora': "art/tables/aurora.svg",
  'space': "art/tables/space.svg",
  // Free photo-like surfaces (tools/make-table-textures.py): seamless
  // 1920px tiles repeated at TABLE_TILE_PX (3x pixels: sharp on phones,
  // PCs and 4K screens alike), lit by CSS gradients (TILED_TABLE_LIGHT).
  'wood': "art/tables/wood-tile.jpg",
  'felt': "art/tables/felt-tile.jpg"
};
const ILLUSTRATED_TABLES = {
  'table-candyfloss': { art: 'candyfloss', base: '#f0abfc', rim: 'inset 0 0 0 3px #fff1f2,inset 0 0 50px rgba(190,24,93,.25)', label: 'rgba(255,241,242,.95)' },
  'table-desert': { art: 'desert', base: '#c9773f', rim: 'inset 0 0 0 3px #e9b872,inset 0 0 44px rgba(59,29,8,.5)', label: 'rgba(233,184,114,.9)' },
  'table-jungle': { art: 'jungle', base: '#0b3d1f', rim: 'inset 0 0 0 3px #15803d,inset 0 0 46px rgba(0,0,0,.6)', label: 'rgba(74,222,128,.75)' },
  'table-devilish': { art: 'devilish', base: '#3f0606', rim: 'inset 0 0 0 3px #7f1d1d,inset 0 0 0 5px #000,inset 0 0 50px rgba(0,0,0,.7)', label: 'rgba(239,68,68,.85)' },
  'table-wood': { art: 'wood', base: '#6b4226', rim: 'inset 0 0 0 3px #2a170b,inset 0 0 0 4px rgba(255,220,170,.18),inset 0 0 46px rgba(20,10,4,.55)', label: 'rgba(253,230,190,.85)' },
  'table-felt': { art: 'felt', base: '#1f5a36', rim: 'inset 0 0 0 4px #4a2a14,inset 0 0 0 5px #1c0f06,inset 0 0 44px rgba(0,0,0,.55)', label: 'rgba(209,250,229,.8)' },
  'table-angelic': { art: 'angelic', base: '#312e81', rim: 'inset 0 0 0 3px #e0f2fe,inset 0 0 50px rgba(224,242,254,.25)', label: 'rgba(224,242,254,.9)' },
  'table-neon': { art: 'neon', base: '#1a0b2e', rim: 'inset 0 0 0 2px #e879f9,inset 0 0 0 4px rgba(34,211,238,.55),inset 0 0 50px rgba(0,0,0,.6)', label: 'rgba(240,171,252,.9)' },
  'table-aurora': { art: 'aurora', base: '#0b1a2e', rim: 'inset 0 0 0 3px #34d399,inset 0 0 0 4px rgba(224,242,254,.3),inset 0 0 50px rgba(0,0,0,.55)', label: 'rgba(110,231,183,.9)' },
  'table-space': { art: 'space', base: '#05060f', rim: 'inset 0 0 0 3px #6366f1,inset 0 0 0 4px rgba(251,191,36,.35),inset 0 0 52px rgba(0,0,0,.65)', label: 'rgba(199,210,254,.9)' }
};
// Seasonal event pictures (shop + earn-only). Same tile, tones and
// shared metal gradients as every other picture.
const AV_STROKE = 'stroke="rgba(0,0,0,.35)" stroke-width="1.2"';
const AV_SPARK = (x, y, s, c = '#fff', cls = 'av-twinkle') => `<g class="${cls}"><path d="m${x} ${y - 4 * s} ${s} ${3 * s} ${3 * s} ${s} ${-3 * s} ${s} ${-s} ${3 * s} ${-s} ${-3 * s} ${-3 * s} ${-s} ${3 * s} ${-s}Z" fill="${c}"/></g>`;
const SEASONAL_AVATAR_ART = {
  'avatar-valentine': { tone: 'rose', art: avCard('A', '#be123c', `
    <path d="${AV_HEART}" transform="translate(32 33) scale(.5) translate(-32 -32)" fill="url(#av-m-crimson)"/>
    <path d="M15 42 49 22" stroke="#78350f" stroke-width="1.8" stroke-linecap="round"/>
    <path d="m49 22-5 .6 2.4 2.1ZM15 42l2-3.6.9 2.6Z" fill="url(#av-m-gold)" stroke="#78350f" stroke-width=".8"/>
    <path d="m17.5 40.6-3.2-.4M18 42.6l-2.8 1.4" stroke="#fda4af" stroke-width="1.4" stroke-linecap="round"/>`) },
  'avatar-valentine-earned': { tone: 'rose', animated: true, art: `
    <g transform="translate(32 17) scale(.42) translate(-32 -30)">${AV_CROWN('gold')}</g>
    <circle cx="32" cy="37" r="11.5" fill="url(#av-m-crimson)" ${AV_STROKE}/>
    <path d="M32 29.5c4 0 6.5 3 6 6.5-.5 3.5-4 5-6.5 4.2-2.6-.8-3.6-3.6-2.2-5.6 1.3-1.8 4-1.6 4.8.2" fill="none" stroke="#881337" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M24 45c-5 1-9-1-10-5 5-1 9 1 10 5ZM40 45c5 1 9-1 10-5-5-1-9 1-10 5Z" fill="#16a34a" ${AV_STROKE}/>
    <path d="M32 48.5V56" stroke="#15803d" stroke-width="2.2" stroke-linecap="round"/>
    ${AV_SPARK(50, 14, 1)}${AV_SPARK(14, 30, .8, '#fecdd3', 'av-twinkle av-twinkle-2')}` },
  'avatar-summer': { tone: 'sea', art: `
    <path d="M22 18c0-5 4.5-8 10-8s10 3 10 8v22c0 2.2-1.8 4-4 4H26c-2.2 0-4-1.8-4-4Z" fill="#fb7185" ${AV_STROKE}/>
    <path d="M22 26h20v8H22Z" fill="#fb923c"/><path d="M22 34h20v6c0 2.2-1.8 4-4 4H26c-2.2 0-4-1.8-4-4Z" fill="#fde047"/>
    <path d="M22 18c0-5 4.5-8 10-8s10 3 10 8v22c0 2.2-1.8 4-4 4H26c-2.2 0-4-1.8-4-4Z" fill="none" ${AV_STROKE}/>
    <path d="M26 44c0 3 1 4.5 2 4.5s2-1.5 2-4.5" fill="#fde047" stroke="rgba(0,0,0,.25)"/>
    <rect x="29.5" y="44" width="5" height="13" rx="2" fill="#e7c99a" ${AV_STROKE}/>
    <path d="M26 14c1.5-2 3.5-3 6-3" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" fill="none"/>` },
  'avatar-summer-earned': { tone: 'sea', art: `
    <g transform="translate(32 26) scale(.72) translate(-32 -34)">
      <path d="M20 43C18 33 13 27 9.5 22.5 18 22 24 28 27 37Z" fill="#a855f7" ${AV_STROKE}/>
      <path d="M44 43c2-10 7-16 10.5-20.5C46 22 40 28 37 37Z" fill="#f43f5e" ${AV_STROKE}/>
      <path d="M25 43c0-12 3.5-21.5 7-28.5 3.5 7 7 16.5 7 28.5Z" fill="#10b981" ${AV_STROKE}/>
      <rect x="17" y="42" width="30" height="7" rx="2.5" fill="url(#av-m-gold)" ${AV_STROKE}/>
      <circle cx="9.5" cy="22.5" r="3.2" fill="url(#av-m-gold)"/><circle cx="32" cy="14.5" r="3.2" fill="url(#av-m-gold)"/><circle cx="54.5" cy="22.5" r="3.2" fill="url(#av-m-gold)"/></g>
    <path d="M13 44c0-3 2.5-5 6-5h8.5l2 2h5l2-2H45c3.5 0 6 2 6 5 0 4-3 7-7.5 7-4 0-7-2.5-8-6h-7c-1 3.5-4 6-8 6-4.5 0-7.5-3-7.5-7Z" fill="#0f172a" stroke="#020617" stroke-width="1.2"/>
    <path d="M16 43.5c1-1.5 3-2 5-2M40 43.5c1-1.5 3-2 5-2" stroke="#38bdf8" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M50 30 58 24" stroke="#78350f" stroke-width="1.2"/><path d="M52 26c1-5 6-7 9-5-3 0-6 2-9 5Z" fill="#f472b6"/>` },
  'avatar-halloween': { tone: 'pumpkin', animated: true, art: `
    <path d="M31 17c0-4 2-6 5-7" stroke="#3f6212" stroke-width="3" stroke-linecap="round" fill="none"/>
    <ellipse cx="22" cy="35" rx="10" ry="15" fill="url(#av-m-pumpkin)" ${AV_STROKE}/><ellipse cx="42" cy="35" rx="10" ry="15" fill="url(#av-m-pumpkin)" ${AV_STROKE}/>
    <ellipse cx="32" cy="35" rx="11" ry="16" fill="url(#av-m-pumpkin)" ${AV_STROKE}/>
    <g class="av-flicker"><path d="M22 30h7l-3.5-5.5ZM35 30h7l-3.5-5.5Z" fill="#fde047"/>
    <path d="M21 38c3 5 7 7 11 7s8-2 11-7l-3 1.5-2.5-2-2.5 2.5-3-2.5-3 2.5-2.5-2.5-2.5 2Z" fill="#fde047"/></g>` },
  'avatar-halloween-earned': { tone: 'purple', art: `
    <g transform="translate(32 14) scale(.36) translate(-32 -32)">${AV_CROWN('gold')}${AV_CROWN_GEMS('#7c3aed')}</g>
    <path d="M18 34c0-9 6-15 14-15s14 6 14 15c0 5-2.5 8-5 9.5V49H23v-5.5c-2.5-1.5-5-4.5-5-9.5Z" fill="url(#av-m-ivory)" ${AV_STROKE}/>
    <ellipse cx="25.5" cy="34" rx="4" ry="4.6" fill="#1e1b4b"/><ellipse cx="38.5" cy="34" rx="4" ry="4.6" fill="#1e1b4b"/>
    <circle cx="25.5" cy="34.5" r="1.2" fill="#a78bfa"/><circle cx="38.5" cy="34.5" r="1.2" fill="#a78bfa"/>
    <path d="M32 38.5 29.8 42h4.4Z" fill="#1e1b4b"/>
    <path d="M26 49v-4M29 49v-4M32 49v-4M35 49v-4M38 49v-4" stroke="#475569" stroke-width="1.2"/>` },
  'avatar-diwali': { tone: 'indigo', art: `
    <path d="M32 16c5 6 7 13 5 22-2 4-8 4-10 0-2-9 0-16 5-22Z" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <path d="M18 24c7 2 12 8 12 16-5 2-11 0-13-5-2-4-1-8 1-11ZM46 24c-7 2-12 8-12 16 5 2 11 0 13-5 2-4 1-8-1-11Z" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <path d="M10 36c8-1 15 2 19 7-6 3-14 2-18-2-1-1.5-1.5-3-1-5ZM54 36c-8-1-15 2-19 7 6 3 14 2 18-2 1-1.5 1.5-3 1-5Z" fill="#f59e0b" ${AV_STROKE}/>
    <path d="M16 46c10 3 22 3 32 0" stroke="#fde68a" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M30.5 22c1-2 2.5-3 3.5-3" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>` },
  'avatar-diwali-earned': { tone: 'indigo', animated: true, art: `
    <circle cx="32" cy="27" r="15" fill="#fbbf24" opacity=".18"/><circle cx="32" cy="27" r="9" fill="#fde68a" opacity=".22"/>
    <g class="av-flicker"><path d="M32 13c4.5 6 6 9.5 6 13 0 3.5-2.7 6-6 6s-6-2.5-6-6c0-3.5 1.5-7 6-13Z" fill="url(#av-m-flame)"/><path d="M32 21c2 3 3 4.8 3 6.2 0 1.8-1.4 3-3 3s-3-1.2-3-3c0-1.4 1-3.2 3-6.2Z" fill="url(#av-m-core)"/></g>
    <path d="M32 33v3" stroke="#1c1917" stroke-width="1.4"/>
    <path d="M14 38h36c-1 8-8 13-18 13s-17-5-18-13Z" fill="url(#av-m-clay)" ${AV_STROKE}/>
    <path d="M14 38h36" stroke="#fdba74" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M20 44h24" stroke="#fbbf24" stroke-width="1.4" stroke-dasharray="1.6 2.4"/>` },
  'avatar-christmas': { tone: 'pine', art: `
    <circle cx="32" cy="20" r="8" fill="url(#av-m-ginger)" ${AV_STROKE}/>
    <path d="M24 29h16l9 5c2 1 2 4-.5 4.5L40 37l3 14c.5 2.5-2.5 3.5-4 1.5L32 45l-7 7.5c-1.5 2-4.5 1-4-1.5l3-14-8.5 1.5c-2.5-.5-2.5-3.5-.5-4.5Z" fill="url(#av-m-ginger)" ${AV_STROKE} stroke-linejoin="round"/>
    <circle cx="29" cy="19" r="1.2" fill="#1c0f06"/><circle cx="35" cy="19" r="1.2" fill="#1c0f06"/>
    <path d="M28 22.5c2.5 2 5.5 2 8 0" stroke="#fff" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="33" r="1.6" fill="#ef4444"/><circle cx="32" cy="38" r="1.6" fill="#22c55e"/><circle cx="32" cy="43" r="1.6" fill="#ef4444"/>
    <path d="M18 33.5l3 1.5 3-1.5M40 33.5l3 1.5 3-1.5M23 49l2 1.5M41 49l-2 1.5" stroke="#fff" stroke-width="1.2" stroke-linecap="round" fill="none"/>` },
  'avatar-christmas-earned': { tone: 'red', art: `
    <g transform="translate(0 6)">${AV_CROWN('gold')}${AV_CROWN_GEMS('#15803d')}</g>
    <path d="M14 27c4-10 14-16 25-14 7 1 12 7 13 14-3-3-7-5-11-5-9 0-18 3-27 5Z" fill="#dc2626" ${AV_STROKE}/>
    <path d="M13 28c9-3 19-5 28-5 4 0 8 1 11 4" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="52" cy="29" r="4.5" fill="#f8fafc" ${AV_STROKE}/>` },
  'avatar-newyear': { tone: 'night', animated: true, art: `
    <path d="M32 9v6" stroke="#94a3b8" stroke-width="1.4"/>
    <circle cx="32" cy="34" r="18" fill="url(#av-m-silver)" ${AV_STROKE}/>
    <g stroke="rgba(15,23,42,.35)" stroke-width=".9" fill="none"><ellipse cx="32" cy="34" rx="18" ry="6"/><ellipse cx="32" cy="34" rx="18" ry="12"/><path d="M14 34h36"/><ellipse cx="32" cy="34" rx="6" ry="18"/><ellipse cx="32" cy="34" rx="12" ry="18"/><path d="M32 16v36"/></g>
    <path d="M22 26h4v4h-4ZM34 22h4v4h-4ZM38 36h4v4h-4Z" fill="#fff" opacity=".85"/>
    <path d="M28 40h4v4h-4Z" fill="#c4b5fd" opacity=".8"/><path d="M40 28h4v4h-4Z" fill="#fde68a" opacity=".8"/>
    ${AV_SPARK(13, 16, 1, '#fde68a')}${AV_SPARK(52, 50, .9, '#f0abfc', 'av-twinkle av-twinkle-2')}${AV_SPARK(53, 15, .7, '#fff', 'av-twinkle av-twinkle-3')}` },
  'avatar-newyear-earned': { tone: 'purple', art: `
    <path d="M32 9 20 42h24Z" fill="url(#av-m-gold)" ${AV_STROKE} stroke-linejoin="round"/>
    <path d="M28.5 18.5 35 18M25.5 27 38.5 26.5M22.5 35.5 41.5 35" stroke="#7c3aed" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="32" cy="9.5" r="4" fill="#f472b6" ${AV_STROKE}/>
    <path d="M18 42h28" stroke="#fde68a" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M38 50l14-5" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/><path d="M52 45c3-1 5 1 4 3s-4 2-6 1" fill="none" stroke="#22d3ee" stroke-width="1.6"/>
    <path d="m34 48 4 2" stroke="#f472b6" stroke-width="3" stroke-linecap="round"/>
    <rect x="12" y="20" width="3" height="3" fill="#22d3ee" transform="rotate(20 13 21)"/><rect x="48" y="16" width="3" height="3" fill="#f472b6" transform="rotate(-20 49 17)"/><circle cx="14" cy="48" r="1.6" fill="#fde047"/><circle cx="50" cy="30" r="1.6" fill="#a3e635"/>` },
  'avatar-easter': { tone: 'pastel', animated: true, art: `
    <path d="M32 11c10 0 16 15 16 25 0 11-7 17-16 17s-16-6-16-17c0-10 6-25 16-25Z" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <path d="M17.5 32c3-2 5 2 8 0s5 2 8 0 5 2 8 0 4 1 5 0" stroke="#fff7d6" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M17 40h30" stroke="#b45309" stroke-width="1.6" stroke-dasharray="2 2.6"/>
    <ellipse cx="25" cy="23" rx="3" ry="6" fill="#fff" opacity=".55" transform="rotate(20 25 23)"/>
    ${AV_SPARK(49, 16, .9)}${AV_SPARK(14, 44, .7, '#fef3c7', 'av-twinkle av-twinkle-2')}` },
  'avatar-easter-earned': { tone: 'pastel', art: `
    <path d="M22 30c-4-9-4-18-1-21 3 1 6 9 7 19ZM42 30c4-9 4-18 1-21-3 1-6 9-7 19Z" fill="#f8fafc" ${AV_STROKE}/>
    <path d="M22.5 26c-2-6-2-11-.5-13 1.5 1.5 3.3 6 4 12ZM41.5 26c2-6 2-11 .5-13-1.5 1.5-3.3 6-4 12Z" fill="#fbcfe8"/>
    <ellipse cx="32" cy="40" rx="15" ry="13" fill="#f8fafc" ${AV_STROKE}/>
    <circle cx="26.5" cy="38" r="1.8" fill="#1e1b4b"/><circle cx="37.5" cy="38" r="1.8" fill="#1e1b4b"/>
    <path d="M30.5 42.5h3L32 44.5Z" fill="#f472b6"/><path d="M32 44.5v2M29 47c1.5 1 4.5 1 6 0" stroke="#94a3b8" stroke-width="1" fill="none" stroke-linecap="round"/>
    <circle cx="22.5" cy="44" r="2.4" fill="#fbcfe8" opacity=".8"/><circle cx="41.5" cy="44" r="2.4" fill="#fbcfe8" opacity=".8"/>
    <g transform="translate(32 25.5) scale(.3) translate(-32 -32)">${AV_CROWN('gold')}</g>` },
  'avatar-lunar': { tone: 'lacquer', animated: true, art: `
    <ellipse cx="32" cy="44" rx="13" ry="10" fill="url(#av-m-ivory)" ${AV_STROKE}/>
    <path d="M20 26l-2-9 7 5M44 26l2-9-7 5" fill="url(#av-m-ivory)" ${AV_STROKE} stroke-linejoin="round"/>
    <path d="M20.5 22.5 19.5 19l3 2.2M43.5 22.5l1-3.5-3 2.2" fill="#fda4af"/>
    <ellipse cx="32" cy="30" rx="13" ry="11" fill="url(#av-m-ivory)" ${AV_STROKE}/>
    <path d="M25 29c1.2-1.4 2.8-1.4 4 0M35 29c1.2-1.4 2.8-1.4 4 0" stroke="#1c1917" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M31 33h2l-1 1.2Z" fill="#f472b6"/><path d="M32 34.2c-1 1.4-2.6 1.4-3.4.6M32 34.2c1 1.4 2.6 1.4 3.4.6" stroke="#1c1917" stroke-width=".9" fill="none"/>
    <path d="M22 33.5l-5-.8M22 35l-5 .8M42 33.5l5-.8M42 35l5 .8" stroke="#94a3b8" stroke-width=".8"/>
    <path d="M22 40c4 2 16 2 20 0" stroke="#dc2626" stroke-width="3" stroke-linecap="round" fill="none"/>
    <circle cx="32" cy="43.5" r="2.6" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <g class="av-sway" style="transform-origin:46px 40px"><path d="M44 42c1-6 1-11 4-14 3 1 4 4 3 7l-2 7Z" fill="url(#av-m-ivory)" ${AV_STROKE}/></g>` },
  'avatar-lunar-earned': { tone: 'lacquer', animated: true, art: `
    <path d="M15 40c0-12 8-22 20-24 7-1 12 2 14 6l-6 3 7 4c-1 5-4 8-8 9l1 6c-4 2-9 1-12-2l-4 6c-5-1-10-4-12-8Z" fill="url(#av-m-gold)" ${AV_STROKE} stroke-linejoin="round"/>
    <path d="M26 17c-3-5-2-9 1-11 0 4 2 7 5 9M34 15c0-5 3-8 6-8-1 4-1 7 0 9" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <circle cx="37" cy="26" r="3" fill="#fff7d6"/><circle cx="37.6" cy="26" r="1.5" fill="#7f1d1d"/>
    <path d="M49 28c5 1 8 5 7 10M45 33c4 4 5 9 2 13" stroke="#fde68a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M18 34c4-2 7-2 10 0M18 40c4-2 7-2 10 0M20 46c3-1.5 6-1.5 8 0" stroke="#b45309" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M42 36.5h5" stroke="#7f1d1d" stroke-width="1.4" stroke-linecap="round"/>
    ${AV_SPARK(12, 16, .9, '#fde68a')}${AV_SPARK(54, 52, .8, '#fff7d6', 'av-twinkle av-twinkle-2')}` },
  'avatar-ramadan': { tone: 'moon', animated: true, art: `
    <path d="M32 7v5" stroke="#d4a017" stroke-width="1.4"/><circle cx="32" cy="12.5" r="2.6" fill="none" stroke="url(#av-m-gold)" stroke-width="1.6"/>
    <path d="M26 16h12l4 6H22Z" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <g class="av-flicker" style="transform-origin:32px 36px"><path d="M22 22h20l3 22H19Z" fill="#fbbf24" opacity=".9"/></g>
    <path d="M22 22h20l3 22H19Z M28.5 22 28 44M35.5 22l.5 22" fill="none" stroke="#78350f" stroke-width="2"/>
    <path d="M23 30l9-4 9 4M22 37l10-4 10 4" stroke="#78350f" stroke-width="1.3" fill="none"/>
    <path d="M16 44h32l-6 7H22Z" fill="url(#av-m-gold)" ${AV_STROKE}/><path d="M29 51l3 5 3-5Z" fill="url(#av-m-gold)"/>` },
  'avatar-ramadan-earned': { tone: 'moon', animated: true, art: `
    <circle cx="30" cy="32" r="21" fill="#fde68a" opacity=".12"/>
    <path d="M34 12A20 20 0 1 0 34 52 23 23 0 0 1 34 12Z" fill="url(#av-m-gold)" ${AV_STROKE}/>
    <path d="M24 20c-3 3-5 7-5 12" stroke="#fff" stroke-opacity=".5" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="m45 26 1.8 4.4 4.7.4-3.6 3 1.1 4.6-4-2.5-4 2.5 1.1-4.6-3.6-3 4.7-.4Z" fill="url(#av-m-gold)" ${AV_STROKE} stroke-linejoin="round"/>
    ${AV_SPARK(52, 14, .9, '#fef3c7')}${AV_SPARK(50, 50, .7, '#fff', 'av-twinkle av-twinkle-2')}` }
};
// ============================================================
// SEASONAL EVENTS
// Nine yearly events. Each sells one item per Shop section (table, card
// back, frame, burn, victory, picture, emotes) only while the event is on,
// plus an earn-only picture for winning 3 games during it. Anything bought
// or earned is kept forever. Ids are "<kind>-<event>", which is also what
// the Database Rules match on.
// ============================================================
const SEASONAL_PRICES = { cardBack: 300, frame: 300, avatar: 500, emotes: 500, burnEffect: 1000, tableTheme: 1500, victoryEffect: 1500, jokerEffect: 3000 };
const SEASONAL_BUNDLE_RATE = 0.75;
const SEASONAL_EARN_WINS = 3;
const SEASONAL_EVENTS = [
  { id: 'lunar', name: 'Lunar New Year', title: 'Year of Fortune', emoji: '🧧', when: 'From 3 days before Lunar New Year to the Lantern Festival', tones: ['#450a0a', '#dc2626', '#fbbf24'],
    names: { tableTheme: 'Lantern Festival', cardBack: 'Lucky Envelope', frame: 'Jade', burnEffect: 'Firecrackers', jokerEffect: 'Fortune Joker', victoryEffect: 'Dragon Dance', avatar: 'Lucky Cat', earned: 'Golden Dragon', emotes: 'Good Fortune' },
    burnIcon: '🧨', victoryIcon: '🐉', emotes: ['🧧', '🐉', '🏮', '🎆', '🍊', '🥟'],
    table: { base: '#991b1b', rim: 'inset 0 0 0 3px #fbbf24,inset 0 0 46px rgba(28,3,3,.65)', label: 'rgba(251,191,36,.85)' },
    frame: ['inset 0 0 0 1px #fde68a,inset 0 0 0 3px #10b981,0 0 9px rgba(16,185,129,.6)', '0 0 0 1px #10b981,0 0 5px rgba(251,191,36,.5)'], back: { color: '#b91c1c', ink: '#fbbf24', border: '#fbbf24' } },
  { id: 'valentine', name: "Valentine's", title: 'Love Is Blind', emoji: '💘', when: '1–16 February', tones: ['#4c0519', '#e11d48', '#fda4af'],
    names: { tableTheme: 'Candlelit Dinner', cardBack: 'Love Letter', frame: 'Rose Gold', burnEffect: 'Heartbreak', jokerEffect: 'Cupid Joker', victoryEffect: "Cupid's Arrows", avatar: 'Lovestruck Ace', earned: 'Queen of Roses', emotes: 'Sweethearts' },
    burnIcon: '💔', victoryIcon: '💘', emotes: ['💘', '😍', '💔', '🌹', '💌', '😘'],
    table: { base: '#7f1d3a', rim: 'inset 0 0 0 3px #d4a017,inset 0 0 50px rgba(26,0,7,.7)', label: 'rgba(253,164,175,.9)' },
    frame: ['inset 0 0 0 1px #fff1f2,inset 0 0 0 2px #e8a598,0 0 9px rgba(244,114,182,.6)', '0 0 0 1px #e8a598,0 0 5px rgba(244,114,182,.5)'], back: { color: '#fce7f3', ink: '#be123c', border: '#d4a017' } },
  { id: 'ramadan', name: 'Ramadan', title: 'Ramadan Kareem', emoji: '🌙', when: 'From the start of Ramadan to 3 days after Eid al-Fitr', tones: ['#0b1540', '#1e40af', '#fde68a'],
    names: { tableTheme: 'Crescent Night', cardBack: 'Arabesque', frame: 'Moonlight', burnEffect: 'Lantern Glow', jokerEffect: 'Lantern Joker', victoryEffect: 'Moonrise', avatar: 'Fanous Lantern', earned: 'Golden Crescent', emotes: 'Blessings' },
    burnIcon: '🏮', victoryIcon: '🌙', emotes: ['🌙', '✨', '🕌', '🤲', '🍵', '🍲'],
    table: { base: '#172554', rim: 'inset 0 0 0 3px #d4a017,inset 0 0 50px rgba(2,4,15,.7)', label: 'rgba(253,230,138,.85)' },
    frame: ['inset 0 0 0 1px #fef3c7,inset 0 0 0 2px #d4a017,0 0 10px rgba(191,219,254,.55)', '0 0 0 1px #fde68a,0 0 5px rgba(191,219,254,.5)'], back: { color: '#0b1540', ink: '#fde68a', border: '#fbbf24' } },
  { id: 'easter', name: 'Easter', title: 'Egg Hunt', emoji: '🐣', when: 'From 2 weeks before Easter Sunday to the Sunday after', tones: ['#4c1d95', '#a78bfa', '#fde68a'],
    names: { tableTheme: 'Spring Meadow', cardBack: 'Painted Egg', frame: 'Pastel Bloom', burnEffect: 'Egg Crack', jokerEffect: 'Egg Joker', victoryEffect: 'Egg Hunt', avatar: 'Golden Egg', earned: 'Bunny King', emotes: 'Springtime' },
    burnIcon: '🥚', victoryIcon: '🐣', emotes: ['🐣', '🐰', '🥚', '🌷', '🍫', '🐥'],
    table: { base: '#4ade80', rim: 'inset 0 0 0 3px #f5d0fe,inset 0 0 40px rgba(20,83,45,.35)', label: 'rgba(245,208,254,.95)' },
    frame: ['inset 0 0 0 1px #fdf4ff,inset 0 0 0 2px #c4b5fd,0 0 9px rgba(110,231,183,.6)', '0 0 0 1px #c4b5fd,0 0 5px rgba(110,231,183,.5)'], back: { color: '#fdf4ff', ink: '#a78bfa', border: '#a78bfa' } },
  { id: 'summer', name: 'Summer Holidays', title: 'Out of Office', emoji: '☀️', when: '1 July – 31 August', tones: ['#0e7490', '#f59e0b', '#fde68a'],
    names: { tableTheme: 'Beach Day', cardBack: 'Sunset Stripes', frame: 'Tropical', burnEffect: 'Cannonball', jokerEffect: 'Beach Joker', victoryEffect: 'Beach Ball Bounce', avatar: 'Ice Lolly', earned: 'Holiday Joker', emotes: 'Holiday Mode' },
    burnIcon: '💦', victoryIcon: '🏐', emotes: ['😎', '🏖️', '🍦', '🌊', '🍹', '🍉'],
    table: { base: '#f5d08a', rim: 'inset 0 0 0 3px #fff7ed,inset 0 0 40px rgba(120,53,15,.35)', label: 'rgba(255,247,237,.95)' },
    frame: ['inset 0 0 0 1px #ccfbf1,inset 0 0 0 2px #2dd4bf,0 0 9px rgba(250,204,21,.6)', '0 0 0 1px #2dd4bf,0 0 5px rgba(250,204,21,.5)'], back: { color: '#db2777', ink: '#fde68a', border: '#fde68a' } },
  { id: 'halloween', name: 'Halloween', title: 'Trick or Treat', emoji: '🎃', when: '15 October – 2 November', tones: ['#140a24', '#f97316', '#a3e635'],
    names: { tableTheme: 'Haunted Graveyard', cardBack: 'Cobweb', frame: "Witch's Brew", burnEffect: 'Ghost Flames', jokerEffect: 'Pumpkin Joker', victoryEffect: 'Bat Swarm', avatar: "Jack-o'-Lantern", earned: 'Skeleton King', emotes: 'Spooky' },
    burnIcon: '👻', victoryIcon: '🦇', emotes: ['🎃', '👻', '💀', '🦇', '🕷️', '🧟'],
    table: { base: '#2e1065', rim: 'inset 0 0 0 3px #f97316,inset 0 0 50px rgba(0,0,0,.7)', label: 'rgba(249,115,22,.85)' },
    frame: ['inset 0 0 0 1px #d9f99d,inset 0 0 0 3px #581c87,0 0 10px rgba(132,204,22,.65)', '0 0 0 1px #84cc16,0 0 5px rgba(132,204,22,.5)'], back: { color: '#0b0713', ink: '#cbd5e1', border: '#f97316' } },
  { id: 'diwali', name: 'Diwali', title: 'Festival of Lights', emoji: '🪔', when: 'The 7 days either side of Diwali', tones: ['#1e1b4b', '#f59e0b', '#ec4899'],
    names: { tableTheme: 'Rangoli', cardBack: 'Marigold Mandala', frame: 'Diya Glow', burnEffect: 'Colour Burst', jokerEffect: 'Diya Joker', victoryEffect: 'Lights of Diwali', avatar: 'Golden Lotus', earned: 'Eternal Flame', emotes: 'Celebration' },
    burnIcon: '🎨', victoryIcon: '🪔', emotes: ['🪔', '🎆', '🌸', '✨', '🍬', '🙏'],
    table: { base: '#312e81', rim: 'inset 0 0 0 3px #f59e0b,inset 0 0 50px rgba(11,10,36,.65)', label: 'rgba(253,186,116,.9)' },
    frame: ['inset 0 0 0 1px #fef3c7,inset 0 0 0 2px #f59e0b,0 0 10px rgba(249,115,22,.7)', '0 0 0 1px #f59e0b,0 0 5px rgba(249,115,22,.55)'], back: { color: '#7c2d12', ink: '#fbbf24', border: '#fbbf24' } },
  { id: 'christmas', name: 'Christmas', title: 'Deck the Halls', emoji: '🎄', when: '1–26 December', tones: ['#14532d', '#dc2626', '#fde68a'],
    names: { tableTheme: 'Fireside', cardBack: 'Candy Cane', frame: 'Tinsel', burnEffect: 'Present Pop', jokerEffect: 'Santa Joker', victoryEffect: 'Sleigh Ride', avatar: 'Gingerbread Joker', earned: "Santa's Crown", emotes: 'Festive' },
    burnIcon: '🎁', victoryIcon: '🛷', emotes: ['🎄', '🎅', '❄️', '🎁', '⛄', '🦌'],
    table: { base: '#5c2c10', rim: 'inset 0 0 0 3px #dc2626,inset 0 0 0 5px #fde68a,inset 0 0 46px rgba(20,8,3,.7)', label: 'rgba(254,240,138,.9)' },
    frame: ['inset 0 0 0 1px #fde68a,inset 0 0 0 3px #dc2626,0 0 9px rgba(250,204,21,.65)', '0 0 0 1px #dc2626,0 0 5px rgba(250,204,21,.55)'], back: { color: '#f8fafc', ink: '#dc2626', border: '#15803d' } },
  { id: 'newyear', name: "New Year's", title: 'Happy New Year', emoji: '🎆', when: '27 December – 7 January', tones: ['#020617', '#d4a017', '#fde68a'],
    names: { tableTheme: 'Midnight Skyline', cardBack: 'Black Tie', frame: 'Gold Fizz', burnEffect: 'Champagne Pop', jokerEffect: 'Midnight Joker', victoryEffect: 'Countdown', avatar: 'Disco Ball', earned: 'Party Joker', emotes: 'Cheers' },
    burnIcon: '🍾', victoryIcon: '🎆', emotes: ['🥂', '🎆', '🎉', '🕛', '🍾', '✨'],
    table: { base: '#1e1b4b', rim: 'inset 0 0 0 3px #d4a017,inset 0 0 50px rgba(0,0,0,.7)', label: 'rgba(253,230,138,.85)' },
    frame: ['inset 0 0 0 1px #fff7d6,inset 0 0 0 2px #d4a017,0 0 10px rgba(253,230,138,.7)', '0 0 0 1px #d4a017,0 0 5px rgba(253,230,138,.55)'], back: { color: '#0a0a0a', ink: '#d4a017', border: '#d4a017' } }
];
const SEASONAL_EVENT_BY_ID = Object.fromEntries(SEASONAL_EVENTS.map(ev => [ev.id, ev]));
const SEASONAL_KIND_PREFIX = { tableTheme: 'table', cardBack: 'back', frame: 'frame', burnEffect: 'burn', victoryEffect: 'victory', avatar: 'avatar', emotes: 'emotes', jokerEffect: 'joker' };
const SEASONAL_TYPE_CATEGORY = Object.freeze({ cardBack: 'Card Backs', frame: 'Frames', emotes: 'Emote Packs', tableTheme: 'Table Themes', burnEffect: 'Burn Effects', victoryEffect: 'Victory Effects', avatar: 'Avatars', jokerEffect: 'Joker Effects' });
const seasonalItemId = (type, eventId) => `${SEASONAL_KIND_PREFIX[type]}-${eventId}`;
const seasonalIdsOf = (type) => SEASONAL_EVENTS.map(ev => seasonalItemId(type, ev.id));
const SEASONAL_BACK_IDS = new Set(seasonalIdsOf('cardBack'));
const SEASONAL_SHOP_ITEMS = SEASONAL_EVENTS.flatMap(ev => Object.keys(SEASONAL_PRICES).map(type => ({
  id: seasonalItemId(type, ev.id), category: SEASONAL_TYPE_CATEGORY[type], name: ev.names[type], cost: SEASONAL_PRICES[type], season: ev.id, tones: ev.tones,
  ...(type === 'avatar' && SEASONAL_AVATAR_ART[seasonalItemId(type, ev.id)]?.animated ? { animated: true } : {})
})));
const SEASONAL_EARNED_AVATARS = SEASONAL_EVENTS.map(ev => ({
  id: `avatar-${ev.id}-earned`, category: 'Avatars', name: ev.names.earned, earned: true, season: ev.id,
  animated: !!SEASONAL_AVATAR_ART[`avatar-${ev.id}-earned`]?.animated,
  requirement: `Win ${SEASONAL_EARN_WINS} games during ${ev.name}`,
  isEarned: (u) => seasonalWinsFor(u?.seasonWins, ev.id) >= SEASONAL_EARN_WINS
}));
// Wins are counted per event instance ("halloween-2026"); any single
// instance reaching the target earns the picture.
function seasonalWinsFor(seasonWins, eventId) {
  return Math.max(0, ...Object.entries(seasonWins || {}).filter(([key]) => key.startsWith(`${eventId}-`)).map(([, n]) => Number(n) || 0));
}

// ---- Dates ----------------------------------------------------------
// Movable events use known dates (Diwali: Lakshmi Puja; Lunar New Year:
// first day of the lunar year; Ramadan: 1 Ramadan and Eid al-Fitr, Umm
// al-Qura). Later years fall back to the browser's own calendars.
const DIWALI_DATES = { 2026: '11-08', 2027: '10-29', 2028: '10-17', 2029: '11-05', 2030: '10-26', 2031: '11-14', 2032: '11-02', 2033: '10-22', 2034: '11-10', 2035: '10-30', 2036: '10-19', 2037: '11-07', 2038: '10-27', 2039: '10-17', 2040: '11-04' };
const LUNAR_NEW_YEAR_DATES = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08', 2036: '01-28', 2037: '02-15', 2038: '02-04', 2039: '01-24', 2040: '02-12' };
const RAMADAN_DATES = [['2026-02-18', '2026-03-20'], ['2027-02-08', '2027-03-09'], ['2028-01-28', '2028-02-26'], ['2029-01-16', '2029-02-14'], ['2030-01-05', '2030-02-04'], ['2030-12-26', '2031-01-24'], ['2031-12-16', '2032-01-14'], ['2032-12-04', '2033-01-03'], ['2033-11-23', '2033-12-23'], ['2034-11-12', '2034-12-12'], ['2035-11-01', '2035-12-01'], ['2036-10-21', '2036-11-19'], ['2037-10-10', '2037-11-09'], ['2038-09-30', '2038-10-29'], ['2039-09-19', '2039-10-19'], ['2040-09-08', '2040-10-07']];
const seasonDate = (y, m, d) => new Date(y, m - 1, d);
const seasonAddDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const seasonParse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return seasonDate(y, m, d); };
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return seasonDate(year, month, day);
}
// First local date in [from, to) whose calendar parts satisfy test.
function seasonFindCalendarDay(calendar, from, to, test) {
  try {
    const fmt = new Intl.DateTimeFormat(`en-u-ca-${calendar}`, { month: 'numeric', day: 'numeric' });
    for (let d = from; d < to; d = seasonAddDays(d, 1)) {
      const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
      if (test(parts)) return d;
    }
  } catch (e) {}
  return null;
}
// Every window [start, end] (both whole local days) of an event that
// starts in the given year.
function seasonalWindowsForYear(eventId, year) {
  switch (eventId) {
    case 'valentine': return [[seasonDate(year, 2, 1), seasonDate(year, 2, 16)]];
    case 'summer': return [[seasonDate(year, 7, 1), seasonDate(year, 8, 31)]];
    case 'halloween': return [[seasonDate(year, 10, 15), seasonDate(year, 11, 2)]];
    case 'christmas': return [[seasonDate(year, 12, 1), seasonDate(year, 12, 26)]];
    case 'newyear': return [[seasonDate(year, 12, 27), seasonDate(year + 1, 1, 7)]];
    case 'easter': { const e = easterSunday(year); return [[seasonAddDays(e, -14), seasonAddDays(e, 7)]]; }
    case 'diwali': {
      const md = DIWALI_DATES[year];
      if (!md) return [];
      const day = seasonParse(`${year}-${md}`);
      return [[seasonAddDays(day, -7), seasonAddDays(day, 7)]];
    }
    case 'lunar': {
      const md = LUNAR_NEW_YEAR_DATES[year];
      const day = md ? seasonParse(`${year}-${md}`) : seasonFindCalendarDay('chinese', seasonDate(year, 1, 15), seasonDate(year, 2, 25), p => p.month === '1' && p.day === '1');
      return day ? [[seasonAddDays(day, -3), seasonAddDays(day, 14)]] : [];
    }
    case 'ramadan': {
      const known = RAMADAN_DATES.filter(([start]) => start.startsWith(`${year}-`));
      if (known.length || year <= 2040) return known.map(([start, eid]) => [seasonParse(start), seasonAddDays(seasonParse(eid), 3)]);
      const out = [];
      let from = seasonDate(year, 1, 1);
      while (from < seasonDate(year + 1, 1, 1)) {
        const start = seasonFindCalendarDay('islamic-umalqura', from, seasonDate(year + 1, 1, 1), p => p.month === '9' && p.day === '1');
        if (!start) break;
        const eid = seasonFindCalendarDay('islamic-umalqura', seasonAddDays(start, 27), seasonAddDays(start, 32), p => p.month === '10' && p.day === '1') || seasonAddDays(start, 30);
        out.push([start, seasonAddDays(eid, 3)]);
        from = seasonAddDays(start, 300);
      }
      return out;
    }
    default: return [];
  }
}
// Test hook / Shop testing: pretend "now" is a different date.
let seasonalNowOverride = null;
const seasonalNow = () => seasonalNowOverride ? new Date(seasonalNowOverride) : new Date();
function seasonalWindowsAround(now = seasonalNow()) {
  const year = now.getFullYear();
  return SEASONAL_EVENTS.flatMap(event => [year - 1, year, year + 1].flatMap(y => seasonalWindowsForYear(event.id, y).map(([start, end]) => ({
    event, start, end, endsAt: seasonAddDays(end, 1), key: `${event.id}-${start.getFullYear()}`
  }))));
}
function activeSeasonalEvents(now = seasonalNow()) {
  return seasonalWindowsAround(now).filter(w => now >= w.start && now < w.endsAt).sort((a, b) => a.endsAt - b.endsAt);
}
function nextSeasonalEvent(now = seasonalNow()) {
  return seasonalWindowsAround(now).filter(w => w.start > now).sort((a, b) => a.start - b.start)[0] || null;
}
const seasonDaysBetween = (a, b) => Math.max(0, Math.ceil((b - a) / 864e5));
// The AmitK test account can buy every event's items at any time (Shop
// spending only — see CLAUDE.md). Earning and gameplay are unchanged.
function seasonalShopTestAccess() {
  return !!currentUser && typeof isAmitkTestingAccount === 'function' && isAmitkTestingAccount({});
}
function isSeasonalEventActive(eventId, now = seasonalNow()) {
  return activeSeasonalEvents(now).some(w => w.event.id === eventId);
}
function isSeasonalItemBuyable(item) {
  if (!item?.season) return true;
  return seasonalShopTestAccess() || isSeasonalEventActive(item.season);
}
// Custom only lists seasonal items you own, or can buy right now.
function isCosmeticListed(item) {
  if (!item?.season) return true;
  return !!cosmeticPurchaseState[item.id] || isSeasonalItemBuyable(item);
}
function seasonalBundleFor(eventId) {
  const items = sortByValue(COSMETIC_SHOP_ITEMS.filter(item => item.season === eventId && !cosmeticPurchaseState[item.id]));
  const full = items.reduce((sum, item) => sum + item.cost, 0);
  return { items, full, price: Math.round((full * SEASONAL_BUNDLE_RATE) / 10) * 10 };
}
// Register the seasonal art with the existing renderers: illustrated
// tables, picture art, emote packs, shape burns, card backs and frames.
const SEASONAL_TABLE_ART = {
  "valentine": "art/tables/season-valentine.svg",
  "summer": "art/tables/season-summer.svg",
  "halloween": "art/tables/season-halloween.svg",
  "diwali": "art/tables/season-diwali.svg",
  "christmas": "art/tables/season-christmas.svg",
  "newyear": "art/tables/season-newyear.svg",
  "easter": "art/tables/season-easter.svg",
  "lunar": "art/tables/season-lunar.svg",
  "ramadan": "art/tables/season-ramadan.svg"
};
const SEASONAL_BACK_ART = {
  "valentine": "art/backs/valentine.svg",
  "summer": "art/backs/summer.svg",
  "halloween": "art/backs/halloween-cobweb.webp?v=257", // the owner's Cobweb art (v257)
  "diwali": "art/backs/diwali.svg",
  "christmas": "art/backs/christmas.svg",
  "newyear": "art/backs/newyear.svg",
  "easter": "art/backs/easter.svg",
  "lunar": "art/backs/lunar.svg",
  "ramadan": "art/backs/ramadan.svg"
};
SEASONAL_EVENTS.forEach(ev => {
  TABLE_ART[`season-${ev.id}`] = SEASONAL_TABLE_ART[ev.id];
  ILLUSTRATED_TABLES[`table-${ev.id}`] = { art: `season-${ev.id}`, ...ev.table };
  EMOTE_PACKS[`emotes-${ev.id}`] = ev.emotes;
  SHAPE_BURN_EFFECTS.add(`burn-${ev.id}`);
});
Object.assign(AVATAR_ART, SEASONAL_AVATAR_ART);
(function installSeasonalCosmeticStyles() {
  const css = SEASONAL_EVENTS.map(ev => {
    const b = ev.back, [inner, outer] = ev.frame;
    return `.cosmetic-back-${ev.id} { background:url("${SEASONAL_BACK_ART[ev.id]}") center/cover no-repeat, ${b.color} !important; color:${b.ink}; }\n` +
      `.custom-card-back.cosmetic-back-${ev.id} { border-color:${b.border} !important; }\n` +
      `.custom-card-back.cosmetic-back-${ev.id}::before, .custom-card-back.cosmetic-back-${ev.id}::after { display:none; }\n` +
      `.cosmetic-back-${ev.id} > svg { opacity:0; }\n` +
      `body[data-equipped-frame="frame-${ev.id}"] :is(.card-base,.card-table,.custom-card-back):not(.opponent-cosmetic-card) { box-shadow:${inner},0 3px 8px rgba(0,0,0,.5) !important; }`;
  }).join('\n');
  const style = document.createElement('style');
  style.id = 'seasonalCosmeticStyles';
  style.textContent = css;
  document.head.appendChild(style);
})();
const SEASONAL_FRAME_STYLES = Object.fromEntries(SEASONAL_EVENTS.map(ev => [`frame-${ev.id}`, ev.frame]));
// ============================================================
// SEASONAL EFFECTS — burns (on the pile) and victories (full screen),
// drawn with the same bfxAdd/bfxAnimate helpers as the shape effects.
// ============================================================
const SFX_HEART = 'M50 88C22 66 6 52 6 34 6 20 17 10 30 10c9 0 15 5 20 12 5-7 11-12 20-12 13 0 24 10 24 24 0 18-16 32-44 54Z';
const sfxSvg = (w, h, body, vb = `0 0 ${w} ${h}`) => `<svg width="100%" height="100%" viewBox="${vb}">${body}</svg>`;
const sfxDot = (c, glow = true) => `<div style="width:100%;height:100%;border-radius:50%;background:${c};${glow ? `box-shadow:0 0 6px ${c}` : ''}"></div>`;
// Particles thrown out from (x, y) and pulled down by gravity.
function sfxThrow(host, x, y, k, count, make, opt = {}) {
  const { speed = [90, 170], gravity = 260, spin = 360, dur = [1100, 1500], up = true, delay = [0, 160], spread = 1 } = opt;
  for (let i = 0; i < count; i++) {
    const [html, w, h] = make(i);
    const el = bfxAdd(host, html, x, y, w * k, h * k);
    const a = up ? bfxRand(-Math.PI * (.5 + .45 * spread), -Math.PI * (.5 - .45 * spread)) : bfxRand(0, Math.PI * 2);
    const v = bfxRand(speed[0], speed[1]) * k, g = gravity * k, r0 = bfxRand(-30, 30), r1 = bfxRand(-spin, spin);
    bfxAnimate(el, [0, .2, .4, .6, .8, 1].map(t => ({
      transform: `translate(${Math.cos(a) * v * t * 1.2}px, ${Math.sin(a) * v * t * 1.2 + g * t * t}px) rotate(${r0 + r1 * t}deg) scale(${t === 0 ? .4 : 1})`,
      opacity: t < .75 ? 1 : 1 - (t - .75) * 4
    })), { duration: bfxRand(dur[0], dur[1]), delay: bfxRand(delay[0], delay[1]), easing: 'linear' });
  }
}
// Things that float upwards with a gentle sway.
function sfxRise(host, x, y, k, count, make, opt = {}) {
  const { rise = [120, 220], sway = 18, dur = [1400, 1900], spreadX = 50, delay = [0, 400] } = opt;
  for (let i = 0; i < count; i++) {
    const [html, w, h] = make(i);
    const el = bfxAdd(host, html, x + bfxRand(-spreadX, spreadX) * k, y + bfxRand(-6, 10) * k, w * k, h * k);
    const r = bfxRand(rise[0], rise[1]) * k, s = bfxRand(-sway, sway) * k;
    bfxAnimate(el, [
      { transform: 'translate(0,0) scale(.5)', opacity: 0 },
      { transform: `translate(${s}px, ${-r * .25}px) scale(1)`, opacity: 1, offset: .2 },
      { transform: `translate(${-s}px, ${-r * .6}px) scale(1)`, opacity: 1, offset: .6 },
      { transform: `translate(${s * .5}px, ${-r}px) scale(.9)`, opacity: 0 }
    ], { duration: bfxRand(dur[0], dur[1]), delay: bfxRand(delay[0], delay[1]), easing: 'ease-out' });
  }
}
function sfxFlash(host, x, y, k, colour, size = 110, dur = 600, delay = 0) {
  const el = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,${colour},transparent 68%)"></div>`, x, y, size * k, size * k);
  bfxAnimate(el, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: dur, delay, easing: 'ease-out' });
}
function sfxPop(host, html, x, y, w, h, keyframes, duration, delay = 0) {
  const el = bfxAdd(host, html, x, y, w, h);
  bfxAnimate(el, keyframes, { duration, delay, easing: 'ease-out' });
  return el;
}
const sfxHeartSvg = (c) => sfxSvg(100, 100, `<path d="${SFX_HEART}" fill="${c}"/>`);
const sfxStar = (c) => sfxSvg(20, 20, `<path d="M10 0 12.5 7.5 20 10 12.5 12.5 10 20 7.5 12.5 0 10 7.5 7.5Z" fill="${c}"/>`);
const sfxLantern = (glow = '#fbbf24') => sfxSvg(40, 60, `<circle cx="20" cy="30" r="19" fill="${glow}" opacity=".25"/><path d="M14 6h12l4 7H10Z" fill="#d4a017"/><path d="M10 13h20l3 28H7Z" fill="${glow}"/><path d="M10 13h20l3 28H7ZM16 13l-1 28M24 13l1 28M9 26h22" fill="none" stroke="#78350f" stroke-width="1.6"/><path d="M5 41h30l-6 8H11Z" fill="#d4a017"/><path d="M17 49l3 6 3-6Z" fill="#d4a017"/>`);
const sfxRedLantern = sfxSvg(40, 60, `<circle cx="20" cy="30" r="20" fill="#fbbf24" opacity=".22"/><rect x="13" y="6" width="14" height="5" rx="1.5" fill="#fbbf24"/><ellipse cx="20" cy="28" rx="16" ry="17" fill="#dc2626"/><path d="M11 14c-4 9-4 19 0 28M20 11v34M29 14c4 9 4 19 0 28" stroke="#fbbf24" stroke-width="1.2" fill="none"/><rect x="13" y="44" width="14" height="5" rx="1.5" fill="#fbbf24"/><path d="M20 49v10" stroke="#fbbf24" stroke-width="1.5"/>`);
const sfxPaintedEgg = (a, b, c) => sfxSvg(40, 52, `<path d="M20 2C30 2 37 18 37 30 37 42 29 50 20 50S3 42 3 30C3 18 10 2 20 2Z" fill="${a}" stroke="rgba(0,0,0,.2)"/><path d="M4 26l4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4" stroke="${b}" stroke-width="3" fill="none"/><path d="M4 36h32" stroke="${c}" stroke-width="3"/><ellipse cx="13" cy="14" rx="3" ry="6" fill="#fff" opacity=".45"/>`);
const SFX_PASTELS = [['#fbcfe8', '#a78bfa', '#38bdf8'], ['#fef08a', '#f472b6', '#22c55e'], ['#bfdbfe', '#f59e0b', '#ec4899'], ['#ddd6fe', '#10b981', '#f472b6'], ['#bbf7d0', '#8b5cf6', '#f59e0b']];
const sfxFlower = (c) => sfxSvg(24, 24, `${[0, 72, 144, 216, 288].map(r => `<ellipse cx="12" cy="6" rx="4" ry="6" fill="${c}" transform="rotate(${r} 12 12)"/>`).join('')}<circle cx="12" cy="12" r="3.5" fill="#fde047"/>`);
// A real-looking bat: membrane wing (scalloped trailing edge between the
// finger bones, thumb claw at the wrist) and a furry body with ears,
// snout and glowing eyes. The same wing is mirrored for the right side.
const RBAT_WING = '<svg viewBox="0 0 60 36" preserveAspectRatio="none"><defs><linearGradient id="rbatMem" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c2f6b"/><stop offset=".55" stop-color="#27163d"/><stop offset="1" stop-color="#150b22"/></linearGradient></defs>'
  + '<path d="M60 9C52 4 44 1 34 1 26 1 18 3 11 6 6 8 2 11 0 15 4 15 7 17 9 21 12 17 17 16 21 20 23 15 29 14 32 19 35 14 41 13 44 18 47 14 53 13 60 17Z" fill="url(#rbatMem)" stroke="#6d4a8f" stroke-width=".7" stroke-linejoin="round"/>'
  + '<path d="M60 10L34 2M34 2L0 15M34 2L9 21M34 2L21 20M36 3L32 19M44 5L44 18" stroke="#8b6aa8" stroke-width="1.1" stroke-linecap="round" fill="none" opacity=".75"/>'
  + '<path d="M34 2l-2.2-1.6" stroke="#d6c8e6" stroke-width="1.2" stroke-linecap="round"/></svg>';
const RBAT_BODY = '<svg viewBox="0 0 20 40"><defs><radialGradient id="rbatFur" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#4b3462"/><stop offset=".6" stop-color="#241535"/><stop offset="1" stop-color="#140b1f"/></radialGradient></defs>'
  + '<path d="M4.2 4 5.8 11 8.4 9.6ZM15.8 4 14.2 11 11.6 9.6Z" fill="#241535" stroke="#6d4a8f" stroke-width=".6" stroke-linejoin="round"/>'
  + '<ellipse cx="10" cy="24" rx="5.6" ry="11" fill="url(#rbatFur)"/>'
  + '<circle cx="10" cy="12" r="5" fill="url(#rbatFur)"/>'
  + '<path d="M8.6 15.2 10 17 11.4 15.2Z" fill="#140b1f"/>'
  + '<circle cx="8" cy="11.6" r="1.3" fill="#fb923c"/><circle cx="12" cy="11.6" r="1.3" fill="#fb923c"/>'
  + '<circle cx="8.3" cy="11.3" r=".4" fill="#fff7d6"/><circle cx="12.3" cy="11.3" r=".4" fill="#fff7d6"/>'
  + '<path d="M7 30 6.2 36M13 30 13.8 36" stroke="#241535" stroke-width="1.2" stroke-linecap="round"/></svg>';
const realBatHtml = (flap, delay) => `<div class="rbat" style="--flap:${flap}s;--flap-delay:${delay}s"><div class="rbat-wing l">${RBAT_WING}</div><div class="rbat-wing r">${RBAT_WING}</div><div class="rbat-body">${RBAT_BODY}</div></div>`;

// ----- Burns -----
function sbfxValentine(host, x, y, k) {
  const size = 96 * k;
  const whole = sfxPop(host, sfxHeartSvg('#e11d48'), x, y, size, size, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1.15)', opacity: 1, offset: .5 }, { transform: 'scale(1)', opacity: 1 }], 380);
  setTimeout(() => {
    whole.remove();
    if (!host.isConnected) return;
    [[-1, 'inset(0 50% 0 0)'], [1, 'inset(0 0 0 50%)']].forEach(([dir, clip]) => {
      const half = bfxAdd(host, `<div style="position:relative;width:100%;height:100%;clip-path:${clip}">${sfxHeartSvg('#e11d48')}<div style="position:absolute;inset:0">${sfxSvg(100, 100, '<path d="M50 22 44 36 55 46 45 58 54 70 50 88" stroke="#4c0519" stroke-width="3" fill="none"/>')}</div></div>`, x, y, size, size);
      bfxAnimate(half, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${dir * 6 * k}px,0) rotate(${dir * 8}deg)`, opacity: 1, offset: .2 }, { transform: `translate(${dir * 60 * k}px, ${140 * k}px) rotate(${dir * 50}deg)`, opacity: 0 }], { duration: 1100, easing: 'ease-in' });
    });
    sfxThrow(host, x, y, k, 18, i => [sfxHeartSvg(['#fb7185', '#f43f5e', '#fda4af', '#be123c'][i % 4]), bfxRand(12, 22), bfxRand(12, 22)], { speed: [110, 190], gravity: 200, spin: 90 });
  }, 480);
  sfxFlash(host, x, y, k, 'rgba(251,113,133,.7)', 150, 700, 460);
}
function sbfxSummer(host, x, y, k) {
  sfxFlash(host, x, y, k, 'rgba(186,230,253,.85)', 140, 600);
  for (let i = 0; i < 2; i++) {
    const ring = bfxAdd(host, '<div style="width:100%;height:100%;border-radius:50%;border:3px solid rgba(224,242,254,.9)"></div>', x, y + 10 * k, 60 * k, 22 * k);
    bfxAnimate(ring, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(3.2)', opacity: 0 }], { duration: 1000, delay: i * 220, easing: 'ease-out' });
  }
  const drop = c => sfxSvg(20, 28, `<path d="M10 1C14 9 18 14 18 19a8 8 0 0 1-16 0c0-5 4-10 8-18Z" fill="${c}"/><ellipse cx="7" cy="18" rx="2" ry="4" fill="#fff" opacity=".6"/>`);
  sfxThrow(host, x, y, k, 30, i => [drop(['#38bdf8', '#7dd3fc', '#0ea5e9', '#e0f2fe'][i % 4]), bfxRand(8, 16), bfxRand(11, 22)], { speed: [120, 230], gravity: 330, spin: 30, spread: .7 });
}
// Ghost Flames: the owner's approved art brought to life in WebGL (art/burns/level-3d/burns3d.js):
// the wraith rises from spectral fire and strikes, and the real pile cards are torn away burning.
function sbfxHalloween(host, x, y, k) {
  const cardEls = host.id === 'burnFxLayer' ? [...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')] : [];
  if (window.ShLevel3D && ShLevel3D.play('burn-halloween', host, x, y, k, false, { cardEls, backClass: burnBackClass() })) return;
  sfxFlash(host, x, y, k, '#a78bfa', 160, 800);
}
function sbfxDiwali(host, x, y, k) {
  const colours = ['#ec4899', '#f97316', '#facc15', '#22c55e', '#a855f7', '#06b6d4', '#ef4444'];
  for (let i = 0; i < 22; i++) {
    const c = colours[i % colours.length], size = bfxRand(40, 80) * k, a = (i / 22) * Math.PI * 2 + bfxRand(-.2, .2), d = bfxRand(50, 120) * k;
    const el = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:50%;filter:blur(${6 * k}px);background:radial-gradient(circle,${c},${c}99 45%,transparent 70%)"></div>`, x, y, size, size);
    bfxAnimate(el, [{ transform: 'translate(0,0) scale(.2)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d * .6}px, ${Math.sin(a) * d * .6}px) scale(1)`, opacity: .95, offset: .3 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 20 * k}px) scale(1.8)`, opacity: 0 }], { duration: bfxRand(1300, 1700), delay: bfxRand(0, 120), easing: 'cubic-bezier(.2,.7,.3,1)' });
  }
  sfxThrow(host, x, y, k, 16, () => [sfxDot('#fde68a'), 4, 4], { up: false, speed: [70, 140], gravity: 60, dur: [700, 1000], delay: [100, 300] });
}
function sbfxChristmas(host, x, y, k) {
  const w = 70 * k;
  const box = sfxSvg(70, 70, '<rect x="6" y="24" width="58" height="44" rx="3" fill="#dc2626"/><rect x="30" y="24" width="10" height="44" fill="#fde047"/><rect x="6" y="40" width="58" height="8" fill="#fde047" opacity=".9"/>');
  const lid = sfxSvg(70, 40, '<rect x="2" y="16" width="66" height="14" rx="3" fill="#b91c1c"/><rect x="30" y="16" width="10" height="14" fill="#fde047"/><path d="M35 16C28 4 16 4 18 12c2 5 10 5 17 4ZM35 16c7-12 19-12 17-4-2 5-10 5-17 4Z" fill="#fde047" stroke="#ca8a04"/>');
  const b = sfxPop(host, box, x, y, w, w, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1.1)', offset: .25 }, { transform: 'scale(1) rotate(-5deg)', offset: .45 }, { transform: 'scale(1) rotate(5deg)', offset: .6 }, { transform: 'scale(1) rotate(-4deg)', offset: .75 }, { transform: 'scale(1.1)', opacity: 1, offset: .9 }, { transform: 'scale(1.3)', opacity: 0 }], 1100);
  const l = sfxPop(host, lid, x, y - 26 * k, w, w * .57, [{ transform: 'translate(0,0) scale(0)', opacity: 1 }, { transform: 'translate(0,0) scale(1.1)', offset: .15 }, { transform: 'translate(0,0) scale(1)', opacity: 1, offset: .4 }, { transform: `translate(${30 * k}px, ${-150 * k}px) rotate(200deg)`, opacity: 0 }], 1500);
  setTimeout(() => {
    if (!host.isConnected) return;
    sfxFlash(host, x, y, k, 'rgba(254,240,138,.9)', 150, 600);
    const ribbon = c => sfxSvg(10, 40, `<path d="M5 0C11 6-1 12 5 18S-1 30 5 40" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    sfxThrow(host, x, y, k, 14, i => [ribbon(['#dc2626', '#fde047', '#16a34a', '#f8fafc'][i % 4]), 8, 32], { speed: [120, 200], gravity: 240 });
    sfxThrow(host, x, y, k, 16, () => [sfxSvg(20, 20, '<path d="M10 0V20M0 10H20M3 3 17 17M17 3 3 17" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'), 12, 12], { speed: [60, 150], gravity: 60, dur: [1300, 1700] });
  }, 560);
}
function sbfxNewYear(host, x, y, k) {
  const cork = sfxSvg(20, 26, '<path d="M4 2h12l-2 20H6Z" fill="#b45309"/><path d="M4 2h12" stroke="#fde68a" stroke-width="2"/><path d="M7 8h6M7 13h6M7 18h6" stroke="#78350f" stroke-width="1"/>');
  sfxPop(host, cork, x, y, 16 * k, 21 * k, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${10 * k}px, ${-200 * k}px) rotate(540deg)`, opacity: 1, offset: .7 }, { transform: `translate(${14 * k}px, ${-230 * k}px) rotate(700deg)`, opacity: 0 }], 900);
  sfxFlash(host, x, y, k, 'rgba(253,230,138,.95)', 120, 500);
  sfxThrow(host, x, y, k, 34, () => [sfxDot(Math.random() < .5 ? '#fde68a' : '#fff7d6'), 5, 5], { speed: [140, 240], gravity: 260, spread: .35, dur: [900, 1300] });
  const bubble = sfxSvg(20, 20, '<circle cx="10" cy="10" r="8" fill="rgba(253,230,138,.55)" stroke="#fff7d6" stroke-width="1.5"/><circle cx="7" cy="7" r="2" fill="#fff" opacity=".8"/>');
  sfxRise(host, x, y, k, 18, () => { const d = bfxRand(8, 16); return [bubble, d, d]; }, { rise: [110, 200], dur: [1300, 1800], delay: [100, 600], spreadX: 34 });
}
function sbfxEaster(host, x, y, k) {
  const [a, b, c] = SFX_PASTELS[Math.floor(Math.random() * SFX_PASTELS.length)];
  const egg = sfxPaintedEgg(a, b, c);
  const w = 56 * k, h = 72 * k;
  sfxPop(host, `<div style="width:100%;height:100%;clip-path:inset(46% 0 0 0)">${egg}</div>`, x, y, w, h, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1.05) rotate(-8deg)', offset: .3 }, { transform: 'scale(1) rotate(8deg)', offset: .45 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .9 }, { opacity: 0 }], 1700);
  sfxPop(host, `<div style="width:100%;height:100%;clip-path:inset(0 0 54% 0)">${egg}</div>`, x, y, w, h, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1.05) rotate(-8deg)', offset: .18 }, { transform: 'scale(1) rotate(8deg)', offset: .27 }, { transform: 'translate(0,0) rotate(0)', opacity: 1, offset: .36 }, { transform: `translate(${-26 * k}px, ${-110 * k}px) rotate(-120deg)`, opacity: 0 }], 1500);
  const chick = sfxSvg(40, 40, '<circle cx="20" cy="22" r="14" fill="#fde047" stroke="#ca8a04"/><circle cx="15" cy="19" r="2" fill="#1c1917"/><circle cx="25" cy="19" r="2" fill="#1c1917"/><path d="M17 24h6l-3 4Z" fill="#f97316"/><path d="M18 8c1 3 1 5 2 8M22 8c-1 3-1 5-2 8" stroke="#ca8a04" stroke-width="1.5" fill="none"/>');
  sfxPop(host, chick, x, y - 4 * k, 40 * k, 40 * k, [{ transform: 'translateY(10px) scale(0)', opacity: 0 }, { transform: 'translateY(10px) scale(0)', opacity: 0, offset: .3 }, { transform: `translateY(${-26 * k}px) scale(1.1)`, opacity: 1, offset: .45 }, { transform: `translateY(${-16 * k}px) scale(1)`, opacity: 1, offset: .6 }, { transform: `translateY(${-20 * k}px) scale(1)`, opacity: 1, offset: .9 }, { opacity: 0 }], 1800);
  setTimeout(() => host.isConnected && sfxThrow(host, x, y - 10 * k, k, 22, i => [sfxDot(['#f9a8d4', '#c4b5fd', '#a7f3d0', '#fde68a', '#bae6fd'][i % 5], false), 6, 6], { speed: [100, 180], gravity: 220 }), 520);
}
function sbfxLunar(host, x, y, k) {
  const n = 8;
  const cracker = sfxSvg(12, 26, '<rect x="1" y="3" width="10" height="20" rx="2" fill="#dc2626"/><rect x="1" y="9" width="10" height="3" fill="#fbbf24"/><path d="M6 3V0" stroke="#fbbf24" stroke-width="1.2"/>');
  const pts = Array.from({ length: n }, (_, i) => [x - 50 * k + i * 14 * k, y - 60 * k + i * 16 * k + Math.sin(i) * 6 * k]);
  const line = bfxAdd(host, sfxSvg(100, 100, `<path d="M0 0 100 100" stroke="#fbbf24" stroke-width="1.5"/>`, '0 0 100 100'), x - 1 * k, y - 4 * k, 100 * k, 115 * k);
  bfxAnimate(line, [{ opacity: 0 }, { opacity: .8, offset: .1 }, { opacity: .8, offset: .7 }, { opacity: 0 }], { duration: 1500 });
  pts.forEach(([px, py], i) => {
    const el = bfxAdd(host, cracker, px, py, 12 * k, 26 * k);
    el.style.transform = 'rotate(-40deg)';
    bfxAnimate(el, [{ opacity: 0, transform: 'rotate(-40deg) scale(.5)' }, { opacity: 1, transform: 'rotate(-40deg) scale(1)', offset: .1 }, { opacity: 1, offset: .9 }, { opacity: 0, transform: 'rotate(-40deg) scale(1.6)' }], { duration: 300 + i * 150 });
    setTimeout(() => {
      if (!host.isConnected) return;
      sfxFlash(host, px, py, k, 'rgba(254,240,138,.95)', 60, 350);
      sfxThrow(host, px, py, k, 8, j => [`<div style="width:100%;height:100%;background:${j % 3 ? '#dc2626' : '#fbbf24'}"></div>`, 5, 3], { up: false, speed: [40, 90], gravity: 160, dur: [600, 900], delay: [0, 40] });
      sfxThrow(host, px, py, k, 5, () => [sfxDot('#fef3c7'), 3, 3], { up: false, speed: [50, 90], gravity: 0, dur: [300, 450], delay: [0, 20] });
    }, 280 + i * 150);
  });
}
function sbfxRamadan(host, x, y, k) {
  sfxFlash(host, x, y, k, 'rgba(253,230,138,.8)', 140, 900);
  sfxRise(host, x, y, k, 7, () => [sfxLantern(), 28, 42], { rise: [140, 230], sway: 16, dur: [1700, 2000], delay: [0, 350], spreadX: 60 });
  for (let i = 0; i < 12; i++) {
    const el = bfxAdd(host, sfxStar(i % 2 ? '#fde68a' : '#fff'), x + bfxRand(-90, 90) * k, y + bfxRand(-140, 20) * k, 12 * k, 12 * k);
    bfxAnimate(el, [{ transform: 'scale(0) rotate(0)', opacity: 0 }, { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: .4 }, { transform: 'scale(0) rotate(90deg)', opacity: 0 }], { duration: 800, delay: bfxRand(100, 1100) });
  }
}
const SEASONAL_BURN_FX = {
  'burn-valentine': sbfxValentine, 'burn-summer': sbfxSummer, 'burn-halloween': sbfxHalloween,
  'burn-diwali': sbfxDiwali, 'burn-christmas': sbfxChristmas, 'burn-newyear': sbfxNewYear,
  'burn-easter': sbfxEaster, 'burn-lunar': sbfxLunar, 'burn-ramadan': sbfxRamadan
};

// ----- Victories -----
const svfxSize = (layer) => [layer.clientWidth || window.innerWidth, layer.clientHeight || window.innerHeight];
function svfxValentine(layer) {
  const [W, H] = svfxSize(layer);
  const arrow = sfxSvg(120, 20, '<path d="M4 10H104" stroke="#92400e" stroke-width="3" stroke-linecap="round"/><path d="M104 4 118 10 104 16Z" fill="#fbbf24" stroke="#92400e"/><path d="M4 10 14 2H24L14 10 24 18H14Z" fill="#fb7185"/>');
  [[.35, .3], [.68, .42], [.3, .6], [.62, .7], [.5, .45]].forEach(([fx, fy], i) => {
    const tx = W * fx, ty = H * fy, delay = i * 420, aw = Math.min(150, W * .36);
    sfxPop(layer, arrow, tx - aw / 2, ty, aw, aw / 6, [{ transform: `translate(${-W * .7}px, ${-40}px) rotate(8deg)`, opacity: 1 }, { transform: 'translate(0,0) rotate(0)', opacity: 1, offset: .35 }, { transform: 'translate(0,0) rotate(-2deg)', opacity: 1, offset: .8 }, { opacity: 0 }], 1100, delay);
    setTimeout(() => {
      if (!layer.isConnected) return;
      sfxPop(layer, sfxHeartSvg('#e11d48'), tx, ty, 70, 70, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.2)', opacity: 1, offset: .3 }, { transform: 'scale(1.5)', opacity: 0 }], 700);
      sfxThrow(layer, tx, ty, 1, 16, j => [j % 2 ? sfxHeartSvg(['#fb7185', '#f43f5e', '#fda4af'][j % 3]) : sfxSvg(20, 14, '<path d="M0 7C4 0 14-1 20 5 14 12 4 12 0 7Z" fill="#e11d48"/>'), bfxRand(12, 22), bfxRand(10, 20)], { up: false, speed: [90, 170], gravity: 180, dur: [1200, 1600] });
    }, delay + 390);
  });
}
function svfxSummer(layer) {
  const [W, H] = svfxSize(layer);
  const ball = sfxSvg(40, 40, '<circle cx="20" cy="20" r="19" fill="#f8fafc"/><path d="M20 1A19 19 0 0 1 39 20H20Z" fill="#ef4444"/><path d="M39 20A19 19 0 0 1 20 39V20Z" fill="#3b82f6"/><path d="M20 39A19 19 0 0 1 1 20H20Z" fill="#facc15"/><circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.25)"/><circle cx="20" cy="20" r="4" fill="#fff"/><ellipse cx="13" cy="10" rx="5" ry="3" fill="#fff" opacity=".6"/>');
  for (let i = 0; i < 7; i++) {
    const fromLeft = i % 2 === 0, size = bfxRand(44, 70), floor = H * bfxRand(.7, .85);
    const x0 = fromLeft ? -size : W + size, x1 = fromLeft ? W + size : -size;
    const frames = [];
    const bounces = 3, steps = 36;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, bx = x0 + (x1 - x0) * t;
      const phase = (t * bounces) % 1, amp = H * .5 * Math.pow(.6, Math.floor(t * bounces));
      const by = floor - amp * 4 * phase * (1 - phase) - (t === 0 ? H * .35 : 0);
      frames.push({ transform: `translate(${bx}px, ${by}px) rotate(${(fromLeft ? 1 : -1) * t * 900}deg)`, offset: t });
    }
    const el = bfxAdd(layer, ball, 0, 0, size, size);
    el.style.left = `${-size / 2}px`; el.style.top = `${-size / 2}px`;
    bfxAnimate(el, frames, { duration: bfxRand(2600, 3200), delay: i * 260, easing: 'linear' });
  }
}
// Bat Swarm: bats pour out of the moon's glow in the middle, bigger as
// they come towards you, and swoop away in wavy paths, tilting into
// each turn. Every bat beats its wings at its own speed.
function svfxHalloween(layer) {
  const [W, H] = svfxSize(layer);
  const ox = W / 2, oy = H * .5;
  sfxPop(layer, `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,rgba(253,230,138,.6),rgba(124,58,237,.28) 42%,transparent 70%)"></div>`, ox, oy, 280, 280, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }], 1300);
  const count = 24;
  for (let i = 0; i < count; i++) {
    const size = bfxRand(64, 118);
    const flap = bfxRand(.2, .3);
    const el = bfxAdd(layer, realBatHtml(flap.toFixed(3), (-bfxRand(0, flap)).toFixed(3)), ox, oy, size, size * .6);
    // Heading: mostly up and out, fanned all round.
    const a = -Math.PI / 2 + bfxRand(-1.5, 1.5) + (i % 2 ? .25 : -.25);
    const dist = Math.hypot(W, H) * bfxRand(.55, .75);
    const wave = bfxRand(24, 60) * (Math.random() < .5 ? -1 : 1);
    const steps = 6, frames = [];
    let prevX = 0;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const along = dist * t * t * .35 + dist * t * .65;
      const side = Math.sin(t * Math.PI * 2.2) * wave * t;
      const x = Math.cos(a) * along - Math.sin(a) * side;
      const y = Math.sin(a) * along + Math.cos(a) * side;
      const tilt = Math.max(-28, Math.min(28, (x - prevX) * .25));
      prevX = x;
      frames.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${(.35 + t * .95).toFixed(2)})`, opacity: k === 0 ? 0 : k === steps ? .85 : 1, offset: t });
    }
    bfxAnimate(el, frames, { duration: bfxRand(2300, 3100), delay: i * 45 + bfxRand(0, 260), easing: 'cubic-bezier(.3,.1,.6,1)' });
  }
}
function svfxFireworkBurst(layer, x, y, colours, n = 28, r = 110) {
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2, d = r * bfxRand(.75, 1.05), c = colours[j % colours.length];
    const el = bfxAdd(layer, sfxDot(c), x, y, 5, 5);
    bfxAnimate(el, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d * .8}px, ${Math.sin(a) * d * .8}px)`, opacity: 1, offset: .6 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d + 30}px)`, opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.1,.8,.3,1)' });
  }
  sfxFlash(layer, x, y, 1, 'rgba(255,255,255,.8)', 70, 400);
}
function svfxDiwali(layer) {
  const [W, H] = svfxSize(layer);
  const n = 7, y = H * .72;
  const lamp = sfxSvg(50, 36, '<path d="M4 14C6 26 16 32 25 32S44 26 46 14Z" fill="#c2410c"/><path d="M4 14H46" stroke="#fdba74" stroke-width="3" stroke-linecap="round"/><path d="M12 22h26" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="2 3"/>');
  const flame = sfxSvg(20, 30, '<circle cx="10" cy="18" r="10" fill="#fde68a" opacity=".35"/><path d="M10 2C15 10 16 14 16 18 16 22 13 25 10 25S4 22 4 18C4 14 5 10 10 2Z" fill="#f59e0b"/><path d="M10 12C12 15 13 17 13 19 13 21 11.6 22 10 22S7 21 7 19C7 17 8 15 10 12Z" fill="#fff7d6"/>');
  for (let i = 0; i < n; i++) {
    const x = W * (i + 1) / (n + 1), lw = Math.min(56, W / (n + 2));
    sfxPop(layer, lamp, x, y, lw, lw * .72, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)', offset: .1 }, { opacity: 1, offset: .9 }, { opacity: 0 }], 4200);
    const f = sfxPop(layer, flame, x, y - lw * .42, lw * .45, lw * .68, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 0, transform: 'scale(0)', offset: .1 + i * .06 }, { opacity: 1, transform: 'scale(1.3)', offset: .14 + i * .06 }, { opacity: 1, transform: 'scale(1)', offset: .2 + i * .06 }, { opacity: 1, transform: 'scale(1)', offset: .9 }, { opacity: 0 }], 4200);
    f.style.transformOrigin = '50% 90%';
  }
  [[.25, .28], [.72, .22], [.5, .4], [.35, .15], [.8, .45]].forEach(([fx, fy], i) => setTimeout(() => layer.isConnected && svfxFireworkBurst(layer, W * fx, H * fy, ['#fde047', '#f97316', '#ec4899', '#a855f7', '#22c55e']), 1700 + i * 330));
}
function svfxChristmas(layer) {
  const [W, H] = svfxSize(layer);
  const sleigh = sfxSvg(220, 70, `<g fill="#fbbf24" stroke="#78350f" stroke-width="1.5"><path d="M8 40C12 60 60 60 70 44L74 30H30Z" fill="#dc2626"/><path d="M6 64H80" stroke="#fbbf24" stroke-width="4" stroke-linecap="round"/><path d="M20 58V64M60 56V64" stroke="#fbbf24" stroke-width="3"/><circle cx="46" cy="24" r="8"/><path d="M40 30h12l2 10H38Z"/><path d="M42 18l6-10 6 12Z" fill="#dc2626"/>
    <path d="M100 40c6-10 18-10 24-4l8-8 4 4-6 8c4 4 4 10 0 14h-4l-4 12h-4l2-12h-14l-4 12h-4l2-12c-4-2-4-8 0-14Z"/><path d="M128 24l4-10M132 26l8-8M128 24l-6-8" stroke="#fde68a" stroke-width="2.5"/>
    <path d="M160 40c6-10 18-10 24-4l8-8 4 4-6 8c4 4 4 10 0 14h-4l-4 12h-4l2-12h-14l-4 12h-4l2-12c-4-2-4-8 0-14Z"/><path d="M188 24l4-10M192 26l8-8M188 24l-6-8" stroke="#fde68a" stroke-width="2.5"/>
    <circle cx="196" cy="34" r="3.5" fill="#ef4444"/><path d="M74 40H104M130 44h32" stroke="#fde68a" stroke-width="1.5"/></g>`);
  const sw = Math.min(260, W * .7), sh = sw * 70 / 220, duration = 3000;
  const pos = t => [-sw + (W + 2 * sw) * t, H * .45 - Math.sin(t * Math.PI) * H * .2];
  const frames = Array.from({ length: 21 }, (_, s) => { const t = s / 20, [px, py] = pos(t); return { transform: `translate(${px}px, ${py}px) rotate(${-8 + 16 * t}deg)`, offset: t }; });
  const el = bfxAdd(layer, `<div style="width:100%;height:100%;filter:drop-shadow(0 0 6px rgba(253,230,138,.8))">${sleigh}</div>`, 0, 0, sw, sh);
  el.style.left = `${-sw / 2}px`; el.style.top = `${-sh / 2}px`;
  bfxAnimate(el, frames, { duration, easing: 'linear' });
  const start = performance.now();
  const trail = setInterval(() => {
    const t = (performance.now() - start) / duration;
    if (t >= 1 || !layer.isConnected) { clearInterval(trail); return; }
    const [px, py] = pos(t);
    const s = bfxAdd(layer, sfxStar(Math.random() < .5 ? '#fde68a' : '#fff'), px - sw * .45, py + bfxRand(-10, 20), 12, 12);
    bfxAnimate(s, [{ transform: 'scale(1)', opacity: 1 }, { transform: `translate(${bfxRand(-10, 10)}px, ${bfxRand(20, 50)}px) scale(0)`, opacity: 0 }], { duration: 900 });
  }, 60);
  for (let i = 0; i < 40; i++) {
    const f = bfxAdd(layer, sfxSvg(20, 20, '<path d="M10 0V20M0 10H20M3 3 17 17M17 3 3 17" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'), bfxRand(0, W), -20, bfxRand(8, 16), bfxRand(8, 16));
    bfxAnimate(f, [{ transform: 'translate(0,0) rotate(0)', opacity: .95 }, { transform: `translate(${bfxRand(-40, 40)}px, ${H + 40}px) rotate(${bfxRand(-360, 360)}deg)`, opacity: .8 }], { duration: bfxRand(2600, 3800), delay: bfxRand(0, 1200), easing: 'linear' });
  }
}
function svfxNewYear(layer) {
  const [W, H] = svfxSize(layer);
  ['3', '2', '1'].forEach((n, i) => {
    sfxPop(layer, `<div class="svfx-count" style="font-size:${Math.min(160, W * .4)}px">${n}</div>`, W / 2, H * .42, 220, 200, [{ transform: 'scale(2.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .3 }, { transform: 'scale(.9)', opacity: 1, offset: .75 }, { transform: 'scale(.6)', opacity: 0 }], 620, i * 620);
  });
  setTimeout(() => {
    if (!layer.isConnected) return;
    sfxPop(layer, `<div class="svfx-count svfx-hny" style="font-size:${Math.min(40, W * .085)}px">HAPPY NEW YEAR!</div>`, W / 2, H * .42, Math.min(W - 20, 420), 80, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .15 }, { transform: 'scale(1)', opacity: 1, offset: .8 }, { transform: 'scale(1.05)', opacity: 0 }], 2200);
    [[.2, .22], [.8, .2], [.5, .15], [.3, .65], [.72, .62]].forEach(([fx, fy], i) => setTimeout(() => layer.isConnected && svfxFireworkBurst(layer, W * fx, H * fy, ['#fde68a', '#fbbf24', '#f472b6', '#22d3ee', '#ffffff'], 32, 120), i * 240));
    if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 110, startVelocity: 45, origin: { y: .55 }, colors: ['#fde68a', '#d4a017', '#ffffff', '#111827'] });
  }, 1860);
}
function svfxEaster(layer) {
  const [W, H] = svfxSize(layer);
  for (let i = 0; i < 7; i++) {
    const x = W * (i + 1) / 8, floor = H * bfxRand(.55, .72), [a, b, c] = SFX_PASTELS[i % SFX_PASTELS.length], delay = i * 180;
    const el = sfxPop(layer, sfxPaintedEgg(a, b, c), x, floor, 46, 60, [
      { transform: `translateY(${-floor - 60}px) rotate(-20deg)`, opacity: 1 }, { transform: 'translateY(0) rotate(0)', offset: .3 },
      { transform: 'translateY(-40px) rotate(10deg)', offset: .42 }, { transform: 'translateY(0) rotate(0)', offset: .54 },
      { transform: 'translateY(0) rotate(-10deg)', offset: .62 }, { transform: 'translateY(0) rotate(10deg)', offset: .7 }, { transform: 'translateY(0) scale(1.15)', opacity: 1, offset: .78 }, { transform: 'scale(1.5)', opacity: 0 }
    ], 2300, delay);
    setTimeout(() => {
      if (!layer.isConnected) return;
      sfxThrow(layer, x, floor, 1, 14, j => j % 2 ? [sfxFlower(['#f9a8d4', '#c4b5fd', '#fde68a', '#a7f3d0', '#bae6fd'][j % 5]), 20, 20] : [sfxDot(['#f9a8d4', '#c4b5fd', '#a7f3d0'][j % 3], false), 7, 7], { speed: [110, 200], gravity: 200, dur: [1200, 1600] });
    }, delay + 2300 * .8);
  }
}
function svfxLunar(layer) {
  const [W, H] = svfxSize(layer);
  const segs = 16, duration = 3400, amp = H * .09, y0 = H * .45;
  const path = t => { const x = -140 + (W + 280) * t; return [x, y0 + Math.sin(t * Math.PI * 4) * amp]; };
  const head = sfxSvg(80, 60, '<path d="M4 34C4 18 18 8 36 8c14 0 26 6 34 16l-10 4 12 6c-4 10-14 16-26 16H30C16 50 4 44 4 34Z" fill="#dc2626" stroke="#fbbf24" stroke-width="2.5" stroke-linejoin="round"/><path d="M34 8C30 0 22-2 16 2 22 2 26 6 28 10M46 8c2-6 8-8 14-6-5 1-8 4-8 8" fill="#fbbf24"/><circle cx="46" cy="24" r="5" fill="#fff7d6"/><circle cx="47" cy="24" r="2.4" fill="#111"/><path d="M70 36c8 2 10 10 6 16M66 40c4 6 2 12-2 16" stroke="#fde68a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M52 40h10" stroke="#7f1d1d" stroke-width="2" stroke-linecap="round"/><path d="M6 30c-6-6-6-14 0-18M10 40c-8 0-12-6-12-10" stroke="#fbbf24" stroke-width="2" fill="none"/>');
  for (let i = segs; i >= 0; i--) {
    const isHead = i === 0, size = isHead ? 84 : 46 - i * 1.2;
    const html = isHead ? head : sfxSvg(40, 40, `<circle cx="20" cy="20" r="18" fill="${i % 2 ? '#dc2626' : '#b91c1c'}" stroke="#fbbf24" stroke-width="2.5"/><path d="M8 16c4-4 8-4 12 0 4-4 8-4 12 0M10 25c3-3 7-3 10 0 3-3 7-3 10 0" stroke="#fbbf24" stroke-width="1.6" fill="none"/><path d="M20 2l-4-6h8Z" fill="#fbbf24"/>`);
    const frames = Array.from({ length: 41 }, (_, s) => {
      const t = s / 40, [px, py] = path(t), [nx, ny] = path(Math.min(1, t + .01));
      const ang = Math.atan2(ny - py, nx - px) * 180 / Math.PI;
      return { transform: `translate(${px}px, ${py}px) rotate(${isHead ? ang : 0}deg)`, offset: t };
    });
    const el = bfxAdd(layer, html, 0, 0, size, isHead ? size * .75 : size);
    el.style.left = `${-size / 2}px`; el.style.top = `${-(isHead ? size * .75 : size) / 2}px`;
    bfxAnimate(el, frames, { duration, delay: i * 90, easing: 'linear' });
  }
  const start = performance.now();
  const sparkle = setInterval(() => {
    const t = (performance.now() - start) / duration;
    if (t >= 1.2 || !layer.isConnected) { clearInterval(sparkle); return; }
    const [px, py] = path(Math.min(1, Math.max(0, t - .05)));
    const s = bfxAdd(layer, sfxStar('#fde68a'), px + bfxRand(-20, 20), py + bfxRand(-30, 30), 12, 12);
    bfxAnimate(s, [{ transform: 'scale(1)', opacity: 1 }, { transform: `translateY(${bfxRand(20, 50)}px) scale(0)`, opacity: 0 }], { duration: 800 });
  }, 50);
  for (let i = 0; i < 6; i++) {
    const el = bfxAdd(layer, sfxRedLantern, W * (i + .5) / 6, -60, 40, 60);
    bfxAnimate(el, [{ transform: 'translateY(0)' }, { transform: `translateY(${80 + (i % 2) * 30}px)`, offset: .2 }, { transform: `translateY(${80 + (i % 2) * 30}px) rotate(${i % 2 ? 6 : -6}deg)`, offset: .6 }, { transform: 'translateY(0)' }], { duration: 3800, easing: 'ease-in-out' });
  }
}
function svfxRamadan(layer) {
  const [W, H] = svfxSize(layer);
  const moon = sfxSvg(100, 100, '<circle cx="50" cy="50" r="48" fill="rgba(253,230,138,.18)"/><path d="M58 14A36 36 0 1 0 58 86 42 42 0 0 1 58 14Z" fill="#fde68a"/><path d="m74 40 3 7 7.6.6-5.8 5 1.8 7.4L74 56l-6.6 4 1.8-7.4-5.8-5L71 47Z" fill="#fde68a"/>');
  const size = Math.min(170, W * .42);
  sfxPop(layer, `<div style="width:100%;height:100%;filter:drop-shadow(0 0 18px rgba(253,230,138,.8))">${moon}</div>`, W / 2, H * .34, size, size, [{ transform: `translateY(${H * .5}px) scale(.6)`, opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: .4 }, { transform: 'translateY(-6px) scale(1)', opacity: 1, offset: .85 }, { transform: 'translateY(-10px) scale(1)', opacity: 0 }], 4000);
  for (let i = 0; i < 22; i++) {
    const el = bfxAdd(layer, sfxStar(i % 3 ? '#fff' : '#fde68a'), bfxRand(10, W - 10), bfxRand(10, H * .6), bfxRand(8, 16), bfxRand(8, 16));
    bfxAnimate(el, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: .3 }, { transform: 'scale(.8) rotate(45deg)', opacity: .8, offset: .7 }, { transform: 'scale(0) rotate(90deg)', opacity: 0 }], { duration: bfxRand(1400, 2200), delay: bfxRand(300, 2000) });
  }
  for (let i = 0; i < 9; i++) {
    const el = bfxAdd(layer, sfxLantern(), bfxRand(20, W - 20), H + 40, 34, 51);
    const drift = bfxRand(-40, 40);
    bfxAnimate(el, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: `translate(${drift * .3}px, ${-H * .2}px) rotate(-4deg)`, opacity: 1, offset: .2 }, { transform: `translate(${-drift * .3}px, ${-H * .6}px) rotate(4deg)`, opacity: 1, offset: .7 }, { transform: `translate(${drift}px, ${-H * .9}px)`, opacity: 0 }], { duration: bfxRand(3200, 4000), delay: bfxRand(0, 900), easing: 'ease-out' });
  }
}
const SEASONAL_VICTORY_FX = {
  'victory-valentine': svfxValentine, 'victory-summer': svfxSummer, 'victory-halloween': svfxHalloween,
  'victory-diwali': svfxDiwali, 'victory-christmas': svfxChristmas, 'victory-newyear': svfxNewYear,
  'victory-easter': svfxEaster, 'victory-lunar': svfxLunar, 'victory-ramadan': svfxRamadan
};
// Tiled surfaces repeat at a fixed CSS size (a smaller one in the mini
// previews) under their own lamp/vignette; responsive scene layers extend
// across actual host dimensions and keep every defining feature complete.
const TABLE_TILE_PX = 640;
const TILED_TABLE_LIGHT = {
  wood: 'radial-gradient(ellipse 70% 55% at 42% 40%,rgba(255,236,200,.16),transparent 70%),radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(20,10,4,.5) 100%)',
  felt: 'radial-gradient(ellipse 75% 60% at 50% 46%,rgba(220,255,230,.12),transparent 70%),radial-gradient(ellipse at 50% 50%,transparent 42%,rgba(0,0,0,.5) 100%)'
};
function tableArtBackground(id, preview = false) {
  const t = ILLUSTRATED_TABLES[id];
  if (!t) return '';
  const light = TILED_TABLE_LIGHT[t.art];
  if (light) return `${light}, url('${TABLE_ART[t.art]}') 0 0/${preview ? 160 : TABLE_TILE_PX}px repeat, ${t.base}`;
  return t.base; // Complete anchored scene is drawn by ShTableScenes.
}
// Mirrors the in-game #gameTable look for each theme so previews match.
const CSS_TABLE_PREVIEWS = {
  default: { bg: 'linear-gradient(180deg,#030c08,#0d2b1d 50%,#030c08)', rim: 'inset 0 0 0 1px #1e293b', label: 'rgba(148,163,184,.7)' },
  'table-casino': { bg: 'radial-gradient(ellipse at 50% 45%,rgba(16,185,129,.30),transparent 48%),repeating-linear-gradient(45deg,rgba(251,191,36,.035) 0 2px,transparent 2px 18px),linear-gradient(180deg,#071a17,#064e3b 48%,#031713)', rim: 'inset 0 0 0 3px #d4af37,inset 0 0 30px rgba(0,0,0,.78)', label: 'rgba(212,175,55,.85)' },
  'table-midnight': { bg: 'radial-gradient(circle at 18% 28%,rgba(255,255,255,.9) 0 .8px,transparent 1.6px),radial-gradient(circle at 71% 16%,rgba(255,255,255,.7) 0 .7px,transparent 1.4px),radial-gradient(circle at 42% 80%,rgba(226,232,240,.55) 0 1px,transparent 1.8px),radial-gradient(circle at 90% 70%,rgba(255,255,255,.8) 0 .6px,transparent 1.3px),#000', rim: 'inset 0 0 0 3px #1e293b,inset 0 0 40px rgba(0,0,0,.9)', label: 'rgba(203,213,225,.7)' },
  'table-royal': { bg: 'radial-gradient(ellipse at 50% 45%,rgba(167,139,250,.28),transparent 55%),repeating-linear-gradient(45deg,rgba(251,191,36,.07) 0 1px,transparent 1px 14px),repeating-linear-gradient(-45deg,rgba(251,191,36,.07) 0 1px,transparent 1px 14px),linear-gradient(180deg,#1e0b3d,#3b0764 50%,#1e0b3d)', rim: 'inset 0 0 0 3px #d4af37,inset 0 0 0 5px #7f1d1d,inset 0 0 30px rgba(0,0,0,.7)', label: 'rgba(251,191,36,.85)' },
  'table-winter': { bg: 'radial-gradient(circle at 18% 16%,rgba(255,255,255,.8) 0 1px,transparent 2px),radial-gradient(circle at 78% 32%,rgba(255,255,255,.65) 0 1px,transparent 2px),radial-gradient(ellipse at 50% 55%,rgba(186,230,253,.32),transparent 55%),linear-gradient(180deg,#082f49,#0c4a6e 48%,#172554)', size: '31px 31px,43px 43px,auto,auto', rim: 'inset 0 0 0 3px #bae6fd,inset 0 0 36px rgba(224,242,254,.2)', label: 'rgba(186,230,253,.85)' }
};
function tablePreviewLook(id) {
  const art = ILLUSTRATED_TABLES[id];
  if (art) return { bg: tableArtBackground(id, true), rim: art.rim, label: art.label };
  return CSS_TABLE_PREVIEWS[id] || CSS_TABLE_PREVIEWS.default;
}
function miniTablePreviewHtml(id, name, large = false, cards = {}) {
  const look = tablePreviewLook(id || 'default');
  const style = `background:${look.bg};${look.size ? `background-size:${look.size};` : ''}box-shadow:${look.rim};--mini-table-label:${look.label}`;
  const deck = cards.backId ? `<span class="mini-table-card deck custom-card-back ${getCosmeticBackClass(cards.backId)}"></span>` : '<span class="mini-table-card deck"></span>';
  const faceStyle = cards.frameId && cards.frameId !== 'default' ? ` style="${getCosmeticFrameStyle(cards.frameId).replace(/!important/g, '')}"` : '';
  // With a loadout (showcase) the pile holds a card too, so both face-up
  // cards show the frame; the Shop's table previews keep the empty pile.
  const pile = cards.backId || cards.frameId ? `<span class="mini-table-card pile-card"${faceStyle}>K<br>♠</span>` : '<span class="mini-table-card pile"></span>';
  return `<span class="mini-table${large ? ' is-large' : ''}" data-table-preview="${id || 'default'}" style="${style}">${deck}${pile}<span class="mini-table-card face"${faceStyle}>A<br>♥</span>${name ? `<span class="mini-table-name">${name}</span>` : ''}</span>`;
}
(function installIllustratedTableStyles() {
  const css = Object.entries(ILLUSTRATED_TABLES).map(([id, t]) =>
    `body[data-equipped-table-theme="${id}"] #gameTable { background:${tableArtBackground(id)} !important; box-shadow:${t.rim}; }\n` +
    `body[data-equipped-table-theme="${id}"] { --table-label-border:${t.label}; }`).join('\n');
  const style = document.createElement('style');
  style.id = 'illustratedTableStyles';
  style.textContent = css;
  document.head.appendChild(style);
})();
// § Joker effects: the overlay played when a Joker lands
// Every effect runs for JOKER_FX_MS over a softly dimmed table and draws
// with the same bfx/sfx helpers as the burns: fx(host, g), where host is a
// full-screen div in #jokerFxLayer (z-index 64: over the table, under the
// emote picker and every pop-up) or a Shop/Custom preview stage, and
// g = { W, H, cx, cy, k } (k scales the art to the host). Shared pieces
// keep them consistent: jfxScrim (the dim), jfxHero (the main picture:
// springs in, holds, leaves by the end), jfxWord (the shout: "HA!",
// "BOO!"...). A Joker played on a Joker never shows two at once: the
// first is always seen for JOKER_FX_MIN_MS, then the counter's effect
// takes over with a COUNTERED! tag (playJokerEffect).
const JOKER_FX_MS = 1500;
const JOKER_FX_MIN_MS = 650;
const jfxGeom = (host, preview = false) => {
  const W = host.clientWidth || window.innerWidth, H = host.clientHeight || window.innerHeight;
  const k = preview ? Math.min(W / 380, H / 410) : Math.max(.5, Math.min(1.25, Math.min(W / 380, H / 560)));
  return { W, H, cx: W / 2, cy: H * (preview ? .5 : .45), k };
};
function jfxScrim(host, tint = 'rgba(30,27,75,.5)') {
  const el = document.createElement('div');
  el.className = 'jfx-scrim';
  el.style.background = `radial-gradient(circle at 50% 45%, ${tint}, rgba(2,6,23,.4) 72%)`;
  host.appendChild(el);
  bfxAnimate(el, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .82 }, { opacity: 0 }], { duration: JOKER_FX_MS, easing: 'linear' });
}
const JFX_ENTER = {
  pop: [{ transform: 'scale(.2) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1.12) rotate(3deg)', opacity: 1, offset: .16 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: .26 },
    { transform: 'scale(1) rotate(0)', opacity: 1, offset: .8 }, { transform: 'scale(.86) translateY(-14px)', opacity: 0 }],
  flip: [{ transform: 'perspective(700px) rotateY(180deg) scale(.4)', opacity: 0 }, { transform: 'perspective(700px) rotateY(0) scale(1.1)', opacity: 1, offset: .22 },
    { transform: 'perspective(700px) rotateY(0) scale(1)', opacity: 1, offset: .32 }, { transform: 'perspective(700px) scale(1)', opacity: 1, offset: .8 }, { transform: 'translateY(-26px) scale(.9)', opacity: 0 }],
  rise: [{ transform: 'translateY(40%) scale(.85)', opacity: 0 }, { transform: 'translateY(-4%) scale(1.04)', opacity: 1, offset: .22 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: .32 },
    { transform: 'translateY(0) scale(1)', opacity: 1, offset: .8 }, { transform: 'translateY(-10%) scale(.95)', opacity: 0 }],
  fade: [{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'scale(1)', offset: .25 }, { opacity: 1, offset: .8 }, { opacity: 0, transform: 'scale(1.03)' }]
};
function jfxHero(host, g, html, w, h, { x = g.cx, y = g.cy, enter = 'pop', delay = 0, end = JOKER_FX_MS - 60 } = {}) {
  const frames = Array.isArray(enter) ? enter : JFX_ENTER[enter];
  return sfxPop(host, html, x, y, w * g.k, h * g.k, frames, end - delay, delay);
}
function jfxWord(host, g, text, { x = g.cx, y = g.cy + 118 * g.k, color = '#fbbf24', size = 44, delay = 300, end = JOKER_FX_MS - 80, tilt = -6 } = {}) {
  const px = size * g.k;
  const w = Math.min(g.W - 12, (text.length * .66 + 1.2) * px), h = px * 1.5;
  sfxPop(host, `<div class="jfx-word" style="font-size:${px}px;--jfx-glow:${color}">${text}</div>`, x, y, w, h,
    [{ transform: `scale(.3) rotate(${tilt}deg)`, opacity: 0 }, { transform: `scale(1.18) rotate(${tilt}deg)`, opacity: 1, offset: .18 },
      { transform: `scale(1) rotate(${tilt}deg)`, opacity: 1, offset: .76 }, { transform: `scale(1.05) rotate(${tilt}deg) translateY(-8px)`, opacity: 0 }], end - delay, delay);
}
// A clipped window (for things rising out of boxes, hats, eggs).
function jfxClip(host, left, top, w, h) {
  const el = document.createElement('div');
  el.className = 'bfx';
  Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px`, overflow: 'hidden' });
  host.appendChild(el);
  setTimeout(() => el.remove(), JOKER_FX_MS + 300);
  return el;
}
// A firework burst sized to fit what's left of the 1.5s.
function jfxBurst(host, x, y, colours, n, r, dur) {
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2, d = r * bfxRand(.75, 1.05), el = bfxAdd(host, sfxDot(colours[j % colours.length]), x, y, 5, 5);
    bfxAnimate(el, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d * .8}px,${Math.sin(a) * d * .8}px)`, opacity: 1, offset: .6 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 24}px)`, opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.1,.8,.3,1)' });
  }
  sfxFlash(host, x, y, 1, 'rgba(255,255,255,.8)', 70, 350);
}
const jfxSparkles = (host, g, x, y, colours, n = 12, delay = 0, radius = 110) => {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + bfxRand(-.2, .2), r = bfxRand(.6, 1) * radius * g.k;
    const el = bfxAdd(host, sfxStar(colours[i % colours.length]), x, y, 16 * g.k, 16 * g.k);
    bfxAnimate(el, [{ transform: 'translate(0,0) scale(0)', opacity: 0 }, { transform: `translate(${Math.cos(a) * r * .7}px,${Math.sin(a) * r * .7}px) scale(1.2) rotate(90deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) scale(0) rotate(180deg)`, opacity: 0 }], { duration: 700, delay: delay + bfxRand(0, 120), easing: 'ease-out' });
  }
};

// ---- Art ----
const jfxHatBody = (a = '#7c3aed', b = '#16a34a', c = '#dc2626', bell = '#fbbf24') =>
  `<path d="M12 66C12 44 8 30 3 20 22 24 36 38 42 58Z" fill="${a}" stroke="#1e1b4b" stroke-width="2"/>` +
  `<path d="M36 60C40 38 46 18 50 7 54 18 60 38 64 60Z" fill="${b}" stroke="#1e1b4b" stroke-width="2"/>` +
  `<path d="M88 66C88 44 92 30 97 20 78 24 64 38 58 58Z" fill="${c}" stroke="#1e1b4b" stroke-width="2"/>` +
  `<rect x="10" y="58" width="80" height="14" rx="7" fill="${bell}" stroke="#92400e" stroke-width="2"/>` +
  [[3, 20], [50, 7], [97, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${bell}" stroke="#92400e" stroke-width="2"/>`).join('');
const JFX_CARD = sfxSvg(70, 100, `<rect x="2" y="2" width="66" height="96" rx="9" fill="#111827" stroke="#fbbf24" stroke-width="3"/>
  <rect x="7" y="7" width="56" height="86" rx="6" fill="none" stroke="rgba(251,191,36,.35)" stroke-width="1.2"/>
  <text x="9" y="21" font-family="Outfit,system-ui,sans-serif" font-weight="900" font-size="12" fill="#f472b6">JKR</text>
  <g transform="translate(11 32) scale(.48)">${jfxHatBody()}</g>
  <text x="35" y="86" text-anchor="middle" font-family="Outfit,system-ui,sans-serif" font-weight="900" font-size="10" fill="#fbbf24" letter-spacing="1">JOKER</text>`);
// A jester's face under the hat (viewBox 0 0 120 150).
const jfxJesterBody = (wink = false, hat = jfxHatBody()) => `<circle cx="60" cy="100" r="42" fill="#fdf2f8" stroke="#1e1b4b" stroke-width="3"/>
  <g transform="translate(10 0)">${hat}</g>
  <circle cx="31" cy="104" r="7" fill="#f472b6" opacity=".55"/><circle cx="89" cy="104" r="7" fill="#f472b6" opacity=".55"/>
  <path d="M38 80l12-4M82 80l-12-4" stroke="#1e1b4b" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="46" cy="92" rx="5.5" ry="7.5" fill="#1e1b4b"/>
  <ellipse class="${wink ? 'jfx-wink' : ''}" cx="74" cy="92" rx="5.5" ry="7.5" fill="#1e1b4b"/>
  <circle cx="60" cy="104" r="5" fill="#ef4444"/>
  <path d="M32 112q28 34 56 0q-28 14-56 0Z" fill="#dc2626" stroke="#1e1b4b" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M40 115q20 9 40 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
const jfxNest = (x, y, w, h, vb, body) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">${body}</svg>`;
const JFX_MINI_BACK = sfxSvg(28, 40, '<rect x="1" y="1" width="26" height="38" rx="5" fill="#4c1d95" stroke="#fbbf24" stroke-width="2"/><path d="M14 8 22 20 14 32 6 20Z" fill="#f472b6" opacity=".85"/>');

// ---- The effects ----
function jfxDefault(host, g) {
  jfxScrim(host);
  sfxFlash(host, g.cx, g.cy, g.k, 'rgba(244,114,182,.75)', 260, 700, 140);
  jfxHero(host, g, JFX_CARD, 112, 160, { enter: 'flip' });
  jfxSparkles(host, g, g.cx, g.cy, ['#fbbf24', '#f472b6', '#fff'], 10, 220);
  jfxWord(host, g, 'JOKER!', { color: '#f472b6' });
}
// Jester's Grin: a giant jester face winks and cackles "HA!".
function jfxGrin(host, g) {
  jfxScrim(host, 'rgba(88,28,135,.55)');
  jfxHero(host, g, sfxSvg(120, 150, jfxJesterBody(true)), 170, 212, { y: g.cy - 10 * g.k });
  [[-.3, -.2, 300], [.3, -.28, 520], [0, .42, 740]].forEach(([fx, fy, d], i) => jfxWord(host, g, 'HA!', {
    x: g.cx + fx * 300 * g.k, y: g.cy + fy * 300 * g.k, color: ['#a855f7', '#22c55e', '#f43f5e'][i], size: 34, delay: d, tilt: [-12, 10, -4][i]
  }));
  jfxSparkles(host, g, g.cx, g.cy, ['#a855f7', '#22c55e', '#fbbf24'], 12, 260, 150);
}
// Jack-in-the-Box: the lid flips, a jester springs out and bobs.
function jfxJackbox(host, g) {
  jfxScrim(host, 'rgba(127,29,29,.45)');
  const k = g.k, boxW = 130 * k, boxH = 100 * k, boxY = g.cy + 70 * k;
  const clip = jfxClip(host, g.cx - 90 * k, 0, 180 * k, boxY);
  const head = sfxSvg(80, 170, jfxNest(4, 0, 72, 90, '0 0 120 150', jfxJesterBody()) +
    '<path d="M40 86l-16 7 32 7-32 7 32 7-32 7 32 7-32 7 32 7-16 7" fill="none" stroke="#cbd5e1" stroke-width="4.5" stroke-linejoin="round"/>');
  const hh = 170 * k;
  const headEl = bfxAdd(clip, head, 90 * k, boxY - hh / 2 + 10 * k, 80 * k, hh);
  bfxAnimate(headEl, [{ transform: `translateY(${hh}px)`, offset: 0 }, { transform: `translateY(${hh}px)`, offset: .14 }, { transform: 'translateY(-26px)', offset: .3 },
    { transform: 'translateY(8px)', offset: .4 }, { transform: 'translateY(-10px) rotate(-6deg)', offset: .52 }, { transform: 'translateY(0) rotate(5deg)', offset: .64 },
    { transform: 'translateY(0) rotate(-3deg)', opacity: 1, offset: .82 }, { transform: 'translateY(-14px)', opacity: 0 }], { duration: JOKER_FX_MS - 60, easing: 'ease-out' });
  const box = sfxSvg(130, 100, '<rect x="3" y="6" width="124" height="90" rx="6" fill="#dc2626" stroke="#1e1b4b" stroke-width="4"/><path d="M65 20 90 51 65 82 40 51Z" fill="#fbbf24" stroke="#1e1b4b" stroke-width="3"/><circle cx="20" cy="22" r="5" fill="#fbbf24"/><circle cx="110" cy="80" r="5" fill="#fbbf24"/><rect x="118" y="44" width="16" height="8" rx="3" fill="#94a3b8"/>');
  jfxHero(host, g, box, 130, 100, { y: boxY + boxH / 2, enter: 'rise' });
  const lid = bfxAdd(host, sfxSvg(134, 20, '<rect x="2" y="3" width="130" height="15" rx="4" fill="#b91c1c" stroke="#1e1b4b" stroke-width="3.5"/>'), g.cx, boxY + 2 * k, 134 * k, 20 * k);
  // The lid pops off as the jester springs out and tumbles away.
  bfxAnimate(lid, [{ transform: 'translateY(30%) rotate(0)', opacity: 0 }, { transform: 'translate(0,0) rotate(0)', opacity: 1, offset: .08 }, { transform: 'translate(0,0) rotate(0)', opacity: 1, offset: .14 },
    { transform: `translate(${-70 * k}px,${-120 * k}px) rotate(-160deg)`, opacity: 1, offset: .34 }, { transform: `translate(${-120 * k}px,${-40 * k}px) rotate(-320deg)`, opacity: 0, offset: .55 },
    { transform: `translate(${-120 * k}px,${-40 * k}px) rotate(-320deg)`, opacity: 0 }], { duration: JOKER_FX_MS - 60, easing: 'ease-out' });
  jfxSparkles(host, g, g.cx, boxY - 40 * k, ['#fbbf24', '#ef4444', '#fff'], 10, 300, 120);
  jfxWord(host, g, 'BOING!', { y: g.cy - 150 * k, color: '#ef4444', delay: 380, tilt: 5 });
}
// Puppet Master: a jester puppet drops in on its strings and dances.
function jfxPuppet(host, g) {
  jfxScrim(host, 'rgba(68,64,60,.5)');
  const k = g.k;
  const puppet = sfxSvg(140, 260, `<rect x="8" y="4" width="124" height="12" rx="5" fill="#92400e" stroke="#451a03" stroke-width="2.5"/><rect x="64" y="2" width="12" height="40" rx="4" fill="#78350f"/>
    <path d="M14 16 44 176M70 42 70 96M126 16 96 176M40 16 34 128M100 16 106 128" stroke="#e7e5e4" stroke-width="1.4" opacity=".85"/>
    ${jfxNest(40, 76, 60, 75, '0 0 120 150', jfxJesterBody())}
    <path d="M52 150h36l12 58H40Z" fill="#7c3aed" stroke="#1e1b4b" stroke-width="2.5"/><path d="M70 150v58" stroke="#16a34a" stroke-width="8"/>
    <path d="M52 156 34 128M88 156 106 128" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
    <path d="M58 208 44 176M82 208 96 176" stroke="#16a34a" stroke-width="9" stroke-linecap="round"/>
    <path d="M48 208 40 240M92 208 100 240" stroke="#dc2626" stroke-width="9" stroke-linecap="round"/><circle cx="40" cy="242" r="6" fill="#fbbf24"/><circle cx="100" cy="242" r="6" fill="#fbbf24"/>`);
  const el = bfxAdd(host, puppet, g.cx, g.cy - 10 * k, 140 * k, 260 * k);
  el.style.transformOrigin = '50% 0%';
  bfxAnimate(el, [{ transform: 'translateY(-110%) rotate(0)', opacity: 1 }, { transform: 'translateY(4%) rotate(0)', offset: .2 }, { transform: 'translateY(0) rotate(9deg)', offset: .34 },
    { transform: 'translateY(-3%) rotate(-9deg)', offset: .48 }, { transform: 'translateY(0) rotate(7deg)', offset: .62 }, { transform: 'translateY(-2%) rotate(-5deg)', opacity: 1, offset: .8 },
    { transform: 'translateY(-110%) rotate(0)', opacity: 1 }], { duration: JOKER_FX_MS - 40, easing: 'ease-in-out' });
  jfxWord(host, g, 'DANCE!', { y: g.cy + 150 * k, color: '#f59e0b', delay: 420, tilt: -4 });
}
// Magic Trick: tap tap tap, a puff of smoke, and a Joker rises from the hat.
function jfxMagic(host, g) {
  jfxScrim(host, 'rgba(49,46,129,.55)');
  const k = g.k, hatY = g.cy + 62 * k;
  const clip = jfxClip(host, g.cx - 80 * k, 0, 160 * k, hatY - 22 * k);
  const card = bfxAdd(clip, JFX_CARD, 80 * k, hatY - 22 * k - 80 * k, 90 * k, 128 * k);
  bfxAnimate(card, [{ transform: `translateY(${150 * k}px)`, offset: 0 }, { transform: `translateY(${150 * k}px)`, offset: .42 }, { transform: 'translateY(-6px) rotate(-4deg)', offset: .6 },
    { transform: 'translateY(0) rotate(0)', opacity: 1, offset: .82 }, { transform: 'translateY(-12px)', opacity: 0 }], { duration: JOKER_FX_MS - 60, easing: 'ease-out' });
  const hat = sfxSvg(150, 110, '<ellipse cx="75" cy="30" rx="72" ry="14" fill="#111827" stroke="#6366f1" stroke-width="3"/><path d="M25 30h100l-8 72H33Z" fill="#111827" stroke="#6366f1" stroke-width="3"/><path d="M29 62h92" stroke="#dc2626" stroke-width="10"/><ellipse cx="75" cy="30" rx="50" ry="8" fill="#020617"/>');
  jfxHero(host, g, hat, 150, 110, { y: hatY + 34 * k, enter: 'rise' });
  const wand = bfxAdd(host, sfxSvg(20, 120, '<rect x="6" y="6" width="8" height="110" rx="3" fill="#111827" stroke="#e0e7ff" stroke-width="1.5"/><rect x="6" y="6" width="8" height="18" rx="3" fill="#f8fafc"/>'), g.cx + 95 * k, hatY - 40 * k, 20 * k, 120 * k);
  wand.style.transformOrigin = '50% 100%';
  bfxAnimate(wand, [{ transform: 'rotate(40deg)', opacity: 0 }, { transform: 'rotate(30deg)', opacity: 1, offset: .1 }, { transform: 'rotate(-10deg)', offset: .16 }, { transform: 'rotate(20deg)', offset: .22 },
    { transform: 'rotate(-10deg)', offset: .28 }, { transform: 'rotate(20deg)', offset: .34 }, { transform: 'rotate(-12deg)', offset: .4 }, { transform: 'rotate(25deg)', opacity: 1, offset: .75 }, { transform: 'rotate(30deg)', opacity: 0 }], { duration: JOKER_FX_MS - 60 });
  setTimeout(() => {
    if (!host.isConnected) return;
    for (let i = 0; i < 9; i++) {
      const el = bfxAdd(host, sfxDot(i % 2 ? 'rgba(226,232,240,.85)' : 'rgba(203,213,225,.7)', false), g.cx + bfxRand(-50, 50) * k, hatY - 20 * k, bfxRand(40, 70) * k, bfxRand(40, 70) * k);
      bfxAnimate(el, [{ transform: 'scale(.2)', opacity: .9 }, { transform: `translate(${bfxRand(-40, 40) * k}px,${-bfxRand(40, 90) * k}px) scale(1.3)`, opacity: 0 }], { duration: 650, delay: bfxRand(0, 80), easing: 'ease-out' });
    }
    jfxSparkles(host, g, g.cx, hatY - 70 * k, ['#e0e7ff', '#a5b4fc', '#fbbf24'], 12, 60, 120);
  }, 600);
  jfxWord(host, g, 'TA-DA!', { y: g.cy - 140 * k, color: '#818cf8', delay: 700, tilt: 4 });
}
// Glitch: the screen tears, the colours split and JOKER flickers.
function jfxGlitch(host, g) {
  jfxScrim(host, 'rgba(8,47,73,.55)');
  const k = g.k, scan = document.createElement('div');
  scan.className = 'jfx-scan';
  host.appendChild(scan);
  bfxAnimate(scan, [{ opacity: 0 }, { opacity: .55, offset: .1 }, { opacity: .35, offset: .5 }, { opacity: .55, offset: .8 }, { opacity: 0 }], { duration: JOKER_FX_MS });
  const px = Math.min(g.W * .19, 76 * k);
  const layer = (colour, dx) => sfxPop(host, `<div class="jfx-word jfx-glitch-text" style="font-size:${px}px;color:${colour}">JOKER</div>`, g.cx, g.cy, Math.min(g.W, px * 4.2), px * 1.4,
    [0, .08, .14, .2, .3, .38, .5, .6, .7, .78, .84, .9, 1].map((o, i) => ({ offset: o, opacity: o === 0 || o === 1 ? 0 : 1,
      transform: `translate(${(i % 3 - 1) * dx * k}px,${(i % 2 ? 2 : -2) * k}px) skewX(${i % 4 === 1 ? 14 : 0}deg)`, clipPath: i % 5 === 2 ? 'inset(30% 0 35% 0)' : 'none' })), JOKER_FX_MS - 60, 60);
  layer('#f43f5e', 7); layer('#22d3ee', -7); layer('#f8fafc', 0);
  for (let i = 0; i < 9; i++) {
    const el = bfxAdd(host, `<div style="width:100%;height:100%;background:${['#22d3ee', '#f43f5e', '#a855f7', '#f8fafc'][i % 4]};opacity:.55"></div>`, g.W / 2, bfxRand(.15, .85) * g.H, g.W * bfxRand(.4, 1.1), bfxRand(3, 14) * k);
    bfxAnimate(el, [{ opacity: 0, transform: 'translateX(0)' }, { opacity: 1, transform: `translateX(${bfxRand(-40, 40) * k}px)`, offset: .3 }, { opacity: 0, transform: `translateX(${bfxRand(-80, 80) * k}px)` }], { duration: bfxRand(120, 240), delay: bfxRand(40, 1150) });
  }
}
// Card Storm: cards spiral in from every side and snap into one Joker.
function jfxStorm(host, g) {
  jfxScrim(host, 'rgba(76,29,149,.5)');
  const k = g.k, R = Math.max(g.W, g.H) * .62, n = 18;
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * 2 * i) / n, el = bfxAdd(host, JFX_MINI_BACK, g.cx, g.cy, 34 * k, 48 * k);
    bfxAnimate(el, [0, .2, .4, .6, .8, 1].map(t => {
      const a = a0 + t * Math.PI * 1.6, r = R * (1 - t);
      return { offset: t * .45, transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) rotate(${t * 540 + i * 20}deg) scale(${1 - t * .5})`, opacity: t === 1 ? .2 : 1 };
    }).concat([{ offset: 1, transform: 'scale(.3)', opacity: 0 }]), { duration: JOKER_FX_MS, easing: 'linear' });
  }
  sfxFlash(host, g.cx, g.cy, k, 'rgba(250,232,255,.95)', 280, 600, 640);
  jfxHero(host, g, JFX_CARD, 112, 160, { delay: 660, enter: 'pop' });
  jfxWord(host, g, 'WILD!', { color: '#c084fc', delay: 760 });
}
// ---- Seasonal ----
// Halloween, Pumpkin Joker (the owner's art, § Owner effects): purple
// mist swirls in, the grinning jester pumpkin pops up and shakes, then a
// ghost bursts out of it with a "Boooo!" (audio: boo) as BOO! slams in.
function jfxHalloween(host, g) {
  jfxScrim(host, 'rgba(59,7,100,.55)');
  const P = OWNER_FX_LAYOUT.pumpkin, T = JOKER_FX_MS - 60;
  const S = Math.min(g.W * .98, 400 * g.k), ox = g.cx - S / 2, oy = g.cy - S / 2;
  const bg = ofxLayer(host, 'pumpkin-bg', P.bg, S, ox, oy);
  bfxAnimate(bg, ofxEase([{ transform: 'scale(.85) rotate(-10deg)', opacity: 0 }, { transform: 'scale(1) rotate(-2deg)', opacity: 1, offset: .22 },
    { transform: 'scale(1.02) rotate(3deg)', opacity: 1, offset: .82 }, { transform: 'scale(1.06) rotate(5deg)', opacity: 0 }]), { duration: T, easing: 'linear' });
  const pumpkin = ofxLayer(host, 'pumpkin-pumpkin', P.pumpkin, S, ox, oy);
  pumpkin.style.transformOrigin = '50% 90%';
  bfxAnimate(pumpkin, ofxEase([{ transform: 'scale(.2) rotate(-12deg)', opacity: 0 }, { transform: 'scale(1.12,1.06) rotate(3deg)', opacity: 1, offset: .16 }, { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: .23 },
    { transform: 'rotate(-6deg)', opacity: 1, offset: .27 }, { transform: 'rotate(6deg)', opacity: 1, offset: .31 }, { transform: 'rotate(-5deg)', opacity: 1, offset: .34 },
    { transform: 'scale(1.1,.88) rotate(0deg)', opacity: 1, offset: .37 }, { transform: 'scale(.95,1.08)', opacity: 1, offset: .42 }, { transform: 'scale(1)', opacity: 1, offset: .5 },
    { transform: 'scale(1)', opacity: 1, offset: .84 }, { transform: 'scale(.9) translateY(10px)', opacity: 0 }]), { duration: T, easing: 'linear' });
  // The ghost flies out of the pumpkin's top to its place, then floats.
  const ghost = ofxLayer(host, 'pumpkin-ghost', P.ghost, S, ox, oy);
  const dx = (518 - (P.ghost[0] + P.ghost[2] / 2)) * S / 1000, dy = (430 - (P.ghost[1] + P.ghost[3] / 2)) * S / 1000;
  bfxAnimate(ghost, ofxEase([{ transform: `translate(${dx}px,${dy}px) scale(.2)`, opacity: 0 }, { transform: `translate(${dx}px,${dy}px) scale(.2)`, opacity: 0, offset: .36 },
    { transform: `translate(${dx * .6}px,${dy * .6}px) scale(.5) rotate(-12deg)`, opacity: 1, offset: .4 }, { transform: 'translate(0,0) scale(1.14) rotate(-5deg)', opacity: 1, offset: .5 },
    { transform: 'translate(0,-4px) scale(1) rotate(3deg)', opacity: 1, offset: .58 }, { transform: 'translate(0,4px) rotate(-3deg)', opacity: 1, offset: .7 },
    { transform: 'translate(0,-3px) rotate(2deg)', opacity: 1, offset: .84 }, { transform: 'translate(14px,-26px) rotate(6deg)', opacity: 0 }]), { duration: T, easing: 'linear' });
  const boo = ofxLayer(host, 'pumpkin-boo', P.boo, S, ox, oy);
  bfxAnimate(boo, ofxEase([{ transform: 'scale(.3) rotate(-14deg)', opacity: 0 }, { transform: 'scale(.3) rotate(-14deg)', opacity: 0, offset: .42 },
    { transform: 'scale(1.35) rotate(-4deg)', opacity: 1, offset: .5 }, { transform: 'scale(.94) rotate(1deg)', opacity: 1, offset: .56 }, { transform: 'scale(1.04) rotate(0deg)', opacity: 1, offset: .62 },
    { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: .84 }, { transform: 'scale(1.06) translateY(-8px)', opacity: 0 }]), { duration: T, easing: 'linear' });
  // Green sparkles where the ghost comes out.
  const [sx, sy] = ofxPt(S, ox, oy, [560, 420]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, d = bfxRand(.12, .3) * S, s = bfxRand(10, 18);
    const el = bfxAdd(host, bfxStar4(i % 2 ? '#d9f99d' : '#c084fc'), sx, sy, s, s);
    bfxAnimate(el, [{ transform: 'translate(0,0) scale(0)', opacity: 0 }, { transform: `translate(${Math.cos(a) * d * .6}px,${Math.sin(a) * d * .6}px) scale(1.2) rotate(45deg)`, opacity: 1, offset: .4 },
      { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0) rotate(90deg)`, opacity: 0 }], { duration: 600, delay: 560 + bfxRand(0, 120), easing: 'ease-out' });
  }
}
