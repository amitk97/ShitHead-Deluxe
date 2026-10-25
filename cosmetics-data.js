    const COSMETIC_SHOP_ITEMS = [
      { id: 'back-midnight', category: 'Card Backs', name: 'Midnight Royale', cost: 40, tones: ['#0f172a','#38bdf8','#cbd5e1'] },
      { id: 'back-emerald', category: 'Card Backs', name: 'Emerald Court', cost: 50, tones: ['#052e2b','#34d399','#fbbf24'] },
      { id: 'back-neon', category: 'Card Backs', name: 'Neon Circuit', cost: 60, tones: ['#1e1b4b','#c084fc','#22d3ee'] },
      { id: 'back-crimson', category: 'Card Backs', name: 'Crimson Flame', cost: 60, tones: ['#3f0b1b','#fb7185','#fbbf24'] },
      { id: 'back-nebula', category: 'Card Backs', name: 'Royal Nebula', cost: 200, tones: ['#09051f','#a855f7','#67e8f9'] },
      { id: 'back-inferno', category: 'Card Backs', name: 'Inferno Circuit', cost: 200, tones: ['#1c0710','#f43f5e','#fbbf24'] },
      { id: 'back-tartan', category: 'Card Backs', name: 'Tartan', cost: 100, tones: ['#7f1d1d','#b91c1c','#fde68a'] },
      { id: 'back-arcade', category: 'Card Backs', name: 'Retro Arcade', cost: 150, tones: ['#1e1b4b','#a3e635','#2e1065'] },
      { id: 'back-artdeco', category: 'Card Backs', name: 'Art Deco', cost: 150, tones: ['#0a0a0a','#d4af37','#fde68a'] },
      { id: 'back-space', category: 'Card Backs', name: 'Space', cost: 200, tones: ['#0b1026','#f59e0b','#60a5fa'] },
      { id: 'back-dragon', category: 'Card Backs', name: 'Dragon Scale', cost: 1000, tones: ['#021a19','#14b8a6','#d97706'] },
      { id: 'back-stained', category: 'Card Backs', name: 'Stained Glass', cost: 1000, tones: ['#111111','#b91c1c','#1d4ed8'] },
      { id: 'frame-silver', category: 'Frames', name: 'Silver Edge', cost: 35, tones: ['#1e293b','#cbd5e1','#60a5fa'] },
      { id: 'frame-gold', category: 'Frames', name: 'Golden Crown', cost: 60, tones: ['#422006','#fbbf24','#fef3c7'] },
      { id: 'frame-diamond', category: 'Frames', name: 'Diamond Aura', cost: 90, tones: ['#083344','#22d3ee','#e0f2fe'] },
      { id: 'frame-obsidian-throne', category: 'Frames', name: 'Obsidian Throne', cost: 200, tones: ['#030712','#8b5cf6','#ddd6fe'] },
      { id: 'frame-emerald-sovereign', category: 'Frames', name: 'Emerald Sovereign', cost: 200, tones: ['#022c22','#34d399','#d1fae5'] },
      { id: 'frame-darkness', category: 'Frames', name: 'Darkness', cost: 250, tones: ['#000000','#000000','#1f2937'] },
      // Premium frames (the owner's call): two-tone, dashed and moving edges.
      { id: 'frame-split-crimson', category: 'Frames', name: 'Crimson & White', cost: 500, tones: ['#e11d48','#e11d48','#f8fafc'] },
      { id: 'frame-split-royal', category: 'Frames', name: 'Royal & Gold', cost: 500, tones: ['#2563eb','#2563eb','#fbbf24'] },
      { id: 'frame-split-noir', category: 'Frames', name: 'Noir & Pink', cost: 500, tones: ['#000000','#1f2937','#ec4899'] },
      { id: 'frame-dashed-gold', category: 'Frames', name: 'Dashed Gold', cost: 600, tones: ['#422006','#fbbf24','#fef3c7'] },
      { id: 'frame-neon-tube', category: 'Frames', name: 'Neon Tube', cost: 750, animated: true, tones: ['#500724','#f472b6','#fce7f3'] },
      { id: 'frame-spectrum', category: 'Frames', name: 'Spectrum Spin', cost: 1000, animated: true, tones: ['#2e1065','#a855f7','#22d3ee'] },
      // Decks change the faces of your own cards (a deck theme, § Deck themes);
      // Four-Colour is premium.
      { id: 'deck-casino', category: 'Decks', name: 'Classic Casino', cost: 250, theme: 'theme-casino', tones: ['#faf7ef','#b91c1c','#111827'] },
      { id: 'deck-arcade', category: 'Decks', name: 'Arcade', cost: 250, theme: 'theme-arcade', tones: ['#0a0a12','#a3e635','#f472b6'] },
      { id: 'deck-fourcolour', category: 'Decks', name: 'Four-Colour', cost: 750, theme: 'theme-fourcolour', tones: ['#0f172a','#60a5fa','#4ade80'] },
      { id: 'deck-lavender', category: 'Decks', name: 'Lavender', cost: 250, theme: 'theme-lavender', tones: ['#efe7ff','#a78bfa','#3b0764'] },
      { id: 'deck-paper', category: 'Decks', name: 'Paper Classic', cost: 250, theme: 'theme-paper', tones: ['#fbf8f1','#b91c1c','#1f2937'] },
      { id: 'deck-blueprint', category: 'Decks', name: 'Blueprint', cost: 500, theme: 'theme-blueprint', tones: ['#123a7a','#93c5fd','#e0f2fe'] },
      { id: 'deck-chalk', category: 'Decks', name: 'Chalkboard', cost: 500, theme: 'theme-chalk', tones: ['#1d2a24','#f1f5f9','#fda4af'] },
      { id: 'deck-frost', category: 'Decks', name: 'Frosted Glass', cost: 500, theme: 'theme-frost', tones: ['#1e293b','#e2e8f0','#fda4af'] },
      { id: 'deck-neonnight', category: 'Decks', name: 'Neon Night', cost: 500, theme: 'theme-neonnight', tones: ['#07030f','#67e8f9','#f472b6'] },
      { id: 'deck-royalgold', category: 'Decks', name: 'Royal Gold', cost: 1000, theme: 'theme-royalgold', tones: ['#0b0a10','#d4af37','#f43f5e'] },
      { id: 'emotes-savage', category: 'Emote Packs', name: 'Savage Set', cost: 45, tones: ['#3f1420','#fb7185','#c084fc'] },
      { id: 'emotes-victory', category: 'Emote Packs', name: 'Victory Pack', cost: 50, tones: ['#172033','#fbbf24','#60a5fa'] },
      { id: 'emotes-chaos', category: 'Emote Packs', name: 'Chaos Pack', cost: 200, tones: ['#172033','#f43f5e','#a855f7'] },
      { id: 'emotes-royal', category: 'Emote Packs', name: 'Royal Court', cost: 200, tones: ['#172033','#fbbf24','#d8b4fe'] },
      { id: 'emotes-animals', category: 'Emote Packs', name: 'Animal Pack', cost: 500, tones: ['#14532d', '#f59e0b', '#fde68a'] },
      { id: 'emotes-sports', category: 'Emote Packs', name: 'Sports Pack', cost: 500, tones: ['#0f172a', '#22c55e', '#f8fafc'] },
      { id: 'emotes-flags-europe', category: 'Emote Packs', name: 'European Flags', cost: 750, tones: ['#1e3a8a', '#fbbf24', '#f8fafc'] },
      { id: 'emotes-flags-north-america', category: 'Emote Packs', name: 'North American Flags', cost: 750, tones: ['#1e3a8a', '#ef4444', '#f8fafc'] },
      { id: 'emotes-flags-south-america', category: 'Emote Packs', name: 'South American Flags', cost: 750, tones: ['#14532d', '#facc15', '#38bdf8'] },
      { id: 'emotes-flags-asia', category: 'Emote Packs', name: 'Asian Flags', cost: 750, tones: ['#7f1d1d', '#f97316', '#f8fafc'] },
      { id: 'emotes-flags-africa', category: 'Emote Packs', name: 'African Flags', cost: 750, tones: ['#14532d', '#facc15', '#dc2626'] },
      { id: 'emotes-flags-oceania', category: 'Emote Packs', name: 'Oceania Flags', cost: 750, tones: ['#0c4a6e', '#38bdf8', '#f8fafc'] },
      { id: 'table-casino', category: 'Table Themes', name: 'Luxury Casino', cost: 750, tones: ['#031713','#059669','#d4af37'] },
      { id: 'table-winter', category: 'Table Themes', name: 'Winter Wonderland', cost: 750, tones: ['#082f49','#7dd3fc','#f8fafc'] },
      { id: 'table-midnight', category: 'Table Themes', name: 'Midnight', cost: 750, tones: ['#000000','#1e293b','#e2e8f0'] },
      { id: 'table-candyfloss', category: 'Table Themes', name: 'Candyfloss', cost: 750, tones: ['#f9a8d4','#f0abfc','#fff1f2'] },
      { id: 'table-royal', category: 'Table Themes', name: 'Royal', cost: 750, tones: ['#2e1065','#7c3aed','#fbbf24'] },
      { id: 'table-desert', category: 'Table Themes', name: 'Desert', cost: 1000, tones: ['#c9773f','#e9b872','#fff4cf'] },
      { id: 'table-jungle', category: 'Table Themes', name: 'Jungle', cost: 1000, tones: ['#03220f','#16a34a','#fde68a'] },
      { id: 'table-devilish', category: 'Table Themes', name: 'Devilish', cost: 2000, tones: ['#0a0000','#b91c1c','#000000'] },
      { id: 'table-angelic', category: 'Table Themes', name: 'Angelic', cost: 2000, tones: ['#0b1a5c','#38bdf8','#ffffff'] },
      { id: 'table-neon', category: 'Table Themes', name: 'Neon City', cost: 3000, tones: ['#1a0b2e','#e879f9','#22d3ee'] },
      { id: 'table-aurora', category: 'Table Themes', name: 'Northern Lights', cost: 3000, tones: ['#0b1a2e','#34d399','#e0f2fe'] },
      { id: 'table-space', category: 'Table Themes', name: 'Deep Space', cost: 3000, tones: ['#05060f','#6366f1','#f59e0b'] },
      { id: 'burn-coloured', category: 'Burn Effects', name: 'Coloured Flame', cost: 250, tones: ['#581c87','#ec4899','#22d3ee'] },
      { id: 'burn-ice', category: 'Burn Effects', name: 'Ice Shatter', cost: 500, tones: ['#0c4a6e','#38bdf8','#e0f2fe'] },
      { id: 'burn-electric', category: 'Burn Effects', name: 'Electric Blast', cost: 1000, tones: ['#0c1a3a','#38bdf8','#ffffff'] },
      { id: 'burn-paint', category: 'Burn Effects', name: 'Paint Splats', cost: 750, tones: ['#1e1b4b','#ec4899','#22c55e'] },
      { id: 'burn-sweets', category: 'Burn Effects', name: 'Stupendous Confectionery', cost: 1500, tones: ['#4a044e','#ef4444','#fde68a'] },
      { id: 'burn-smoke', category: 'Burn Effects', name: 'Smoke Show', cost: 2000, tones: ['#0f172a','#64748b','#e2e8f0'] },
      { id: 'burn-blackhole', category: 'Burn Effects', name: 'Black Hole', cost: 2500, tones: ['#020617','#6d28d9','#f59e0b'] },
      { id: 'burn-origami', category: 'Burn Effects', name: 'Origami Fold', cost: 2500, tones: ['#334155','#e2e8f0','#f9a8d4'] },
      { id: 'burn-pixel', category: 'Burn Effects', name: 'Pixel Blast', cost: 2500, tones: ['#1e1b4b','#f97316','#a3e635'] },
      { id: 'burn-lava', category: 'Burn Effects', name: 'Lava Melt', cost: 2500, tones: ['#450a0a','#f97316','#fde047'] },
      { id: 'victory-confetti', category: 'Victory Effects', name: 'Confetti Burst', cost: 250, tones: ['#7c2d12','#fbbf24','#ec4899'] },
      { id: 'victory-cards', category: 'Victory Effects', name: 'Card Shower', cost: 1500, tones: ['#172554','#60a5fa','#f8fafc'] },
      { id: 'victory-fireworks', category: 'Victory Effects', name: 'Fireworks', cost: 750, tones: ['#312e81','#c084fc','#fde047'] },
      { id: 'victory-sparklers', category: 'Victory Effects', name: 'Sparkler Salute', cost: 750, tones: ['#1c1917','#fbbf24','#ffffff'] },
      { id: 'victory-stars', category: 'Victory Effects', name: '5-Star Finish', cost: 1000, tones: ['#1e1b4b','#fbbf24','#fff7d6'] },
      { id: 'victory-karate', category: 'Victory Effects', name: 'Karate Chop', cost: 2000, tones: ['#111827','#f97316','#fde047'] },
      { id: 'victory-trophy', category: 'Victory Effects', name: 'Trophy Lift', cost: 2500, tones: ['#78350f','#fbbf24','#fff7d6'] },
      { id: 'victory-rocket', category: 'Victory Effects', name: 'Rocket Launch', cost: 2500, tones: ['#0b1026','#1e3a8a','#fde68a'] },
      { id: 'victory-origami', category: 'Victory Effects', name: 'Origami Flock', cost: 2500, tones: ['#475569','#fbcfe8','#e0f2fe'] },
      { id: 'victory-lion', category: 'Victory Effects', name: "Lion's Roar", cost: 2500, tones: ['#7c2d12','#d97706','#fde68a'] },
      // Joker Effects (§ Joker effects): rarer than burns, so priced higher.
      { id: 'joker-grin', category: 'Joker Effects', name: "Jester's Grin", cost: 2000, tones: ['#2e1065','#a855f7','#fde047'] },
      { id: 'joker-jackbox', category: 'Joker Effects', name: 'Jack-in-the-Box', cost: 2000, tones: ['#450a0a','#ef4444','#fbbf24'] },
      { id: 'joker-puppet', category: 'Joker Effects', name: 'Puppet Master', cost: 2000, tones: ['#1c1917','#b45309','#f5f5f4'] },
      { id: 'joker-magic', category: 'Joker Effects', name: 'Magic Trick', cost: 2000, tones: ['#0f172a','#6366f1','#e0e7ff'] },
      { id: 'joker-glitch', category: 'Joker Effects', name: 'Glitch', cost: 2000, tones: ['#020617','#22d3ee','#f43f5e'] },
      { id: 'joker-storm', category: 'Joker Effects', name: 'Card Storm', cost: 2000, tones: ['#1e1b4b','#c084fc','#fbbf24'] },
      { id: 'joker-hypnotist', category: 'Joker Effects', name: 'Hypnotist', cost: 3500, tones: ['#3b0764','#e879f9','#ffffff'] },
      { id: 'joker-vampire', category: 'Joker Effects', name: 'Vampire', cost: 3500, tones: ['#111827','#991b1b','#e2e8f0'] },
      { id: 'joker-redcard', category: 'Joker Effects', name: 'Red Card', cost: 3500, tones: ['#14532d','#dc2626','#ffffff'] },
      { id: 'joker-portal', category: 'Joker Effects', name: 'Portal', cost: 3500, tones: ['#020617','#0e7490','#a855f7'] },
      { id: 'avatar-ace-spades', category: 'Avatars', name: 'Ace of Spades', cost: 200, tones: ['#1e293b','#cbd5e1','#f8fafc'] },
      { id: 'avatar-queen-hearts', category: 'Avatars', name: 'Queen of Hearts', cost: 200, tones: ['#3f0b1b','#e11d48','#fbbf24'] },
      { id: 'avatar-joker', category: 'Avatars', name: 'Joker', cost: 200, tones: ['#2e1065','#a855f7','#10b981'] },
      { id: 'avatar-burn-flame', category: 'Avatars', name: 'Burn Flame', cost: 500, tones: ['#431407','#f97316','#fcd34d'] },
      { id: 'avatar-ghost', category: 'Avatars', name: 'Transparent Ghost', cost: 500, tones: ['#1e293b','#94a3b8','#f8fafc'] },
      { id: 'avatar-frozen', category: 'Avatars', name: 'Frozen', cost: 500, tones: ['#0c4a6e','#38bdf8','#e0f2fe'] },
      { id: 'avatar-burning-ten', category: 'Avatars', name: 'Burning 10', cost: 1000, animated: true, tones: ['#431407','#f97316','#fcd34d'] },
      { id: 'avatar-fanned-hand', category: 'Avatars', name: 'Fanned Hand', cost: 1000, animated: true, tones: ['#0f172a','#e11d48','#fbbf24'] },
      { id: 'avatar-joker-card', category: 'Avatars', name: 'Joker Card', cost: 1000, animated: true, tones: ['#2e1065','#a855f7','#fbbf24'] },
      { id: 'avatar-royal-flush', category: 'Avatars', name: 'Royal Flush', cost: 2500, animated: true, tones: ['#150f03','#fbbf24','#f8fafc'] },
      { id: 'avatar-cosmic-ace', category: 'Avatars', name: 'Cosmic Ace', cost: 2500, animated: true, tones: ['#05030f','#a78bfa','#fcd34d'] },
      // Premium emblems (5000): the top of the Shop's picture range.
      { id: 'avatar-sapphire-sovereign', category: 'Avatars', name: 'Sapphire Sovereign', cost: 5000, animated: true, tones: ['#050b1f','#3b82f6','#fbbf24'] },
      { id: 'avatar-crimson-inferno', category: 'Avatars', name: 'Crimson Inferno', cost: 5000, animated: true, tones: ['#0a0612','#ef4444','#fbbf24'] },
      { id: 'avatar-scarlet-guardian', category: 'Avatars', name: 'Scarlet Guardian', cost: 5000, animated: true, tones: ['#080a18','#dc2626','#fde047'] },
      { id: 'avatar-turtley', category: 'Avatars', name: 'Turtley', cost: 5000, animated: true, tones: ['#03140c','#10b981','#fbbf24'] },
      // London Calling (v438): one UK-themed set, Blender renders (tools/london/).
      { id: 'avatar-ldn-guard', category: 'Avatars', name: 'Royal Guardsman', cost: 2500, ldn: true, tone: '#c8102e', file: 'art/avatars/ldn-guard2.webp', tones: ['#012169','#c8102e','#f4f1ea'] },
      { id: 'back-ldn-bigben', category: 'Card Backs', name: 'Union Jack', cost: 1000, ldn: true, tone: '#e8bd6a', file: 'art/backs/ldn-unionjack.webp', tones: ['#012169','#c8102e','#e8bd6a'] },
      { id: 'table-ldn-thames', category: 'Table Themes', name: 'Thames Nights', cost: 3000, ldn: true, tones: ['#050a24','#17255a','#e8bd6a'] },
      { id: 'deck-ldn-tube', category: 'Decks', name: 'Underground', cost: 1000, ldn: true, theme: 'theme-tube', tones: ['#0b1636','#e32219','#ffffff'] },
      { id: 'frame-ldn-unionjack', category: 'Frames', name: 'Union Jack', cost: 1000, ldn: true, tones: ['#012169','#c8102e','#ffffff'] },
      { id: 'burn-ldn-routemaster', category: 'Burn Effects', name: 'Routemaster Rush', cost: 2500, ldn: true, tones: ['#2a0a10','#c8102e','#ffd36b'] },
      { id: 'joker-ldn-phonebox', category: 'Joker Effects', name: 'Phone Box Prank', cost: 3500, ldn: true, tones: ['#2a0a10','#c8102e','#fff0c8'] },
      { id: 'victory-ldn-towerbridge', category: 'Victory Effects', name: 'Tower Bridge Salute', cost: 2500, ldn: true, tones: ['#050a24','#3b6fb8','#e8bd6a'] },
      { id: 'emotes-ldn', category: 'Emote Packs', name: 'London Pack', cost: 500, ldn: true, tones: ['#012169','#c8102e','#f4f1ea'] },
      // Mumbai Masala (v442): a nine-item set rendered in Blender (tools/mumbai).
      { id: 'avatar-mum-dabba', category: 'Avatars', name: 'Dabbawala', cost: 2500, mum: true, tone: '#f2b200', file: 'art/avatars/mum-dabba.webp', tones: ['#d63a6e','#f2b200','#f4f1ea'] },
      { id: 'back-mum-marigold', category: 'Card Backs', name: 'Marigold Garland', cost: 1000, mum: true, tone: '#e8bd6a', file: 'art/backs/mum-marigold.webp', tones: ['#6a1038','#ff9a00','#e8bd6a'] },
      { id: 'table-mum-marine', category: 'Table Themes', name: 'Marine Drive Nights', cost: 3000, mum: true, tones: ['#120a32','#c2476a','#f2b200'] },
      { id: 'deck-mum-chai', category: 'Decks', name: 'Masala Chai', cost: 1000, mum: true, theme: 'theme-chai', tones: ['#f3e3c3','#a8431f','#3a2314'] },
      { id: 'frame-mum-kaalipeeli', category: 'Frames', name: 'Kaali Peeli', cost: 1000, mum: true, tones: ['#15110f','#f2b200','#15110f'] },
      { id: 'burn-mum-monsoon', category: 'Burn Effects', name: 'Monsoon Deluge', cost: 2500, mum: true, tones: ['#06101f','#0ea5e9','#7dd3fc'] },
      { id: 'joker-mum-tiffin', category: 'Joker Effects', name: 'Tiffin Surprise', cost: 3500, mum: true, tones: ['#4a0d2a','#ff9a00','#c6ccd4'] },
      { id: 'victory-mum-gateway', category: 'Victory Effects', name: 'Gateway Gala', cost: 2500, mum: true, tones: ['#120a32','#d3a656','#ff9a00'] },
      { id: 'emotes-mum', category: 'Emote Packs', name: 'Mumbai Pack', cost: 500, mum: true, tones: ['#6a1038','#f2b200','#ff9a00'] }
    ];
    // Classic Reactions ships with the game. It remains selectable for old
    // saves, but is intentionally not a purchasable Shop item.
    const BUILT_IN_COSMETICS = [
      { id: 'back-cobalt-linen', category: 'Card Backs', name: 'Cobalt Linen', cost: 0, builtIn: true, tones: ['#24468b','#e8dfcd','#d6c59a'] },
      { id: 'back-sage-linen', category: 'Card Backs', name: 'Sage Linen', cost: 0, builtIn: true, tones: ['#718a72','#e8dfcd','#d6c59a'] },
      { id: 'back-plum-linen', category: 'Card Backs', name: 'Plum Linen', cost: 0, builtIn: true, tones: ['#69365e','#e8dfcd','#d6c59a'] },

      { id: 'emotes-classic', category: 'Emote Packs', name: 'Classic Reactions', cost: 0, builtIn: true, tones: ['#172033','#34d399','#fbbf24'] },
      // The four original decks stay free.
      { id: 'deck-obsidian', category: 'Decks', name: 'Obsidian', cost: 0, builtIn: true, theme: 'theme-obsidian', tones: ['#0f172a','#ef4444','#f8fafc'] },
      { id: 'deck-emerald', category: 'Decks', name: 'Emerald', cost: 0, builtIn: true, theme: 'theme-emerald', tones: ['#064e3b','#fca5a5','#ecfdf5'] },
      { id: 'deck-cyber', category: 'Decks', name: 'Cyber', cost: 0, builtIn: true, theme: 'theme-cyber', tones: ['#1e1b4b','#fb7185','#38bdf8'] },
      { id: 'deck-crimson', category: 'Decks', name: 'Crimson', cost: 0, builtIn: true, theme: 'theme-crimson', tones: ['#450a0a','#fb7185','#fef2f2'] },
      { id: 'deck-bigprint', category: 'Decks', name: 'Big Print', cost: 0, builtIn: true, theme: 'theme-bigprint', tones: ['#ffffff','#0b0b0f','#c1121f'] },
      // Free tables: real-looking wood and card-room felt.
      { id: 'table-wood', category: 'Table Themes', name: 'Oak Wood', cost: 0, builtIn: true, tones: ['#6b4226','#a06a3c','#f3d9b1'] },
      { id: 'table-felt', category: 'Table Themes', name: 'Classic Felt', cost: 0, builtIn: true, tones: ['#1f5a36','#2f7a4a','#d1fae5'] },
      // Free profile pictures. Bronze Crown is also what 'default' shows.
      { id: 'avatar-crown-bronze', category: 'Avatars', name: 'Bronze Crown', cost: 0, builtIn: true },
      { id: 'avatar-suit-spades', category: 'Avatars', name: 'Spades', cost: 0, builtIn: true },
      { id: 'avatar-suit-hearts', category: 'Avatars', name: 'Hearts', cost: 0, builtIn: true },
      { id: 'avatar-suit-diamonds', category: 'Avatars', name: 'Diamonds', cost: 0, builtIn: true },
      { id: 'avatar-suit-clubs', category: 'Avatars', name: 'Clubs', cost: 0, builtIn: true }
    ];
    // Earn-only profile pictures: never sold. Unlocked by ranked milestones
    // (see grantEarnedAvatars) and then recorded in ownedCosmetics like any
    // other owned item, so they stay unlocked even if rating later drops.
    // Platinum Crown keeps its original id (avatar-crown-diamond) so existing
    // ownership and the Database Rules id list stay valid.
    const EARNED_AVATARS = [
      { id: 'avatar-crown-silver', category: 'Avatars', name: 'Silver Crown', earned: true, requirement: 'Reach Silver rank', isEarned: (u) => avatarPeakRating(u) >= 1000 },
      { id: 'avatar-crown-gold', category: 'Avatars', name: 'Gold Crown', earned: true, requirement: 'Reach Gold rank', isEarned: (u) => avatarPeakRating(u) >= 1500 },
      { id: 'avatar-crown-diamond', category: 'Avatars', name: 'Platinum Crown', earned: true, animated: true, requirement: 'Reach Platinum rank', isEarned: (u) => avatarPeakRating(u) >= 1800 },
      { id: 'avatar-crown-master', category: 'Avatars', name: 'Master Crown', earned: true, animated: true, requirement: 'Reach Master rank', isEarned: (u) => avatarPeakRating(u) >= 2000 },
      { id: 'avatar-centurion', category: 'Avatars', name: 'Centurion', earned: true, requirement: 'Play 100 ranked games', isEarned: (u) => ((Number(u?.wins) || 0) + (Number(u?.losses) || 0)) >= 100 },
      { id: 'avatar-shithead', category: 'Avatars', name: 'ShitHead', earned: true, requirement: 'Lose 10 ranked games in a row', isEarned: (u) => (Number(u?.rankedStats?.bestLossStreak) || 0) >= 10 },
      { id: 'avatar-gauntlet', category: 'Avatars', name: 'Gauntlet Champion', earned: true, gauntlet: true, requirement: 'Beat the Gauntlet', isEarned: () => false },
      { id: 'avatar-gauntlet-hard', category: 'Avatars', name: 'Gauntlet Conqueror', earned: true, gauntlet: true, requirement: 'Beat the Hard Gauntlet', isEarned: () => false },
      { id: 'avatar-gauntlet-boss', category: 'Avatars', name: 'Gauntlet Overlord', earned: true, gauntlet: true, requirement: 'Beat the Boss Gauntlet', isEarned: () => false },
      { id: 'avatar-recruiter', category: 'Avatars', name: 'Recruiter', earned: true, referral: true, requirement: 'Recruit 5 players', isEarned: () => false },
      { id: 'avatar-twos', category: 'Avatars', name: 'Dream Team', earned: true, animated: true, twos: true, requirement: 'Win 10 games of 2 vs 2', isEarned: () => false }
    ];
    // Earn-only frames: never sold or gifted, shown locked in Custom until
    // the server grants them (Gauntlet Gold: beat the Gauntlet once).
    const EARNED_FRAMES = [
      { id: 'frame-gauntlet', category: 'Frames', name: 'Gauntlet Gold', earned: true, cost: 0, requirement: 'Beat the Gauntlet', tones: ['#1c0a02', '#f59e0b', '#fde68a'] },
      { id: 'frame-gauntlet-hard', category: 'Frames', name: 'Crimson Gauntlet', earned: true, cost: 0, requirement: 'Beat the Hard Gauntlet', tones: ['#1c0206', '#e11d48', '#fde68a'] },
      { id: 'frame-gauntlet-boss', category: 'Frames', name: 'Amethyst Gauntlet', earned: true, cost: 0, requirement: 'Beat the Boss Gauntlet', tones: ['#12031f', '#a855f7', '#fde68a'] }
    ];
    // Level rewards (v251, owner): earn-only avatars and card backs that
    // unlock with levels, so a level is something to show off (§ XP & levels).
    // The owner's own HD artwork, cut from docs/avatar-art/src/
    // level-rewards-sheet.webp by tools/make-level-rewards.py into
    // art/avatars/lvl-*.webp and art/backs/lvl-*.webp. Never sold or gifted;
    // the server grants them into ownedCosmetics once the account's level
    // reaches them (xp.grantLevelRewards, catalog xp.rewards). The v248 set
    // (Rising Star, Ascendant, Summit) was removed in v251 (owner).
    const LEVEL_ART_V = 251;
    const LEVEL_REWARDS = [
      { id: 'avatar-lvl-rookie-rogue', category: 'Avatars', name: 'Rookie Rogue', level: 10, tone: '#c2703a' },
      { id: 'avatar-lvl-card-shark', category: 'Avatars', name: 'Card Shark', level: 25, tone: '#60a5fa' },
      { id: 'avatar-lvl-burn-king', category: 'Avatars', name: 'Burn King', level: 50, tone: '#f59e0b' },
      { id: 'avatar-lvl-chaos-jester', category: 'Avatars', name: 'Chaos Jester', level: 75, tone: '#c084fc' },
      { id: 'avatar-lvl-the-shithead', category: 'Avatars', name: 'The ShitHead', level: 99, tone: '#fbbf24', animated: true },
      { id: 'back-lvl-first-burn', category: 'Card Backs', name: 'First Burn', level: 10, tone: '#ea7a36' },
      { id: 'back-lvl-sharks-mark', category: 'Card Backs', name: "Shark's Mark", level: 30, tone: '#7dd3fc' },
      { id: 'back-lvl-inferno', category: 'Card Backs', name: 'Inferno', level: 50, tone: '#fb923c' },
      { id: 'back-lvl-chaos-crown', category: 'Card Backs', name: 'Chaos Crown', level: 70, tone: '#c084fc' },
      { id: 'back-lvl-master-pile', category: 'Card Backs', name: 'Master of the Pile', level: 99, tone: '#fbbf24' },
      // Burns (v253): animated in code (§ Level burns, LEVEL_BURN_IDS), from the owner's art.
      { id: 'burn-lvl-spark-snap', category: 'Burn Effects', name: 'Spark Snap', level: 5, tone: '#fb923c' },
      { id: 'burn-lvl-smoke-burst', category: 'Burn Effects', name: 'Smoke Burst', level: 20, tone: '#ef4444' },
      { id: 'burn-lvl-inferno-sweep', category: 'Burn Effects', name: 'Inferno Sweep', level: 40, tone: '#f97316' },
      { id: 'burn-lvl-hellfire-spiral', category: 'Burn Effects', name: 'Hellfire Spiral', level: 60, tone: '#dc2626' },
      { id: 'burn-lvl-royal-incineration', category: 'Burn Effects', name: 'Royal Incineration', level: 80, tone: '#fbbf24' },
      { id: 'burn-lvl-shitstorm', category: 'Burn Effects', name: 'The ShitStorm', level: 99, tone: '#f59e0b' }
    ].map(r => ({ ...r, earned: true, cost: 0, requirement: `Reach Lvl ${r.level}`, tones: ['#07070c', r.tone, '#f8fafc'],
      ...(r.category === 'Avatars' || r.category === 'Card Backs' ? { file: `art/${r.category === 'Avatars' ? 'avatars' : 'backs'}/${r.id.replace(/^(avatar|back)-/, '')}.webp?v=${LEVEL_ART_V}` } : {}) }));
    const LEVEL_BACK_IDS = LEVEL_REWARDS.filter(r => r.category === 'Card Backs').map(r => r.id);

    // § Season Pass (PREVIEW, not live: owner approval pending). Free track only for now (no Premium).
    // A season is two calendar months (UK days), keyed by its start month. Season XP is the XP the player
    // already earns; a tier's rewards are granted the moment the tier is reached (no claiming).
    // The free-track items are earn-only cosmetics: they live in LEVEL_REWARDS (level 0, `pass` = season key) so
    // Custom, Collection, previews and equipping treat them like the other earned items.
    const SEASON_PASS = {
      tiers: 50,
      // Season XP per tier: quick first rewards, dearer at the end (20,000 in all).
      tierCost: (t) => t <= 10 ? 250 : t <= 40 ? 400 : 550,
      // Diamonds on every tier; milestones every 5th, bigger ones on the item tiers.
      diamonds: (t) => t === 50 ? 150 : (t === 10 || t === 30) ? 50 : t % 5 === 0 ? 60 : 15,
      seasons: {
        '2026-11': {
          number: 1, name: 'Ancient Egypt', start: '2026-11-01', end: '2026-12-31', accent: '#f5c542',
          banner: 'art/season-pass/ss2611/banner.webp',
          items: { 10: 'back-ss2611-scarab', 30: 'avatar-ss2611-pharaoh', 40: 'burn-ss2611-sandstorm', 50: 'table-ss2611-egypt' }
        },
        '2027-01': {
          number: 2, name: 'Ice Age', start: '2027-01-01', end: '2027-02-28', accent: '#7fd4ff',
          banner: 'art/season-pass/ss2701/banner.webp',
          items: { 10: 'back-ss2701-mammoth', 30: 'avatar-ss2701-mammoth', 40: 'burn-ss2701-glacier', 50: 'table-ss2701-glacier' }
        },
        '2027-03': {
          number: 3, name: 'Feudal Japan', start: '2027-03-01', end: '2027-04-30', accent: '#ff8fb1',
          banner: 'art/season-pass/ss2703/banner.webp',
          items: { 10: 'back-ss2703-sakura', 20: 'burn-origami', 30: 'avatar-ss2703-kitsune', 40: 'burn-ss2703-shuriken', 50: 'table-ss2703-shrine' }
        },
        '2027-05': {
          number: 4, name: 'Deep Ocean', start: '2027-05-01', end: '2027-06-30', accent: '#35d0c9',
          banner: 'art/season-pass/ss2705/banner.webp',
          items: { 10: 'back-ss2705-deep', 30: 'avatar-ss2705-octopus', 40: 'burn-ss2705-whirlpool', 50: 'table-ss2705-reef' }
        },
        '2027-07': {
          number: 5, name: 'Ancient Greece', start: '2027-07-01', end: '2027-08-31', accent: '#f0c060',
          banner: 'art/season-pass/ss2707/banner.webp',
          items: { 10: 'back-ss2707-pegasus', 30: 'avatar-ss2707-pegasus', 40: 'burn-ss2707-zeus', 50: 'table-ss2707-olympus' }
        },
        '2027-09': {
          number: 6, name: 'Dark Magic', start: '2027-09-01', end: '2027-10-31', accent: '#b36bff',
          banner: 'art/season-pass/ss2709/banner.webp',
          items: { 10: 'back-ss2709-cauldron', 30: 'avatar-ss2709-witch', 40: 'burn-ss2709-hex', 50: 'table-ss2709-tower' }
        }
      }
    };
    const SEASON_PASS_ITEMS = [
      { id: 'back-ss2611-scarab', category: 'Card Backs', name: 'Scarab of Ra', tier: 10, tone: '#f5c542', file: 'art/backs/ss2611-scarab.webp' },
      { id: 'avatar-ss2611-pharaoh', category: 'Avatars', name: 'Sphinx Cub', tier: 30, tone: '#f5c542', file: 'art/avatars/ss2611-pharaoh.webp' },
      { id: 'table-ss2611-egypt', category: 'Table Themes', name: 'Sands of Giza', tier: 50, tone: '#f59e0b' },
      { id: 'back-ss2701-mammoth', category: 'Card Backs', name: 'Frost Mammoth', tier: 10, tone: '#7fd4ff', file: 'art/backs/ss2701-mammoth.webp', pass: '2027-01' },
      { id: 'avatar-ss2701-mammoth', category: 'Avatars', name: 'Baby Mammoth', tier: 30, tone: '#7fd4ff', file: 'art/avatars/ss2701-mammoth.webp', pass: '2027-01' },
      { id: 'table-ss2701-glacier', category: 'Table Themes', name: 'Frozen Path', tier: 50, tone: '#7fd4ff', pass: '2027-01' },
      { id: 'back-ss2703-sakura', category: 'Card Backs', name: 'Sakura Crest', tier: 10, tone: '#ff8fb1', file: 'art/backs/ss2703-sakura.webp', pass: '2027-03' },
      { id: 'avatar-ss2703-kitsune', category: 'Avatars', name: 'Kitsune Cub', tier: 30, tone: '#ff8fb1', file: 'art/avatars/ss2703-kitsune.webp', pass: '2027-03' },
      { id: 'table-ss2703-shrine', category: 'Table Themes', name: 'Moonlit Shrine', tier: 50, tone: '#ff8fb1', pass: '2027-03' },
      { id: 'back-ss2705-deep', category: 'Card Backs', name: 'Deep Treasure', tier: 10, tone: '#35d0c9', file: 'art/backs/ss2705-deep.webp', pass: '2027-05' },
      { id: 'avatar-ss2705-octopus', category: 'Avatars', name: 'Pearl Octopus', tier: 30, tone: '#35d0c9', file: 'art/avatars/ss2705-octopus.webp', pass: '2027-05' },
      { id: 'table-ss2705-reef', category: 'Table Themes', name: 'Coral Reef', tier: 50, tone: '#35d0c9', pass: '2027-05' },
      { id: 'back-ss2707-pegasus', category: 'Card Backs', name: 'Marble Pegasus', tier: 10, tone: '#f0c060', file: 'art/backs/ss2707-pegasus.webp', pass: '2027-07' },
      { id: 'avatar-ss2707-pegasus', category: 'Avatars', name: 'Baby Pegasus', tier: 30, tone: '#f0c060', file: 'art/avatars/ss2707-pegasus.webp', pass: '2027-07' },
      { id: 'table-ss2707-olympus', category: 'Table Themes', name: 'Olympus Terrace', tier: 50, tone: '#f0c060', pass: '2027-07' },
      { id: 'back-ss2709-cauldron', category: 'Card Backs', name: 'Witch\'s Cauldron', tier: 10, tone: '#b36bff', file: 'art/backs/ss2709-cauldron.webp', pass: '2027-09' },
      { id: 'avatar-ss2709-witch', category: 'Avatars', name: 'Little Witch', tier: 30, tone: '#b36bff', file: 'art/avatars/ss2709-witch.webp', pass: '2027-09' },
      { id: 'table-ss2709-tower', category: 'Table Themes', name: 'Alchemy Cellar', tier: 50, tone: '#b36bff', pass: '2027-09' },
      { id: 'burn-ss2611-sandstorm', category: 'Burn Effects', name: 'Sandstorm Vortex', tier: 40, tone: '#f5c542', pass: '2026-11' },
      { id: 'burn-ss2701-glacier', category: 'Burn Effects', name: 'Glacial Shatter', tier: 40, tone: '#7fd4ff', pass: '2027-01' },
      { id: 'burn-ss2703-shuriken', category: 'Burn Effects', name: 'Shuriken Barrage', tier: 40, tone: '#ff8fb1', pass: '2027-03' },
      { id: 'burn-ss2705-whirlpool', category: 'Burn Effects', name: 'Abyssal Whirlpool', tier: 40, tone: '#35d0c9', pass: '2027-05' },
      { id: 'burn-ss2707-zeus', category: 'Burn Effects', name: "Zeus's Bolt", tier: 40, tone: '#f0c060', pass: '2027-07' },
      { id: 'burn-ss2709-hex', category: 'Burn Effects', name: 'Arcane Hex', tier: 40, tone: '#b36bff', pass: '2027-09' }
    ].map(r => ({ pass: '2026-11', ...r, level: 0, earned: true, cost: 0, requirement: `Season Pass tier ${r.tier}`, tones: ({ '2027-01': ['#0a1f3d', r.tone, '#e8f7ff'], '2027-03': ['#1a1033', r.tone, '#ffe3ec'], '2027-05': ['#06253a', r.tone, '#d9fffb'], '2027-07': ['#4a3a22', r.tone, '#fff2cf'], '2027-09': ['#150a2e', r.tone, '#e6d2ff'] })[r.pass] || ['#150c30', r.tone, '#ffd58a'] }));
    LEVEL_REWARDS.push(...SEASON_PASS_ITEMS);
