    const TUTORIAL_STEPS_FULL_LEGACY = [
      {
        text: "Welcome! I'm your Coach. We'll play real hands together, step by step. Your goal: get rid of every card you hold. The last player still holding cards is the ShitHead.",
        target: null
      },
      {
        text: "These are your Hand cards. You play from here first, topping back up to 3 from the Deck after every turn, for as long as the Deck lasts.",
        target: '#localHand'
      },
      {
        text: "Below your Hand sit your Table cards — 3 Face-Up, with 3 more Face-Down underneath them. They're locked away until your Hand AND the Deck are both completely empty.",
        target: '#localTableSlots'
      },
      {
        text: "Every game opens with a Swap Phase. Whatever's Face-Up on your Table is what you'll be stuck playing dead last — so this is your one chance to stash your best cards there.",
        target: '#localPlayerZone',
        phase: 'SWAP',
        scene: { phase: 'SWAP', hand: [['2', '♣'], ['10', '♦'], ['7', '♠']], faceUp: [['4', '♥'], ['5', '♠'], ['6', '♣']], coach: [['9', '♥']] }
      },
      {
        text: "Your 2 is one of the strongest cards in the game and it's stuck in your Hand — your 4 is one of the weakest and it's sitting safely Face-Up. Tap your 2, then tap the 4, to swap them.",
        target: '#localPlayerZone',
        phase: 'SWAP',
        scene: { phase: 'SWAP', hand: [['2', '♣'], ['10', '♦'], ['7', '♠']], faceUp: [['4', '♥'], ['5', '♠'], ['6', '♣']], coach: [['9', '♥']] },
        require: { swap: true, handRank: '2', faceUpRank: '4' },
        coachNote: "Much better — that 2 will be waiting right at the end of the game now."
      },
      {
        text: "Rule of thumb: stash HIGH cards and the power cards — 2, 3, 10, Ace, Joker — Face-Up. Swap as many as you like, then hit READY when you're happy.",
        target: '#localPlayerZone',
        phase: 'SWAP',
        scene: { phase: 'SWAP', hand: [['4', '♥'], ['10', '♦'], ['7', '♠']], faceUp: [['2', '♣'], ['5', '♠'], ['6', '♣']], coach: [['9', '♥']] },
        require: { ready: true },
        coachNote: "Game on. Now let's actually play a hand together — for real this time."
      },

      // ---------------------------------------------------------------
      // STEP 7 — the deal. Opens the ONE continuous stacked hand that
      // runs all the way through Step 15.
      // ---------------------------------------------------------------
      {
        text: "Fresh deal. The Coach has already opened with an Ace. Both your 8s are dead against it — nothing beats an Ace except your 2. Play it.",
        target: ['#localHand', '#centerArena'],
        scene: {
          hand: [['8', '♠'], ['8', '♦'], ['2', '♥']],
          faceUp: [['K', '♠'], ['K', '♥'], ['K', '♦']],
          faceDown: [['3', '♠'], ['3', '♥'], ['3', '♦']],
          coach: [['4', '♦'], ['4', '♥'], ['2', '♠']],
          coachFaceUp: [['6', '♠'], ['6', '♥'], ['10', '♥']],
          coachFaceDown: [['7', '♣'], ['7', '♠'], ['10', '♣']],
          pile: [['A', '♣']],
          drawPile: [['3', '♣'], ['4', '♣'], ['5', '♠'], ['J', '♦'], ['9', '♣'], ['9', '♦'], ['K', '♣'], ['A', '♠'], ['A', '♥']]
        },
        require: { rank: '2' },
        coachPlays: [['7', '♦']],
        coachNote: "A 2 RESETS the Pile — nothing was safe from it, not even the Coach's Ace. The Coach answers with a 7: that forces you to play 7-or-LOWER next."
      },
      {
        text: "The Coach needs 7 or lower. Your drawn 3 is the TRANSPARENT card — legal on almost anything, and it passes the Coach's requirement straight through to whoever's next. Play it.",
        target: ['#localHand', '#centerArena'],
        require: { rank: '3' },
        coachPlays: [['6', '♣']],
        coachNote: "Right through, and the Coach still needed 7 or lower underneath it. The Coach's 6 sets a new rule: you now need an EVEN card."
      },
      {
        text: "Even card needed. Your drawn 4 qualifies. Play it.",
        target: ['#localHand', '#centerArena'],
        require: { rank: '4' },
        coachPlays: [['7', '♥']],
        coachNote: "Good. The Coach has played another 7 — 7 or lower again."
      },
      {
        text: "7 or lower again — your drawn 5 fits. But a 5 does something extra: it drops the target all the way down to the very first card played this hand, the Coach's opening Ace. Play it and notice the Base Card indicator.",
        target: ['#localHand', '#centerArena'],
        highlightBaseCard: true,
        require: { rank: '5' },
        coachPlays: [
          { cards: [['10', '♠']], pauseNote: "That's a 10 — the Coach's BURN card. It doesn't just beat whatever's showing, it destroys the entire Pile outright. Tap Continue to watch it happen." },
          [['4', '♠']]
        ],
        coachNote: "Burnt! The Coach goes again immediately after burning and drops a 4 on the empty Pile. Take a look at the Recent Card History strip below — it shows exactly what got burned and by whom."
      },
      {
        text: "See the Select All Of A Rank button beside your hand count (the three cards)? Switch it on. While it's on, tapping one card of a rank grabs every card of that rank at once — perfect for playing sets in a single tap.",
        target: '#multiSelectToggleBtn',
        require: { toggleRankSelect: 'on' },
        coachNote: "Toggle's live. You can flip it on or off whenever suits you — it's a tactic, not a setting you're stuck with."
      },
      {
        text: "You're holding two 8s. An 8 SKIPS the next player — tap one, both get selected automatically, then play them together.",
        target: ['#localHand', '#centerArena'],
        require: { rank: '8', count: 2 },
        noCoachReply: true,
        coachNote: "Skipped! With just the two of you at the table, skipping the Coach's only turn just means it's straight back to you — the Coach never even got a look in."
      },
      {
        text: "Since it's still your go, play your Jack — it beats your own 8 easily, and it forces whoever's next to play ODD.",
        target: ['#localHand', '#centerArena'],
        require: { rank: 'J' },
        coachPlays: [['9', '♠']],
        coachNote: "The Coach needed ODD — and answered with a 9; odd numbers satisfy that rule even when they're smaller than the card they're following. A 9 also has its own quirk: it reverses the order players take their turns in — with just the two of you at this table, though, there's no one else to reverse past, so it's completely powerless here. Keep that number in mind anyway."
      },
      {
        text: "You're holding two 9s now — with the toggle still locked on from before, tap one and both get selected. One 9 is already down on the Pile, so playing your two makes three.",
        target: ['#localHand', '#centerArena'],
        require: { rank: '9', count: 2 },
        coachPlays: [
          { cards: [['9', '♥']], pauseNote: "Four 9s in a row! Four-of-a-kind burns the Pile automatically — no 10 needed for this one. Tap Continue to see it burn." },
          [['J', '♣']]
        ],
        coachNote: "Burnt again! The Coach goes again and drops a Jack: that demands an ODD card next."
      },
      {
        text: "Odd card needed — but your King beats it on raw value too. Play it.",
        target: ['#localHand', '#centerArena'],
        require: { rank: 'K' },
        noCoachReply: true,
        coachNote: "Queen, King and Ace have no special power of their own — they're just the three highest cards in the deck. Nothing the Coach is holding beats a King, so the Coach is forced to scoop up the whole Pile. Rough end to that hand!"
      },

      // ---------------------------------------------------------------
      // STEP 16 — deliberate full reset into the endgame stacked mini-deal.
      // ---------------------------------------------------------------
      {
        text: "A few rules are still ahead, but let's jump straight to the part that actually decides most games: the endgame. Fresh Hands, fresh Tables, and the Deck's already run dry for both of you.",
        target: '#localPlayerZone',
        scene: {
          hand: [['JOKER', 'JOKER'], ['2', '♣'], ['A', '♦']],
          faceUp: [['Q', '♠'], ['Q', '♥'], ['Q', '♦']],
          faceDown: [['J', '♠'], ['10', '♦'], ['J', '♥']],
          coach: [['5', '♦'], ['JOKER', 'JOKER'], ['Q', '♣']],
          pile: [['6', '♦']],
          emptyDeck: true
        }
      },
      {
        text: "The Coach has opened with a 6 — you need an EVEN card. Your Ace and your Joker could both eventually help you, so save them: play your 2 instead, it's legal on almost anything.",
        target: ['#localHand', '#centerArena'],
        require: { rank: '2' },
        coachPlays: [['5', '♦']],
        coachNote: "The Coach's 5 drops the target back down to the 6 the Coach opened with — and a 6 needs EVEN."
      },
      {
        text: "Even card needed again. Your Ace counts as even in this game — yes, really. Play it.",
        target: ['#localHand', '#centerArena'],
        highlightBaseCard: true,
        require: { rank: 'A' },
        coachPlays: [
          {
            cards: [['JOKER', 'JOKER']],
            pauseNote: "The Coach throws down a Joker — it forces whoever it's aimed at to scoop the entire Pile. Normally, if the target already holds a Joker of their own, this counters instantly and automatically the moment it lands. Tap Continue and you'll get to try that yourself.",
            advanceOnly: true
          }
        ],
        coachNote: "Countered!"
      },
      {
        text: "Now answer it — you're holding a Joker too. Play it to counter. (This step is only slowed down so you can see it happen; normally a held counter-Joker resolves the instant it's needed, with no extra tap.)",
        target: ['#localHand', '#centerArena'],
        require: { rank: 'JOKER' },
        coachNote: "Countered — because you matched the Coach's Joker with one of your own, the Coach is the one who has to pick up everything instead, and you keep the turn. Both Jokers vanish from the game the instant they're played — that's always true, win or lose the duel."
      },
      {
        text: "Hand's empty, Deck's empty — your Face-Up cards just unlocked. Switch Select All Of A Rank back off: from here on, every card matters on its own.",
        target: '#multiSelectToggleBtn',
        require: { toggleRankSelect: 'off' },
        coachNote: "Toggle's off. Each of your three Queens is now its own decision."
      },
      {
        text: "Play one of your Face-Up Queens.",
        target: ['#localTableSlots', '#centerArena'],
        require: { rank: 'Q', count: 1 },
        coachPlays: [['Q', '♣']],
        coachNote: "Matched — the Coach played a Queen right back. Watch closely — you're about to see something new."
      },
      {
        text: "See that pulsing Snap Burn button next to the Base Card? Whenever the top of the Pile already matches cards you're holding, you can slap it to play them all at once, out of turn — genuinely out of turn, too: in a 3- or 4-player game you could snap in even while someone else's turn is happening. You're holding the other two Queens — hit the Snap Burn button now for an instant burn.",
        target: ['#localTableSlots', '#centerArena'],
        require: { rank: 'Q', count: 2, requireSnap: true },
        noCoachReply: true,
        coachNote: "Four Queens, gone in one tap — your Face-Up cards are cleared out, and a burn means you go again immediately. Your blind Face-Down cards just unlocked."
      },
      {
        text: "You can't see Face-Down cards until you flip them — it's a genuine gamble. Try the middle one.",
        target: ['#localTableSlots', '#centerArena'],
        require: { blind: true, blindSlot: 1 },
        blindPause: "That's a 10 — even flipped completely blind, it's still the BURN card. Tap Continue to see it destroy the Pile.",
        noCoachReply: true,
        coachNote: "Burnt — and blind! Instant burn regardless, and you're straight back in with another go."
      },
      {
        text: "One more blind flip. Left or right, your call.",
        target: ['#localTableSlots', '#centerArena'],
        highlightBaseCard: true,
        require: { blind: true },
        coachPlays: [['5', '♦']],
        coachNote: "A Jack — needs an ODD card next. The Coach's only legal card left is that same 5 picked up earlier, which drops the target down to your Jack. A Jack itself needs ODD."
      },
      {
        text: "Odd card needed, and it's the last card anywhere on your side of the Table. Play it to win the game.",
        target: ['#localTableSlots', '#centerArena'],
        require: { blind: true },
        noCoachReply: true,
        coachNote: `That's a win! You're empty — Hand, Table, everything. That's the whole game, start to finish. ${window.innerWidth < 768 ? 'Tap' : 'Click'} the \u2261 menu: the ? shortcut opens Guide & Strategy and the \u2699\uFE0F shortcut opens Settings. You can also tap the i button during a game to see every card's power.`,
        noteTarget: ['#hamburgerBtn', '#cardRefBtn']
      }
    ];

    // --- Module: Basic Play -----------------------------------------------
    // Teaches ONLY the core loop (equal-or-higher, forced pickup, refill).
    // Deliberately uses just Queen/King/Ace throughout: those three ranks
    // are the only ones with zero special power, so nothing here can be
    // mistaken for a rule that belongs to a different, dedicated lesson
    // (e.g. a Jack would silently impose its own "next card must be odd"
    // constraint, which has no business showing up in a "basics" module).
    const TUTORIAL_MODULE_BASIC_PLAY = [
      {
        text: "Jumping to after the Swap Phase, Coach opens with a Queen. Play your Queen or King to match or beat it.",
        target: ['#localHand', '#discardPileContainer [data-rank="Q"]'],
        scene: {
          hand: [['7', '♣'], ['Q', '♠'], ['K', '♦']],
          faceUp: [['2', '♣'], ['3', '♦'], ['A', '♣']],
          pile: [['Q', '♥']],
          coach: [['A', '♠']],
          // Deterministic rather than whatever the shuffle would have given,
          // so the Hand-refill note below always shows the same card.
          drawPile: [['5', '♦']]
        },
        require: { rank: ['Q', 'K'] },
        // Chronologically, the Hand refills the instant YOUR card lands —
        // before the Coach has replied at all — so this has to interrupt
        // here rather than wait until after the Ace/pickup explanation.
        postPlayNote: "Your Hand just topped back up to 3. That happens after every turn, until the Deck runs out.",
        postPlayNoteTarget: '#deckZone',
        coachPlays: [['A', '♠']],
        coachNote: "Coach fires back an Ace, the highest plain card. You'd need another Ace, a 2, 3, 10, or a Joker. You've got none of those in Hand.",
        noteTarget: ['#discardPileContainer [data-rank="A"]', '#localHand']
      },
      {
        text: "Nothing in your Hand beats that Ace. Tap the Pile to pick it up.",
        target: ['#discardPileContainer [data-rank="A"]', '#localHand'],
        require: { pickup: true },
        coachNote: "That's a Forced Pickup. No legal move means the whole Pile lands in your Hand, Ace included. You'll get another shot soon."
      }
    ];

    // --- Module: The Goal --------------------------------------------------
    // Pure orientation — no action required anywhere in this module. Steps
    // that reference a real zone still spotlight it (per the "always show
    // what you're talking about" rule); steps that are purely conceptual
    // (the welcome line, the close-out) spotlight nothing, which is exactly
    // what target: null means — not an oversight, an explicit "there's
    // nothing on screen to point at yet".
    const TUTORIAL_MODULE_GOAL = [
      {
        text: "Hey, I'm your Coach. Get rid of every card you hold. That's the whole game. Last one holding cards is the ShitHead.",
        target: null
      },
      {
        text: "You'll clear three zones in order: Hand, then Face-Up, then Face-Down (blind). No skipping ahead until the one before it is empty.",
        target: ['#localHand', '#localTableSlots']
      },
      {
        text: "Everyone plays onto one shared Pile. Match it, beat it, or pick it up.",
        target: '#pileZone'
      },
      {
        text: "That's the whole game. Next up: where your cards actually live.",
        target: null
      }
    ];

    // --- Module: Your Cards -------------------------------------------------
    // Face-Up and Face-Down cards are stacked at IDENTICAL screen coordinates
    // (the Face-Up card sits `absolute inset-0` directly over its Face-Down
    // card within the same slot), so spotlighting '.card-table' vs
    // '.custom-card-back' draws the exact same box in both steps — accurate,
    // but visually indistinguishable on its own. The Face-Up step keeps the
    // real stacked view (exactly what a player will actually see mid-game).
    // The Face-Down step, whose whole point IS the distinction, temporarily
    // hides the Face-Up layer via scene: { faceUp: [] } so the card art
    // itself changes (numbered card -> blank back), not just the caption —
    // restored for the very next step so the rest of the module shows the
    // normal stacked view again.
    const TUTORIAL_MODULE_YOUR_CARDS = [
      {
        text: "The gold HAND label marks the cards only you can see. Play from here first; your Hand tops back up to 3 after every turn while the Deck lasts.",
        target: ['#handZoneLabel', '#localHand', '#deckZone']
      },
      {
        text: "The FACE-UP label lights up while you still have Face-Up cards. They stay locked until your Hand and the Deck are both empty.",
        target: ['#faceUpZoneLabel', '#localTableSlots .card-table']
      },
      {
        text: "Once your Face-Up cards are gone, the FACE-DOWN label lights up. You flip these blind.",
        target: ['#faceDownZoneLabel', '#localTableSlots .custom-card-back'],
        scene: { faceUp: [] }
      },
      {
        text: "Order matters: Hand, Face-Up, Face-Down. No skipping ahead, no matter how good the card underneath looks.",
        target: ['#localHand', '#localTableSlots'],
        scene: { faceUp: [['4', '♠'], ['9', '♦'], ['J', '♣']] }
      }
    ];

    // --- Module: The Swap Phase ----------------------------------------
    // Puts the board into a real SWAP phase from the very first step (not
    // just once the scripted scene lands) so #swapControlBar is genuinely
    // visible to spotlight from the opening line, not hidden behind the
    // phase check that normally gates it.
    const TUTORIAL_MODULE_SWAP = [
      {
        text: "Before play starts, you get one shot to trade cards between your Hand and your Face-Up cards. Welcome to the Swap Phase.",
        target: '#swapControlBar',
        phase: 'SWAP',
        scene: { phase: 'SWAP', hand: [['2', '♣'], ['10', '♦'], ['A', '♠']], faceUp: [['4', '♥'], ['5', '♠'], ['6', '♣']] }
      },
      {
        text: "Face-Up cards sit out until the endgame. They only come into play once your Hand and Deck are empty. Stash your strongest cards there now, as a safety net for later.",
        target: ['#localHand', '#localTableSlots'],
        phase: 'SWAP'
      },
      {
        text: "Your 2, 10 and Ace are a few of the strongest cards in the game, and they are stuck in your Hand. Your 4, 5 and 6 are weak. Tap the 2 and then the 4, do the same with the 10 and 5, and again with the Ace and 6.",
        target: [
          '#localHand [data-rank="2"]', '#localHand [data-rank="10"]', '#localHand [data-rank="A"]',
          '#localTableSlots [data-rank="4"]', '#localTableSlots [data-rank="5"]', '#localTableSlots [data-rank="6"]'
        ],
        // One color per pair, and a pair drops out of the spotlight entirely
        // the instant it's completed (see tutorialOnSwap and renderSwapColorSpotlights)
        // rather than staying lit like it still needs attention.
        swapColorGroups: [
          { cards: ['#localHand [data-rank="2"]', '#localTableSlots [data-rank="4"]'], color: '#fbbf24' },
          { cards: ['#localHand [data-rank="10"]', '#localTableSlots [data-rank="5"]'], color: '#22c55e' },
          { cards: ['#localHand [data-rank="A"]', '#localTableSlots [data-rank="6"]'], color: '#ef4444' }
        ],
        phase: 'SWAP',
        require: {
          swap: true,
          // Locked order: attempting a later pair before the current one is
          // done gets the same "tap the right card" nudge as an unrelated
          // card would, since tutorialAllowSwapPick checks only the pair at
          // the current sequence position, never the whole list.
          sequence: [
            { handRank: '2', faceUpRank: '4' },
            { handRank: '10', faceUpRank: '5' },
            { handRank: 'A', faceUpRank: '6' }
          ]
        },
        coachNote: "Rule of thumb: stash your 2s, 3s, 10s, Aces, and Jokers Face-Up when you can. They're your strongest cards, and this is the only time you get to place them."
      },
      {
        text: "Happy with your Table cards? Tap READY to lock it in.",
        target: '#finishSwapBtn',
        phase: 'SWAP',
        require: { ready: true },
        coachNote: "Locked in! That's the Swap Phase. Every match starts here."
      }
    ];

    // --- Module: Endgame -----------------------------------------------
    // Clears all 3 Face-Up cards with coach replies engineered to never
    // trap a later required card behind an unbeatable pile (a plain low
    // reply, then a 2/Reset before the final Face-Up card, so "beat the
    // pile" is never in doubt regardless of the exact ranks in play). The
    // blind phase deliberately forces the MIDDLE card first — a card
    // that's genuinely illegal against the pile left behind — so the
    // player sees a real forced pickup before the two guaranteed-legal
    // closing flips. See tutorialApplyScene's scene reset between steps:
    // the same "fresh scripted reset" pattern already used by the legacy
    // walkthrough for its own stacked endgame lesson.
    const TUTORIAL_MODULE_ENDGAME = [
      {
        text: "Hand's empty. Deck's empty. Your Face-Up cards just unlocked.",
        target: ['#localHand', '#deckZone', '#localTableSlots'],
        matchSpotlightWidthPair: [0, 2],
        scene: {
          hand: [], faceUp: [['8', '♣'], ['9', '♦'], ['Q', '♠']], faceDown: [['9', '♥'], ['6', '♠'], ['K', '♦']],
          emptyDeck: true, coach: [['2', '♦']], coachFaceUp: [['2', '♣'], ['3', '♦'], ['4', '♠']]
        }
      },
      {
        // Play order matters here: the 8 only lands on 6 of 14 possible
        // piles (the most restricted card of the three), and it's a Skip —
        // with just one opponent, that returns the turn straight back to
        // you. Playing it first burns the tightest card while the 9 and Q
        // still give you room to react, and chains straight into another
        // play with no Coach turn in between. Playing the Queen first (an
        // earlier version of this lesson did) wastes that Skip for nothing.
        text: "Play your 8 first.",
        target: '#localTableSlots [data-rank="8"]',
        require: { rank: '8' },
        noCoachReply: true,
        coachNote: "The 8 is the lowest card available, which makes it the perfect candidate to go first. It lets you play your higher-value cards on top of it. Since it's also a Skip, and there's just one opponent, it jumps back to your turn."
      },
      {
        text: "Play your 9.",
        target: '#localTableSlots [data-rank="9"]',
        require: { rank: '9' },
        coachPlays: [['2', '♦']],
        coachNote: "Two down. Coach's 2 resets the Pile completely — your Queen's totally safe to play last.",
        noteTarget: ['#discardPileContainer [data-rank="2"]', '#localTableSlots [data-rank="Q"]']
      },
      {
        text: "Play your last Face-Up card — the Queen.",
        target: '#localTableSlots [data-rank="Q"]',
        require: { rank: 'Q' },
        coachPlays: [['3', '♦']],
        coachNote: "Face-Up's cleared. Your Face-Down cards have been unlocked, but you can't see them. Let's try flipping one and hope it can beat your Queen under the Coach's 3.",
        noteTarget: ['#discardPileContainer [data-rank="3"]', '#localTableSlots .custom-card-back']
      },
      {
        text: "You can't see these until you flip them — it's a real gamble. Try the middle one.",
        target: ['#localHand', '#localTableSlots [data-slot="1"]'],
        require: { blind: true, blindSlot: 1 },
        coachNote: "Your 6 is no good. You have to pick up. That's the risk of playing blind.",
        noteTarget: ['#pileZone', '#localHand']
      },
      {
        text: "Let's skip ahead past playing those 6 cards back out. You picked up the Pile, so it's empty and Coach starts fresh.",
        target: '#pileZone',
        scene: { hand: [], emptyDeck: true },
        coachPlays: [['4', '♠']],
        coachNote: "An empty Pile means anything's legal. Coach opens with their 4.",
        noteTarget: '#discardPileContainer'
      },
      {
        text: "Two cards left. Flip either one.",
        target: '#localTableSlots .custom-card-back',
        require: { blind: true },
        coachNote: "Clean flip! Comfortably beats that 4.",
        noteTarget: '#discardPileContainer'
      },
      {
        text: "One card left. Watch what Coach plays with their last one.",
        target: '#pileZone',
        coachPlays: [['2', '♣']],
        coachNote: "Coach's last card is a 2 — a Reset. That guarantees your final flip is legal, whatever it turns out to be.",
        noteTarget: '#discardPileContainer'
      },
      {
        text: "Last card on the table. Flip it to win.",
        target: '#localTableSlots .custom-card-back',
        require: { blind: true },
        noCoachReply: true,
        coachNote: "That's a win. Nothing left — Hand, Table, all of it. That's the whole game."
      }
    ];

    // ============================================================
    // TUTORIAL HUB
    // Registry the Hub UI renders from. Order here is just the Hub's default
    // display order (top to bottom) — it implies no locking or sequence
    // requirement; every module is independently launchable at any time.
    // ============================================================
    // --- Module: Snap Burn --------------------------------------------
    // Three seats (you, Coach, Rival) so the snap lands on someone else's
    // turn. Kings on purpose: they have no power, so nothing but Snap Burn
    // happens (an earlier version used 9s from a pre-reversed direction, and
    // the badge never showed the flip). Step 2 is a real play (coachPlays):
    // the direction is the normal clockwise one, so Coach's King passes the
    // turn to Rival through the real advanceTurn. checkSnapBurnEligibility
    // gates on the run of the rank and holding the card that completes it,
    // never on whose turn it is, so tapping SNAP really is legal here.
    const TUTORIAL_MODULE_SNAP_BURN = [
      {
        text: "Some moves don't wait for your turn. Meet Snap Burn.",
        target: null
      },
      {
        text: "Two Kings are down and you hold the last one. Watch Coach play the third.",
        target: ['#pileZone', '#localHand [data-rank="K"]'],
        turnIndex: 1,
        scene: {
          hand: [['K', '♥'], ['4', '♣'], ['6', '♦']],
          pile: [['K', '♠', 'you'], ['K', '♦', 'rival']],
          coach: [['K', '♣']],
          direction: 1
        },
        coachPlays: [['K', '♣']],
        coachNote: "Three Kings are down. It's Rival's turn now, not yours.",
        noteTarget: ['#pileZone', '#turnIndicatorRow']
      },
      {
        text: "Your King makes four of a kind. Tap Snap Burn, even though it's Rival's turn.",
        target: ['#pileZone', '#snapBurnBtn', '#snapToastBanner', '#localHand [data-rank="K"]'],
        turnIndex: 2,
        require: { rank: 'K', requireSnap: true },
        noCoachReply: true,
        coachNote: "That's Snap Burn. Hold the card that completes four of a kind and you can burn the Pile on anyone's turn. Then you go again."
      }
    ];

    // --- Module: Bonus Draw ---------------------------------------------
    // The real Bonus Draw prompt is deliberately suppressed everywhere else
    // during a tutorial (see allowBonusDraw's definition at the suppression
    // check) so it can never derail an unrelated lesson — this is the one
    // step that explicitly opts back into the genuine mechanic rather than
    // simulating it, so what the player sees really did just happen for
    // real, drawn from a scripted Deck to make the outcome deterministic.
    const TUTORIAL_MODULE_BONUS_DRAW = [
      {
        text: "Sometimes the Deck rewards you for what you just played. Meet Bonus Draw.",
        target: null
      },
      {
        text: "Play your 7.",
        target: '#localHand [data-rank="7"]',
        scene: { hand: [['7', '♦'], ['Q', '♣'], ['K', '♥']], pile: [['4', '♦']], drawPile: [['7', '♠']] },
        require: { rank: '7' },
        allowBonusDraw: true,
        bonusPromptText: "You drew another 7, so Bonus Draw lets you play it straight away. Tap Play It.",
        noCoachReply: true,
        coachNote: "That's Bonus Draw. Draw a matching card right after playing one, and you get a free follow-up play before your turn ends.",
        noteTarget: ['#deckZone', '#pileZone']
      }
    ];

    // --- Module: Cross-Phase Combo ---------------------------------------
    // Deliberately requires emptyDeck: true in the scene — the real
    // exception in getLegalMovesForPlayer only fires when the Deck is
    // empty AND the Hand is a single rank. Skipping either condition would
    // leave the Face-Up 9 genuinely locked and make the required 3-card
    // play impossible, so this had to be checked against the real function,
    // not assumed.
    const TUTORIAL_MODULE_CROSS_PHASE = [
      {
        text: "Face-Up cards are usually locked until your Hand's empty. There's one exception.",
        target: null
      },
      // Select All Of A Rank starts OFF here whatever the player's setting
      // (scene.toggle), must be switched on before any card can be touched
      // (toggleCardSelection refuses while a toggleRankSelect step waits),
      // and stays locked on for the rest of the lesson (tutorialAllowToggleOff).
      {
        text: "First, switch on Select All Of A Rank beside your hand count. Then one tap grabs every card of that rank.",
        target: '#multiSelectToggleBtn',
        scene: { hand: [['9', '♥'], ['9', '♣']], faceUp: [['9', '♦'], ['K', '♠'], ['Q', '♣']], pile: [['4', '♦']], emptyDeck: true, toggle: false },
        require: { toggleRankSelect: 'on' },
        coachNote: "It's on, and it stays on for this lesson."
      },
      {
        text: "Your Hand is only 9s and the Deck is empty, so your Face-Up 9 can join them. Tap a 9 to grab all three, then play.",
        target: ['#localHand [data-rank="9"]', '#localTableSlots [data-rank="9"]'],
        require: { rank: '9', count: 3 },
        noCoachReply: true,
        coachNote: "That's the Cross-Phase exception. An all-one-rank Hand can pull a matching Face-Up card in early. The King and Queen stay locked.",
        noteTarget: ['#localTableSlots [data-rank="K"]', '#localTableSlots [data-rank="Q"]']
      }
    ];

    // --- Module: Joker Duel ----------------------------------------------
    // The only module that seats a 3rd player (Rival) — the target picker
    // genuinely needs 2+ valid targets to appear at all, verified against
    // the real target-collection code. Both outcomes are made deterministic
    // regardless of WHICH opponent the player picks (neither holds a Joker
    // in the first pass, both do in the second) rather than relying on the
    // player following a specific naming instruction the engine has no way
    // to actually enforce.
    const TUTORIAL_MODULE_JOKER_DUEL = [
      // Both scenes start with cards on the Pile (played you, Coach, Rival in
      // turn order, so it's your turn), so every pickup visibly flies to the
      // seat that scoops it.
      {
        text: "Play a Joker and pick who scoops the Pile. But if they're holding one too, they can counter it right back, and both Jokers burn either way.",
        target: '#pileZone',
        scene: {
          hand: [['JOKER', 'JOKER']],
          pile: [['Q', '♦', 'you'], ['K', '♣', 'coach'], ['K', '♥', 'rival']],
          coach: [['4', '♦'], ['6', '♣']], rival: [['5', '♥'], ['8', '♠']]
        }
      },
      {
        text: "Play your Joker, then pick anyone. Neither can counter this one.",
        target: '#localHand [data-rank="JOKER"]',
        require: { rank: 'JOKER' },
        noteTarget: '#pileZone',
        coachNote: "No counter. Whoever you picked took the whole Pile, and you go again. Your Joker's burnt either way."
      },
      {
        // A deck has two Jokers, so only one opponent can hold the other one:
        // Rival. The picker only lets you pick Rival here (jokerTarget).
        text: "New deal. This time Rival holds the other Joker. Play yours and pick Rival.",
        target: '#localHand [data-rank="JOKER"]',
        scene: {
          hand: [['JOKER', 'JOKER']],
          pile: [['Q', '♠', 'you'], ['A', '♦', 'coach'], ['A', '♣', 'rival']],
          coach: [['4', '♦'], ['6', '♣']], rival: [['JOKER', 'JOKER'], ['5', '♥']]
        },
        require: { rank: 'JOKER' },
        jokerTarget: 'tut_rival',
        jokerPromptText: "Pick Rival.",
        noteTarget: '#pileZone',
        coachNote: "Countered. Rival's Joker sent the Pile straight back to you, and both Jokers burn. That's the risk with every Joker."
      }
    ];

    // ============================================================
    // CARD POWER REFERENCE
    // Non-linear: each card is its own tiny 2-3 step demo, launched from a
    // grid tile, no relationship to any other card's demo. Every scripted
    // play below was checked against the real isPlayLegal/getEffectiveTopCard
    // functions before being written, not assumed from the rules text —
    // that's exactly what went wrong with the Endgame module's original 4-on-
    // Queen bug.
    // ============================================================
    const TUTORIAL_MODULE_CARD_2 = [
      {
        text: "The 2 is a Reset. Clears whatever's required, legal on almost anything. The one card it can't follow? A Jack!",
        target: null
      },
      {
        text: "Play your 2 on the King.",
        target: ['#localHand [data-rank="2"]', '#pileZone'],
        scene: { hand: [['2', '♠'], ['5', '♦'], ['Q', '♣']], pile: [['K', '♥']] },
        require: { rank: '2' },
        noCoachReply: true,
        coachNote: "That's a Reset. Coach can play anything on the 2, even a 4."
      }
    ];

    const TUTORIAL_MODULE_CARD_3 = [
      {
        text: "You just played a 9. Watch what happens when the Coach answers with a 3.",
        target: ['#pileZone', '#historyStreamPanel'],
        scene: { hand: [['J', '♦'], ['4', '♣'], ['6', '♠']], pile: [['9', '♦']], pileOwner: 'you' },
        coachPlays: [['3', '♦']],
        coachNote: "The 3 is Transparent, so it sets no target of its own. Whoever's next has to beat what's underneath, and in this case that's your 9. You can play a 3 on anything except a 6 (Evens).",
        noteTarget: ['#pileZone', '#historyStreamPanel']
      },
      {
        text: "Now beat the 9 under the 3. Play your Jack.",
        target: ['#localHand [data-rank="J"]', '#discardPileContainer [data-rank="9"]'],
        // getEffectiveTopCard() skips past the 3 to find the 9 for legality
        // purposes — verified directly in isPlayLegal before writing this.
        require: { rank: 'J' },
        noCoachReply: true,
        coachNote: "The 3 set no target of its own. You beat the 9 hiding underneath it. The only card a 3 can't follow is a 6."
      }
    ];

    const TUTORIAL_MODULE_CARD_4 = [
      {
        text: "The 4 looks harmless, but it's the most restricted card in the deck. It only follows a 2, 3, 4, 6, or 7.",
        target: null
      },
      {
        text: "Play your 4 on the 6.",
        target: ['#localHand [data-rank="4"]', '#pileZone'],
        scene: { hand: [['4', '♣'], ['9', '♦'], ['K', '♠']], pile: [['6', '♥']] },
        require: { rank: '4' },
        noCoachReply: true,
        coachNote: "That works! A 6's one of the five cards a 4 can follow."
      },
      {
        text: "Now try your 4 on this 9. Tap it.",
        target: ['#localHand [data-rank="4"]', '#pileZone'],
        scene: { hand: [['4', '♦'], ['6', '♦'], ['K', '♠']], pile: [['9', '♥']] },
        require: { tapCheck: '#localHand [data-rank="4"]' },
        coachNote: "Refused. A 4 can't follow a 9, even though it looks low enough. Only a 2, 3, 4, 6 or 7 lets it in.",
        noteTarget: ['#localHand [data-rank="4"]', '#pileZone']
      }
    ];

    // Base Card is the 7, played by YOU; the Coach's 4 already sits on top
    // of it (both pre-set in the scene, not played out — the lesson starts
    // from that board). Ownership matters here: the Coach's card must be
    // the one on top, or the pile would end on your own play and Step 2
    // would be asking you to act twice in a row with no real Coach turn in
    // between — the exact bug this module was already rewritten to fix.
    // Step 2 plays your own 5 first, THEN the Coach genuinely replies with
    // their own 5 via coachPlays, before Step 3 hands it back to you.
    const TUTORIAL_MODULE_CARD_5 = [
      {
        text: "The 5 is Drop-Base. It ignores everything stacked on the Pile and sends the target straight back to the very first card played: the Base Card.",
        target: '#baseCardHud',
        scene: {
          hand: [['5', '♥'], ['6', '♠'], ['K', '♣']],
          pile: [['7', '♦', 'you'], ['4', '♣', 'coach']],
          coach: [['5', '♦'], ['9', '♣'], ['Q', '♠']],
          faceUp: [['3', '♣'], ['10', '♥'], ['J', '♦']],
          drawPile: [['8', '♠']]
        }
      },
      {
        text: "You opened with a 7, and Coach answered with a 4 on top. That 7 is the Base Card, buried under everything since. Play your 5 and watch the target drop.",
        target: ['#localHand [data-rank="5"]', '#baseCardHud'],
        require: { rank: '5' },
        coachPlays: [['5', '♦']],
        coachNote: "Drop-Base just sent the target straight back to the 7. That's why Coach could answer with a 5: it's 7 or under, so it satisfies the Base Card.",
        noteTarget: ['#baseCardHud', '#pileZone']
      },
      {
        text: "That 5 on top is Drop-Base too, so nothing's changed. The 7 underneath is still what counts. Play your 6, it's 7 or under.",
        target: ['#localHand [data-rank="6"]', '#baseCardHud'],
        require: { rank: '6' },
        noCoachReply: true,
        coachNote: "That's the Base Card at work. Stack as many 5s as you like on top. The 7 underneath is always what you actually have to beat."
      }
    ];

    const TUTORIAL_MODULE_CARD_6 = [
      {
        text: "The 6 sets an Evens constraint. Whoever's next needs an even card.",
        target: '#pileZone',
        scene: { hand: [['8', '♠'], ['3', '♣'], ['K', '♦']], pile: [['6', '♦']] }
      },
      {
        text: "Play your 8. It's even, so it satisfies the 6.",
        target: ['#localHand [data-rank="8"]', '#pileZone'],
        require: { rank: '8' },
        noCoachReply: true,
        coachNote: "2, 4, 6, 8, 10, Queen and Ace all count as even. A 5, 9, Jack or King would've been refused."
      }
    ];

    // Full 15-tile roster for the grid. Cards without a `steps` array yet
    // render as a disabled "soon" tile rather than disappearing — the grid
    // always shows the whole card set so the Hub communicates what's
    // planned, not just what's done so far.
    const TUTORIAL_MODULE_CARD_7 = [
      {
        text: "The 7 sets a 7-or-lower rule. Whoever's next needs a card ranked 7 or under.",
        target: '#pileZone',
        scene: { hand: [['5', '♥'], ['K', '♣'], ['A', '♦']], pile: [['7', '♦']] }
      },
      {
        text: "Play your 5. It satisfies the 7.",
        target: ['#localHand [data-rank="5"]', '#pileZone'],
        require: { rank: '5' },
        noCoachReply: true,
        coachNote: "Anything 7 or under works. A King or Ace (way above 7) would've been refused."
      }
    ];

    const TUTORIAL_MODULE_CARD_8 = [
      {
        text: "The 8 is Skip. With one opponent, skipping them hands the turn right back to you.",
        target: null
      },
      {
        text: "Play your 8.",
        target: ['#localHand [data-rank="8"]', '#pileZone'],
        scene: { hand: [['8', '♣'], ['3', '♦'], ['9', '♠']], pile: [['5', '♦']] },
        require: { rank: '8' },
        noCoachReply: true,
        coachNote: "You've skipped Coach with your 8, so it's your turn again. When you're playing with 2 or more opponents, the number of 8s you play skips that many players."
      }
    ];

    // The only Card Reference demo that seats a 3rd player — Reverse only
    // does anything with two or more opponents, so proving it needs someone
    // for direction to actually swap between. The Pile and the direction
    // badge (#gameDirectionBadge, under the header) stay spotlit for both
    // steps of this module; Step 2 deliberately leaves the Hand out of the
    // spotlight list so the dimmer doesn't swallow the whole middle of the
    // screen — the 9 in Hand still glows on its own via tutorialWantsCard,
    // independent of what's spotlit.
    const TUTORIAL_MODULE_CARD_9 = [
      {
        text: "The 9 is Reverse. It flips the turn order when you have more than one opponent. With just 2 players, the 9 acts like a regular card, such as a Queen or King.",
        target: ['#pileZone', '#gameDirectionBadge'],
        scene: { hand: [['9', '♠'], ['5', '♥'], ['K', '♦']], pile: [['4', '♦']] }
      },
      {
        text: "Play would normally pass to the Coach next. Play your 9 and watch where it actually goes.",
        target: ['#pileZone', '#gameDirectionBadge', '#turnIndicatorRow'],
        require: { rank: '9' },
        noteTarget: ['#turnIndicatorRow', '#gameDirectionBadge'],
        noCoachReply: true,
        coachNote: "Direction just flipped. Play skips the Coach completely and goes to Rival instead. With two players, you'd never see it happen."
      }
    ];

    const TUTORIAL_MODULE_CARD_10 = [
      {
        text: "The 10 is Burn. It clears the Pile and takes those cards completely out of the game. After playing a 10, you get another turn.",
        target: '#pileZone',
        scene: { hand: [['10', '♠'], ['4', '♣'], ['J', '♦']], pile: [['Q', '♥']] }
      },
      {
        text: "Play your 10 on the Queen.",
        target: ['#localHand [data-rank="10"]', '#pileZone'],
        require: { rank: '10' },
        noCoachReply: true,
        coachNote: "Check out the Recent Card History strip. As you can see, the 10 can even play on cards ranked above it, like that Queen, and the Pile was burnt. It just can't play on a 7 or a Jack.",
        noteTarget: ['#historyStreamPanel', '#pileZone']
      }
    ];

    const TUTORIAL_MODULE_CARD_J = [
      {
        text: "The Jack sets an Odds rule, similar to a 6. Whoever's next needs to play an odd card on top.",
        target: '#pileZone',
        scene: { hand: [['9', '♣'], ['4', '♦'], ['K', '♠']], pile: [['J', '♦']] }
      },
      {
        text: "Play your 9. It's odd, so it satisfies the Jack.",
        target: ['#localHand [data-rank="9"]', '#pileZone'],
        require: { rank: '9' },
        noCoachReply: true,
        coachNote: "3, 5, 7, 9, Jack and King are all odd. 2, 4, 6, 8, 10, Queen and Ace all count as even."
      }
    ];

    const TUTORIAL_MODULE_CARD_Q = [
      {
        text: "The Queen has no special power. Just a plain high card: equal or higher wins, same as most of the deck.",
        target: null
      },
      {
        text: "Play your Queen on the 9.",
        target: ['#localHand [data-rank="Q"]', '#pileZone'],
        scene: { hand: [['Q', '♠'], ['4', '♦'], ['6', '♣']], pile: [['9', '♦']] },
        require: { rank: 'Q' },
        noCoachReply: true,
        coachNote: "Nothing hidden here. A Queen just needs to match or beat the Pile, like almost every plain card."
      }
    ];

    const TUTORIAL_MODULE_CARD_K = [
      {
        text: "The King has no special power either. It's another plain high card, beaten only by an Ace or a handful of power cards.",
        target: null
      },
      {
        text: "Play your King on the 9.",
        target: ['#localHand [data-rank="K"]', '#pileZone'],
        scene: { hand: [['K', '♦'], ['5', '♣'], ['7', '♠']], pile: [['9', '♣']] },
        require: { rank: 'K' },
        noCoachReply: true,
        coachNote: "Same rule as always: match or beat the Pile."
      }
    ];

    const TUTORIAL_MODULE_CARD_A = [
      {
        text: "The Ace is the highest plain card in the deck. Only another Ace or a real power card can follow it.",
        target: null
      },
      {
        text: "Play your Ace on the King.",
        target: ['#localHand [data-rank="A"]', '#pileZone'],
        scene: { hand: [['A', '♠'], ['4', '♦'], ['7', '♣']], pile: [['K', '♦']] },
        require: { rank: 'A' },
        noCoachReply: true,
        coachNote: "That's as high as a plain card gets. From here, only another Ace, a 2, 3, 10, or a Joker can follow it."
      }
    ];

    // Pile is pre-built 4 deep (7-you, 5-Coach, 6-you, Q-Coach) so the Queen
    // on top genuinely can't be beaten by your 4 or 5 — the Joker is the
    // only card that gets you out of it. Coach's hand (3, 8, K) holds no
    // Joker, so the pickup resolves as a normal, uncontested duel — the
    // real resolveJokerDuelInstant() path, same pickup animation and audio
    // a live game uses. Each pile entry below carries its own owner tag so
    // the Recent Card History strip alternates you/Coach exactly as played,
    // rather than attributing the whole Pile to one name.
    const TUTORIAL_MODULE_CARD_JOKER = [
      {
        text: "The Queen's too high for your other cards, but the Joker can play on anything, no matter what's on the Pile. Whoever plays it gets to choose an opponent to pick up the whole Pile, except for the Joker itself.",
        target: '#pileZone',
        scene: {
          hand: [['4', '♣'], ['5', '♥'], ['JOKER', 'JOKER']],
          pile: [['7', '♦', 'you'], ['5', '♣', 'coach'], ['6', '♠', 'you'], ['Q', '♦', 'coach']],
          coach: [['3', '♠'], ['8', '♥'], ['K', '♣']]
        }
      },
      {
        text: "Play your Joker, then choose the Coach.",
        target: '#localHand [data-rank="JOKER"]',
        require: { rank: 'JOKER' },
        noteTarget: '#pileZone',
        coachNote: "Coach just picked up the whole Pile, so it's your turn again. The one risk is that if they'd had a Joker too, they could've countered it right back, forcing you to pick up the Pile instead."
      }
    ];

    // In-turn counterpart to the Advanced Tactics Snap Burn lesson — same
    // automatic-burn trigger, but completed normally on your own turn
    // rather than out of turn, so turnIndex is left at its default (0).
    const TUTORIAL_MODULE_CARD_4OAK = [
      {
        text: "Four of the same rank in a row burns the Pile automatically, the instant the fourth lands. No 10 needed.",
        target: '#pileZone',
        // Alternating ownership (Coach, you, Coach) so the History strip
        // shows a real back-and-forth build-up ending on Coach's play —
        // which is why it's genuinely your turn next, not three plays in a
        // row from the same side.
        scene: { hand: [['9', '♥'], ['4', '♦'], ['K', '♣']], pile: [['9', '♠', 'coach'], ['9', '♦', 'you'], ['9', '♣', 'coach']] }
      },
      {
        text: "Three 9s are already down. Play your 9 to complete Four of a Kind.",
        target: ['#localHand [data-rank="9"]', '#pileZone'],
        require: { rank: '9' },
        noCoachReply: true,
        coachNote: "That's an automatic burn. Four of a kind clears the Pile the instant it's completed, your turn or anyone else's, as Snap Burn shows."
      }
    ];

    const TUTORIAL_CARD_ROSTER = [
      { id: 'card_2', label: '2', steps: TUTORIAL_MODULE_CARD_2 },
      { id: 'card_3', label: '3', steps: TUTORIAL_MODULE_CARD_3 },
      { id: 'card_4', label: '4', steps: TUTORIAL_MODULE_CARD_4 },
      { id: 'card_5', label: '5', steps: TUTORIAL_MODULE_CARD_5 },
      { id: 'card_6', label: '6', steps: TUTORIAL_MODULE_CARD_6 },
      { id: 'card_7', label: '7', steps: TUTORIAL_MODULE_CARD_7 },
      { id: 'card_8', label: '8', steps: TUTORIAL_MODULE_CARD_8 },
      { id: 'card_9', label: '9', steps: TUTORIAL_MODULE_CARD_9, players: 3 },
      { id: 'card_10', label: '10', steps: TUTORIAL_MODULE_CARD_10 },
      { id: 'card_j', label: 'J', steps: TUTORIAL_MODULE_CARD_J },
      { id: 'card_q', label: 'Q', steps: TUTORIAL_MODULE_CARD_Q },
      { id: 'card_k', label: 'K', steps: TUTORIAL_MODULE_CARD_K },
      { id: 'card_a', label: 'A', steps: TUTORIAL_MODULE_CARD_A },
      { id: 'card_joker', label: 'JKR', steps: TUTORIAL_MODULE_CARD_JOKER },
      { id: 'card_4oak', label: '4-Kind', steps: TUTORIAL_MODULE_CARD_4OAK }
    ];

    // --- Quick Start: the whole game in about a minute ---------------------
    // What a first-time player gets from the Tutorial button: one short
    // sentence per step, on the real table. Everything else (Core Path,
    // Card Powers, Advanced) stays in the hub for anyone who wants more.
    // Not counted towards the "complete every lesson" challenge.
    // Steps 1 and 2 share one table (owner, v290): the same hands, Face-Up
    // and Face-Down cards, so nothing changes when the first play starts.
    const QS_FIRST_DEAL = { hand: [['7', '♣'], ['Q', '♠'], ['K', '♦']], faceUp: [['2', '♣'], ['J', '♦'], ['A', '♣']], pile: [['Q', '♥']], coach: [['A', '♠']], coachFaceUp: [['8', '♦'], ['5', '♠'], ['9', '♥']], drawPile: [['4', '♦'], ['6', '♣']] };
    const TUTORIAL_MODULE_QUICK_START = [
      {
        text: "Get rid of all your cards. The last player holding cards is the ShitHead. 💩",
        target: null,
        scene: QS_FIRST_DEAL
      },
      {
        text: "Play a card equal to or higher than the Pile. Tap your Queen or King, then Play.",
        target: ['#localHand', '#pileZone'],
        scene: QS_FIRST_DEAL,
        require: { rank: ['Q', 'K'] },
        coachPlays: [['A', '♠']],
        coachNote: "Coach beat you with an Ace, the highest plain card.",
        noteTarget: ['#discardPileContainer [data-rank="A"]']
      },
      {
        text: "Nothing in your hand beats it, so tap the Pile to pick it up. (Pickups are usually automatic.)",
        target: ['#discardPileContainer [data-rank="A"]', '#localHand'],
        require: { pickup: true },
        coachNote: "Picked up. None of your cards could go on the Pile, so it all comes into your Hand.",
        noteTarget: '#localHand'
      },
      {
        text: "Some cards have powers: a 10 burns the whole Pile. Play it!",
        target: ['#localHand [data-rank="10"]', '#pileZone'],
        scene: { hand: [['10', '♠'], ['4', '♣'], ['6', '♦']], pile: [['Q', '♥']] },
        require: { rank: '10' },
        noCoachReply: true,
        coachNote: "Burnt! And you play again."
      },
      {
        text: "Every card has a power. Tap the glowing ⓘ button to see them all.",
        target: '#cardRefBtn',
        require: { tapCheck: '#cardRefBtn' },
        coachNote: "Here's every card's power. Open it any time during a game.",
        noteTarget: '#cardRefPanel'
      },
      {
        text: "Press and hold any card to see what it does. Hold the Pile, then one of yours.",
        target: ['#pileZone', '#localHand'],
        scene: { hand: [['4', '♣'], ['8', '♦'], ['J', '♠']], pile: [['6', '♥']] },
        require: { holdCheck: true },
        captionPlace: 'middle',
        coachNote: "Hold any card you can see, any time in a game, to check it.",
        noteTarget: ['#pileZone', '#localHand']
      },
      {
        text: "The ▦ Play Matrix shows which card can go on which. Tap the glowing ▦.",
        target: '#matrixRefBtn',
        require: { tapCheck: '#matrixRefBtn' },
        coachNote: "Find your card on the left, the Pile's on top. A tick means yours can go on it.",
        noteTarget: '#matrixRefPanel'
      },
      {
        text: "Once your Hand and the Deck run out, you play your Face-Up cards.",
        target: ['#tableZoneLabel', '#localTableSlots .card-table'],
        scene: { hand: [], emptyDeck: true }
      },
      {
        text: "Last, your Face-Down cards, flipped blind: pure luck. Empty them all to win. You're ready!",
        target: ['#tableZoneLabel', '#localTableSlots .custom-card-back'],
        scene: { hand: [], faceUp: [], emptyDeck: true }
      }
    ];
    const QUICK_START_MODULE = { id: 'quick_start', title: '⚡ Quick Start', time: '~1 min', desc: 'Everything you need to play', steps: TUTORIAL_MODULE_QUICK_START, players: 2 };

    const TUTORIAL_HUB_MODULES = [
      { id: 'goal', title: 'The Goal', time: '~20 sec', desc: "What you're trying to do", steps: TUTORIAL_MODULE_GOAL, players: 2 },
      { id: 'your_cards', title: 'Your Cards', time: '~35 sec', desc: 'Hand, Face-Up, Face-Down', steps: TUTORIAL_MODULE_YOUR_CARDS, players: 2 },
      { id: 'swap', title: 'The Swap Phase', time: '~45 sec', desc: 'Set up your safety net', steps: TUTORIAL_MODULE_SWAP, players: 2 },
      { id: 'basic_play', title: 'Basic Play', time: '~45 sec', desc: 'The core loop', steps: TUTORIAL_MODULE_BASIC_PLAY, players: 2 },
      { id: 'endgame', title: 'Endgame', time: '~60 sec', desc: 'Face-Up, Face-Down, and winning', steps: TUTORIAL_MODULE_ENDGAME, players: 2 }
    ];

    const TUTORIAL_HUB_ADVANCED_MODULES = [
      { id: 'snap_burn', title: 'Snap Burn', time: '~30 sec', desc: 'Burn out of turn', steps: TUTORIAL_MODULE_SNAP_BURN, players: 3 },
      { id: 'bonus_draw', title: 'Bonus Draw', time: '~20 sec', desc: 'A free follow-up play', steps: TUTORIAL_MODULE_BONUS_DRAW, players: 2 },
      { id: 'cross_phase', title: 'Cross-Phase Combo', time: '~30 sec', desc: 'Reach Face-Up cards early', steps: TUTORIAL_MODULE_CROSS_PHASE, players: 2 },
      { id: 'joker_duel', title: 'Joker Duel', time: '~40 sec', desc: 'Choose a target, risk a counter', steps: TUTORIAL_MODULE_JOKER_DUEL, players: 3 }
    ];

