// What's New static release-note data.
// Extracted from index.html without changing note content or behaviour.
(() => {
    const WN_KEY = 'key';
    const WHATS_NEW = {
      v488: [['sparkle', 'On a PC, big Multiple Decks tables now seat every opponent around the play area instead of a thin list.']],
      v487: [['sparkle', 'Shiny avatars now glint in step with each other.']],
      v486: [['sparkle', 'The Seer and The Enforcer avatars now have a light glint that sweeps across them.']],
      v485: [['sparkle', 'With 5 or more players the final standings use two columns and the opponent list steps aside, so every place is visible.']],
      v484: [['sparkle', 'No Mercy: the Ace banner now names anyone who took nothing and why.']],
      v483: [['sparkle', 'No Mercy: cards you saw with a Queen now show the rank and suit in the top left, like real cards. An Ace that makes nobody pick up now says why.']],
      v482: [['sparkle', 'The Scratch Card foil is now a shiny holographic foil with a sweeping light band and glitter.']],
      v481: [['gift', 'On the Scratch Card you can start scratching the foil straight away; no need to press Get Card first.']],
      v480: [['sparkle', 'The Prism Ace avatar now shines with the same moving light band as the Prism Joker card back.']],
      v479: [['gift', 'The Scratch Card is now a 3x3 grid of real playing cards in your own deck, card back and frame. Win with three of one card in a row, column or diagonal. The prizes are the Prism Ace avatar and Prism Joker card back, shown in the pop-up, and the Scratch Card, Daily Spin and Three Cards circles have new icons.', WN_KEY]],
      v478: [['gift', 'New: the Scratch Card, a free card every day. Scratch off the foil and match three Jacks, Queens, Kings, Aces or Jokers. Three Aces win the animated Foil Ace avatar and three Jokers win the Foil Joker card back.', WN_KEY]],
      v477: [['sound', 'Three Cards now has card sounds for the shuffle and the flips, and the circle hints open beside the circle.']],
      v476: [['gift', 'Hover over the Daily Spin and Three Cards circles for a short description.']],
      v475: [['gift', 'Three Cards has its own circle under the Daily Spin wheel, with its own dot while the week’s game is waiting.']],
      v474: [['gift', 'New: Three Cards, a free weekly game. Follow the 300 Diamond card as it is shuffled and pick it. The Daily Spin wheel now wears the colours of the live event, and a wheel-only item you already own is replaced by a 1,250 Diamond slice.', WN_KEY]],
      v473: [['gift', 'Daily Spin: the pop-up now previews both wheel-only prizes, the Lucky Wheel avatar and the Lucky Spin card back, and the wheel slice reads CARD BACK.']],
      v472: [['info', 'The Season Pass and event boxes on the home screen are smaller.']],
      v471: [['gift', 'The Daily Spin wheel now sits inside the top right corner of the home panel instead of over the background.']],
      v470: [['gift', 'Daily Spin is now a small wheel in the top right of the home screen with a gold dot while your spin is waiting. The pop-up previews the animated Lucky Wheel avatar.']],
      v469: [['gift', 'Daily Spin: spin the Lucky Wheel once a day, free, for Diamonds, XP or two wheel-only items (the Lucky Wheel avatar and Lucky Spin card back). Find it on the home screen or in the menu.', WN_KEY]],
      v468: [['spade', 'No Mercy: a card you X-ray with a Queen now shows its face in that player\'s hand fan, which opens by itself.']],
      v467: [['info', 'Fixed the Shop: the Union Jack and Kaali Peeli frame previews no longer draw a big frame over the whole page.']],
      v466: [['heart', 'Wishlist improvements: separate lists for each account, offline save retry, and saved seasonal items visible outside their event.']],
      v465: [['info', 'Clearer, lighter icons for Puzzles, No Mercy, 2 vs 2 and Best of Series, with more space around their shapes.']],
      v464: [['info', 'Mode icons now use a coordinated outline set, including the armored Gauntlet, team pairs, House Rules and Best of Series.']],
      v463: [['info', 'No Mercy now has its own skull icon in Play Friends and pinned shortcuts.']],
      v462: [['info', 'The end-of-match page now names the mode: No Mercy, Multiple Decks or House Rules, as well as 2 vs 2, Gauntlet and Ranked.']],
      v461: [['lock', 'No Mercy now unlocks at Lvl 25 (it shows on the Level Ladder).', WN_KEY]],
      v460: [['spade', 'No Mercy now teaches itself: short tips appear the first two games a 4, Queen, King, Ace or Joker turns up in your hand. Bots also play the King and Ace on purpose.', WN_KEY]],
      v459: [['spade', 'Bots now play the No Mercy Ace when it will make opponents pick up a card.']],
      v458: [['spade', 'No Mercy has a new Ace rule: every opponent takes one card from the bottom of the Pile. It stops at an Ace, and a King can be taken by an Ace.', WN_KEY]],
      v457: [['book', 'The card rules pop-up now explains the No Mercy Queen (X-ray), King (takes the bottom card) and Joker (not on a 4), and the Play Matrix shows the Joker as not playable on a 4. Crimson Verdict card back shows its art again.']],
      v456: [['sparkle', 'London Calling and Mumbai Masala have refreshed portraits, cards, tables, frames and emotes, with reworked city effects and matching sound.']],
      v455: [['sparkle', 'Bots that get stuck going round in circles now try a different move to break out of it.']],
      v454: [['sparkle', 'No Mercy: a King at the bottom of the Pile can no longer be taken by a King, which stops Kings passing round in circles.']],
      v453: [['sparkle', 'A weekly No Mercy challenge joins the pool from next week: win 5 matches of No Mercy.', WN_KEY]],
      v452: [['sparkle', 'No Mercy: Hard and Boss bots now use the cards a Queen showed them. New Guide section and Key Term.']],
      v451: [['sparkle', 'No Mercy rewards: play 50 Queens to unlock The Seer, make others take 50 cards with Kings for The Enforcer, win 10 games for the Crimson Verdict card back and 25 for its deck.', WN_KEY]],
      v450: [['sparkle', 'No Mercy is here: a new mode where Queens see a hidden card, no Joker goes on a 4 and Kings make the next player take the bottom card. Find it in More Modes or Play Friends.', WN_KEY]],
      v449: [['sparkle', 'Queen X-ray scan and memory tags for the new rules-twist mode (not playable yet).']],
      v448: [['sparkle', 'Groundwork for a new rules-twist mode (not playable yet).']],
      v447: [['book', 'The Guide now explains Multiple Decks, with a new Key Term.']],
      v446: [['sparkle', 'Multiple Decks rewards: win 10 games to earn the animated Double Deck avatar, plus four new challenges (win a game, win 10, Snap Burn 10 times, finish top three at a big table).', WN_KEY]],
      v445: [['sparkle', 'Multiple Decks is here to try: two decks, four Jokers and 4 to 8 players. Play it from More Modes against bots, or host it in Play Friends with up to 8 seats.', WN_KEY]],
      v444: [['sparkle', 'Multiple Decks groundwork: a side rail for big tables and a hand grouped by rank. Not playable yet.']],
      v443: [['sparkle', 'Groundwork for a Multiple Decks mode: two decks, four Jokers and longer Joker counter chains. Not playable yet.']],
      v442: [['sparkle', 'Mumbai Masala: nine new Shop items rendered in 3D: the Dabbawala avatar, Marigold Garland card back, Marine Drive Nights table, Masala Chai deck, Kaali Peeli frame, a Mumbai emote pack, and three effects with their own sounds: Monsoon Deluge, Tiffin Surprise and Gateway Gala.', WN_KEY]],
      v441: [['sparkle', 'Tower Bridge now has proper lattice-girder leaves that lift for the ship, and the Glitch Joker, Fortune Joker and Karate tiles were redrawn.']],
      v440: [['sparkle', 'London effects reworked from your recording: the bus now drives head-on at the card from behind it and grows with perspective, and the ship sails smoothly through the open Tower Bridge with the stone block removed.']],
      v439: [['sparkle', 'London set fixes: the Routemaster now drives down the road straight at the card with spinning wheels, the ship sails through the open Tower Bridge, the Union Jack card back is just the flag, and the Guardsman holds his rifle properly.']],
      v438: [['sparkle', 'London Calling: a new UK set in the Shop. Royal Guardsman avatar, Union Jack card back, Thames Nights table, Underground deck, Union Jack frame, Routemaster Rush burn, Phone Box Prank Joker, Tower Bridge Salute victory and the London emote pack.', WN_KEY]],
      v437: [['sparkle', 'Test Lab tabs are in a new order, and the Avatar tab now shows on the opponent seat.']],
      v436: [['sparkle', 'The Test Lab can now try on any card back, table, deck, frame, emote pack and avatar (test account only).']],
      v435: [['sparkle', 'Champagne Pop now shows a real champagne bottle: it shakes with the countdown, the cork flies and champagne, foam and bubbles pour out.', WN_KEY]],
      v434: [['sparkle', 'While a failed blind flip waits for its pickup, nothing can be played onto it, Snap Burn included.']],
      v433: [['sparkle', 'A failed blind flip now has priority: no Snap Burn is offered on the card that was just flipped.']],
      v432: [['sparkle', 'Every Burn, Joker and Victory tile now has a simple picture that matches its effect.']],
      v431: [['sparkle', 'The ShitStorm is seen slightly from above, so the head and funnel read as true round 3D shapes as they turn.']],
      v430: [['sparkle', 'The ShitStorm head is smaller and the funnel wider, so the character is in proportion.']],
      v429: [['sparkle', 'The ShitStorm is now a solid, lit 3D character: the head is a real turning volume with light travelling round it, and the funnel whirls beneath it.', WN_KEY]],
      v428: [['sparkle', 'The ShitStorm now spins as one: the grinning head turns like a top and the funnel under it whirls with its coils travelling round.', WN_KEY]],
      v427: [['sparkle', 'The ShitStorm funnel now spins round its axis under the grinning head, with its coils travelling round it.', WN_KEY]],
      v426: [['sparkle', 'The ShitStorm now really spins: the painted funnel turns on its axis, its coils travelling round it, instead of swaying with the light moving.', WN_KEY]],
      v425: [['sparkle', 'The ShitStorm is the painted tornado again, body and head in one style. Ghost Flames trails off into smoke instead of stopping at a box edge, and the Shuriken Barrage stars are back on screen from the first frame.', WN_KEY]],
      v424: [['sparkle', 'Spark Snap and Royal Incineration are rebuilt: sparks are sucked into your card and it snaps into gold-edged shards, and a jewelled crown lands on rays of light before golden fire consumes the card. Ghost Flames no longer runs off the edges and Shuriken Barrage runs lighter.', WN_KEY]],
      v423: [['sparkle', 'Nine more victory effects are redrawn with their own sounds: Love Wins (Valentine), Beach Party (Summer), Bat Swarm (Halloween), Festival of Lights (Diwali), Santa\'s Sleigh (Christmas), Midnight (New Year), Egg Hunt (Easter), Dragon Dance (Lunar New Year) and Crescent Night (Ramadan). Confetti Burst is now a party of cannons and the default effects can be previewed.', WN_KEY]],
      v422: [['sparkle', 'Three more victory effects are redrawn with their own sounds: Trophy Lift rises in a burst of light with a WINNER ribbon, Rocket Launch counts down and blasts off through smoke, and Fireworks are now crisp sparks with comet tails that open as willows, peonies and rings.', WN_KEY]],
      v421: [['sparkle', 'Three victory effects are redrawn with their own sounds: Sparkler Salute writes loops of light that meet in a golden burst, 5-Star Finish lights each star with a chime and a sunburst, and Karate Chop now snaps three wooden boards in one chop.']],
      v420: [['sparkle', 'Card Shower is now a fountain of your own cards, wearing your equipped card back and frame, and Origami Flock finishes sooner. Lion\'s Roar now shakes the screen, flashes from his mouth and sends embers rising.']],
      v419: [['sparkle', 'The Fortune Joker effect now starts with a cracked, curved fortune cookie: it shakes, splits open, and the gold Joker plate spins out of it.']],
      v418: [['sparkle', 'The Pumpkin Joker effect has more life: candle light that flickers and flares inside the pumpkin, ghost echoes trailing behind the ghost, a green flash and shock ring on the BOO, bats crossing the sky and mist along the ground.', WN_KEY]],
      v417: [['sparkle', 'The Vampire now bites where you can see it: the whole Joker card sits under him and he sinks his fangs into its top edge.']],
      v416: [['sparkle', 'The Vampire Joker effect now bites: he pulls back, lunges with his mouth wide, sinks his fangs into the Joker card and blood runs from the punctures.', WN_KEY]],
      v415: [['gear', 'Fixed the Vampire Joker effect running a little past its 1.5 second window.']],
      v414: [['sparkle', 'The Jack-in-the-Box, Lunar New Year, Valentine, Ramadan and Vampire Joker effects are rebuilt: a springing jester with a wound crank, a spinning gold fortune plate, an arrow that splits a beating heart, a moonlit lantern scene, and a cape that sweeps open.', WN_KEY]],
      v413: [['sparkle', 'The Magic, Christmas and Diwali Joker effects are rebuilt: a magician\'s hat with a wand, poof and fan of cards, a snow globe that shakes and shatters, and a rangoli ringed by twelve lighting lamps.', WN_KEY]],
      v412: [['sparkle', 'The New Year, Summer and Puppet Joker effects are rebuilt: a midnight clock and champagne pop, a Joker surfing and flipping off a wave, and a jointed puppet dancing on stage between curtains.', WN_KEY]],
      v411: [['sparkle', 'The default Joker effect, Glitch and Card Storm are rebuilt: a flipping card in a fan of gold light, a card torn into jumping slices, and 30 cards spiralling into one Joker.', WN_KEY]],
      v410: [['fire', 'The Valentine, Summer, Christmas, Lunar New Year and Ramadan burns are rebuilt: an arrow and heart burst, a sun pop with a beach ball, ribbons and a bow, a firecracker string, and lanterns with a crescent and star.', WN_KEY]],
      v409: [['fire', 'The Diwali, Easter and New Year burns are rebuilt: a diya-lit firework burst, an egg that cracks open to a chick, and a countdown to a champagne pop. The card now burns away in each.', WN_KEY]],
      v408: [['fire', 'Confectionery, Glacial Shatter, Sandstorm, Abyssal Whirlpool and the Ramadan burn are polished: glassy ice shards, sweets that fly sideways, and effects that stay clear of the opponent seat.', WN_KEY]],
      v407: [['fire', 'Black Hole and Pixel Blast are rebuilt (a spiralling collapse, a chunky pixel blast) and the Origami swan now flies clear of the screen.', WN_KEY]],
      v406: [['fire', 'Electric Blast, Inferno Sweep, Default Burn and Smoke Burst are rebuilt: forked lightning that shatters the card, a whip of fire, a climbing flame edge and a bursting smoke ball.', WN_KEY]],
      v405: [['gear', 'Test Lab: a card in the game modes for the AmitK account with a ready dummy table to try any Burn, Joker or Victory effect.']],
      v404: [['fire', 'Ice Shatter, Paint Splats and Smoke Show are rebuilt: frost and a glassy shatter, wet paint splats that run down the card, and billowing lit smoke.', WN_KEY]],
      v403: [['fire', 'The ShitStorm now has thick, wet poo spirals that run up into its head, and the head gets a pointed spiral tip while it spins.', WN_KEY]],
      v402: [['fire', 'The Hellfire Spiral is now a 3D flaming tornado of fire ribbons with smoke, and the ShitStorm coils turn together with its head.', WN_KEY]],
      v401: [['fire', 'The home screen shrinks to fit short phones, and the ShitStorm card is easier to read.']],
      v400: [['fire', 'The ShitStorm now has a complete curled head, shaded swirling coils and a tighter card-consuming finish.']],
      v399: [['snow', 'Season Pass: the Origami Fold burn is now a Season 3 (Feudal Japan) reward at tier 20, and no longer a tier 50 reward in every season.', WN_KEY],
        ['snow', 'Season Pass: every season now gives a burn at tier 40: Sandstorm Vortex, Glacial Shatter, Shuriken Barrage, Abyssal Whirlpool, Zeus\'s Bolt and Arcane Hex. Seasons 5 (Ancient Greece) and 6 (Dark Magic) are ready.', WN_KEY]],
      v398: [['snow', 'Season Pass: Season 3 (Feudal Japan, March and April) and Season 4 (Deep Ocean, May and June) are ready, each with a card back, avatar and table. Tier 50 of every season now also gives the Origami Fold burn, or 209 Diamonds if you already own it.', WN_KEY]],
      v397: [['image', 'The Sphinx Cub and Baby Mammoth avatars now show their whole ring.']],
      v396: [['sparkle', 'Season 1, Ancient Egypt, has new artwork: a Scarab of Ra card back, the Sphinx Cub avatar and a moonlit temple table.']],
      v395: [['snow', 'Season Pass: Season 2, Ice Age, is ready for January. Earn the Frost Mammoth card back, Baby Mammoth avatar and Frozen Path table. Every Season card back now says which season it is from.']],
      v394: [['book', 'Guide and Key Terms now explain the Season Pass, and How To Earn XP on the Level Ladder mentions it.']],
      v393: [['star', 'Season Pass: Season 1, Ancient Egypt, runs 1 November to 31 December. Every XP you earn also fills a free 50-tier pass with Diamonds on every tier and three exclusive items: a card back, an avatar and a table. Open it from the home screen or the Level Ladder.', WN_KEY]],
      v392: [['sparkle', 'New setting: Double-Tap To Play (Settings, Gameplay, off by default) plays a card when you tap the same card twice. Swapping cards in a Ranked game now shows at once instead of waiting for the server.', WN_KEY]],
      v391: [['people', 'New tips in 2 vs 2: who your partner is, what happens when you are out, and that two 8s also skip your partner.']],
      v390: [['people', 'Fixed a table freeze when a bot drew a Bonus Draw card in an online game. In 2 vs 2, Hard and Boss bots no longer skip their own partner with two 8s, and opponent seats have a darker backing so names are easy to read on any table.']],
      v389: [['people', 'Tapping 2 vs 2 now lets you pick the bots\' difficulty, or host a 2 vs 2 room with friends.']],
      v388: [['people', '2 vs 2 is here: team up with a partner who sits opposite you, with bots from More Modes or friends in Play Friends. Win 10 games to unlock the Dream Team avatar.', WN_KEY]],
      v387: [['ghost', 'Ghost Flames now forms as one figure and rips the card in two with its claws.', WN_KEY]],
      v386: [['ghost', 'Ghost Flames now appears and fades as one whole ghostly figure.']],
      v385: [['ghost', 'Ghost Flames is now fully 3D: the ghost and its fire move as one lit figure that turns to face you, reaches out with its claws and trails flowing flame.', WN_KEY]],
      v384: [['ghost', 'Ghost Flames is back to the original painted ghost while the 3D version is reworked.']],
      v381: [['eye', 'Watch a friend\'s Play Computer or Gauntlet game from your Friends list. You see the table, never their hand. Settings → Friends Can Watch turns it off.', WN_KEY]],
      v380: [['sparkle', 'Event login bonus: on every day a seasonal event is live, your daily login reward comes with 30 extra Diamonds.', WN_KEY]],
      v379: [['sparkle', 'The leaderboard tabs scroll sideways, so the Event tab is never cut off.']],
      v378: [['sparkle', 'Event recaps now arrive from the server, so you get yours even if you open the game weeks after the event.']],
      v377: [['sparkle', 'Event leaderboard: win games during an event to climb it. When the event ends the top 10 with 5+ wins win Diamonds (up to 1000). The event pop-up also has a Preview button on every item.', WN_KEY]],
      v376: [['sparkle', 'Finish all four challenges of an event to earn its Champion frame: a gold-and-event-colour frame for your cards, one for every event.', WN_KEY]],
      v375: [['sparkle', 'Gift an item straight from a friend\'s wishlist, and get a mail when something on your wishlist is in the Shop for an event.', WN_KEY]],
      v374: [['sparkle', 'Shop wishlist: tap the heart on any item to save it. Your wishlist shows on your Profile, and other players can see it on your player card.', WN_KEY]],
      v373: [['sparkle', 'Ranked wins, finished matches and Jokers now count towards the daily, weekly and event challenges.', WN_KEY]],
      v372: [['sparkle', 'During an event the computer players take its names: Casper and Dracula at Halloween, Santa and Rudolph at Christmas, and more.', WN_KEY]],
      v371: [['sparkle', 'When an event ends, a recap mail shows your wins, challenges finished and Diamonds earned.', WN_KEY]],
      v370: [['sparkle', 'In the last 3 days of an event, a reminder shows the items you do not own yet and what is left to earn.', WN_KEY]],
      v369: [['sparkle', 'While an event is on, the home screen shows how many days are left and how far you are, with a tap to open the event Shop.', WN_KEY]],
      v368: [['target', 'During an event, the Seasonal challenges are now the first tab.']],
      v367: [['sparkle', 'A pop-up now tells you when an event starts: what is in the Shop and what you can earn.', WN_KEY]],
      v366: [['puzzle', 'Six new weekly puzzles, so there is a different one for each of the 52 weeks of the year.', WN_KEY]],
      v365: [['sparkle', 'During events the computer players wear and use that event\'s avatar, card back, burn, Joker and victory effects. They go back to the plain look when the event ends.', WN_KEY]],
      v364: [['puzzle', 'The weekly puzzle is now a shuffled order, so you will not get the same kind of puzzle week after week.', WN_KEY]],
      v363: [['puzzle', 'Face-Up and Face-Down puzzles now use exactly three cards, as in a real game.']],
      v362: [['puzzle', 'Trap puzzles can no longer be solved by just clearing your Hand, and hints now follow where you are in the puzzle.']],
      v361: [['puzzle', 'Fixed the multi-turn puzzles saying they could not be solved after a good first move.']],
      v360: [['puzzle', 'Fixed the newer weekly puzzles that could not be completed on some phones.']],
      v359: [['puzzle', 'The End On A Card puzzles now finish on a 5, a 6 or a 7 as well as a 4.']],
      v358: [['puzzle', '7 longer weekly puzzles over two or three turns: the Rival plays a card or two between your turns, and you do not have to play your whole Hand at once.', WN_KEY]],
      v357: [['puzzle', '7 more weekly puzzles: end on a 4, and trap the Rival over two turns. Face-Down puzzle cards now stay face down.', WN_KEY]],
      v356: [['puzzle', '12 new weekly puzzles: clear your Face-Up cards, flip your Face-Down cards one at a time, or play your Joker to make the Rival pick up a big Pile.', WN_KEY]],
      v355: [['puzzle', 'Puzzle cards now show just the rank with its suit underneath, with no icon in the middle.']],
      v354: [['puzzle', 'Puzzles: the Pile is now a real stack, cards show their suit instead of power icons, the page no longer changes size as you play, and repetitive puzzles are replaced by 11 new ones.']],
      v353: [['puzzle', 'Eight new weekly puzzles, 17 in all, with new tricks: a 5 on the Jack, a 7 that locks the Rival out, two burns in one turn and more.', WN_KEY]],
      v352: [['sparkle', 'Solving a weekly puzzle now shows a clear Puzzle solved panel with your reward, plus Done and Play again buttons.']],
      v351: [['sparkle', 'Puzzles: when your turn ends without solving it, the Rival now plays a card you can see, and a Try Again button appears. When the Rival is stuck, they pick up the Pile.']],
      v350: [['sparkle', 'The puzzle page now fits on one screen with no scrolling, and Select All Of A Rank is a single icon button.']],
      v349: [['sparkle', 'Puzzles now look like the real game table and use your equipped table, deck, card frame, avatar, Burn and Victory effects. A game mode can only be pinned to one shortcut.']],
      v348: [['sparkle', 'Every game mode now has its own colour, and a pinned shortcut shows its mode\'s colour. The Puzzles icon is a proper puzzle piece.']],
      v347: [['gem', 'Weekly puzzles now pay 50 Diamonds and 50 XP. Select All Of A Rank works from the start of a puzzle.', WN_KEY]],
      v346: [['gem', 'Weekly puzzles now pay 5 Diamonds and 50 XP the first time you solve each one. Signed-in players only, and not after Give Up.', WN_KEY]],
      v345: [['sparkle', 'Seasonal events now pay 1.5× XP on everything you earn: games, wins, Ranked, the Gauntlet and challenges. A gold note shows while it is on.', WN_KEY]],
      v344: [['guide', 'The Guide, Key Terms and Quick Start now match the new home screen and header: new Header, Menu, Mode Card and Shortcut Card entries.']],
      v343: [['puzzle', 'A pinned Puzzles shortcut now opens the weekly puzzle, and Puzzles shows Solved once you finish the week\'s puzzle.']],
      v342: [['puzzle', 'Puzzles now have three goals: go out in one turn, burn the Pile in a set number of plays, or leave the Rival with nothing to play. Nine puzzles, and a Puzzles section in the Guide.', WN_KEY]],
      v341: [['puzzle', 'Weekly Puzzles are here. Open More Modes → Puzzles: one hand, one turn, one way to win. A new puzzle arrives every week.', WN_KEY]],
      v340: [['shield', 'Protect Best Cards is now off by default. Turn it on in Settings → Gameplay if you want Select All Of A Rank to pick just one 2, 3, 10 or Ace.']],
      v339: [['shield', 'New setting, Protect Best Cards (on by default): Select All Of A Rank now picks just one 2, 3, 10 or Ace, so you never waste them by accident.', WN_KEY]],
      v338: [['eye', 'A 3 on the Pile now shows the card it covers, tucked underneath with its corner visible, however many 3s are on top.', WN_KEY]],
      v337: [['sparkle', 'New players get a short tour of the header, the game modes and the Tutorial. Replay it any time from Menu → Take The Tour.', WN_KEY], ['swords', 'Press and hold a mode card on Home to pick it up and move it. Your order is kept on this device.', WN_KEY], ['bot', 'Vs Bots is now called Play Computer everywhere, and the Guide has a Game Modes section.']],
      v336: [['friends4', 'Restored Home mode navigation and button interactions while retaining the updated Tutorial box, Play Friends layout and series level locks.', WN_KEY]],
      v335: [['swords', 'Best of 5 unlocks at Level 35 and Best of 7 at Level 45 for both players.', WN_KEY], ['friends4', 'Larger Tutorial icon and text, a colourful icon box, and compact Play Friends series settings.']],
      v334: [['friends4', 'Play Friends has the Home-style carousel with Go buttons, compact settings pages, and three custom ruleset slots with in-app naming and account sync.', WN_KEY]],
      v333: [['friends4', 'Play Friends now starts with Host or Join. Choose from five mode cards before hosting, with Standard selected and compact seats below the room code.']],
      v331: [['friends4', 'Play Friends: visual seats, mode carousel and host settings.', WN_KEY], ['swords', 'Best of Series now includes Best of 7.', WN_KEY]],
      v330: [[ '🃏', 'The mode cards no longer get stuck if you let go of the mouse outside the window mid-drag.' ]],
      v329: [[ '🃏', 'More room on Home, centred carousel arrows, fullscreen tutorial video, mode help and clearer Shortcut controls. Active Gauntlets show Continue, and cards stay visible when returning Home.' ]],
      v328: [[ '🃏', 'Swipe on mobile, tap Go to open a mode, and double-tap a card to enter. The logo clears open panels, guest badges match signed-in levels, and the home tutorial has a compact video layout.', WN_KEY ]],
      v327: [[ '🃏', 'Drag one mode at a time, or keep holding to browse. Guest profiles now show an avatar and Level 1, with softer card shadows.' ]],
      v326: [[ '🃏', 'The card that flips open into a mode page now matches the new card look.' ]],
      v325: [[ '📄', 'The More Modes page shows each coming mode with its own icon, and no longer shows the last mode you opened underneath.' ]],
      v324: [[ '🧭', 'The mode cards are solid and spread wider, the middle one glows in its colour, and they follow your finger with a flick. Hold an arrow to keep turning, or use the arrow keys.' ]],
      v323: [[ '🧭', 'Each mode card has its own colour, and new buttons jump to the first or last card.' ], [ '📌', 'Pin a coming mode (2 vs 2, Puzzles, Randomiser, Multiple Decks or No Mercy) to a Shortcut card, ready for when it launches.', WN_KEY ]],
      v322: [[ '🧭', 'On a mode page, Exit takes you straight back to the modes and the logo returns home. In a game, Exit asks before you forfeit. Google sign-in now works on shithead-deluxe.web.app.' ]],
      v321: [[ '🃏', 'Opening a mode flips its card over and spreads it across the screen into the mode page.' ]],
      v320: [[ '📄', 'Each mode now opens its own page with a Back button: Play Computer, Play Friends, Ranked, the Gauntlet, and a More Modes preview.', WN_KEY ]],
      v319: [[ '✨', 'The mode cards click into place with a soft card snap and a light buzz, and More Modes wears a glowing New tag.' ]],
      v318: [[ '🎡', 'The mode cards now turn in 3D: swipe, use the arrows or mouse wheel, or press 1-7. Tap the middle card to open it; your last mode comes back next time.', WN_KEY ]],
      v317: [[ '🃏', 'A new home screen: swipe through the game modes on one row of cards, with the tutorial at the bottom.', WN_KEY ]],
      v316: [[ '🏠', 'Tap the ShitHead logo during a game to head back to the home screen. It asks first, then skips the loading screen.' ]],
      v315: [[ '🧭', 'A new header: Shop, Custom, Guide and Settings sit along the top of the home screen and tuck into the menu during a game. Exit is always on the left.' ]],
      v314: [[ '🏠', 'A calmer home screen: the panel no longer jumps between modes, shortcuts sit in one quiet row, and Game Speed lives in Settings.' ]],
      v313: [[ '🦢', 'Origami Fold remade: your card lifts to the middle of the table, folds into a long-necked swan, hovers and flies away.', WN_KEY ]],
      v312: [[ '🏠', 'House Rules matches now show the chosen card powers everywhere: Card Powers, Play Matrix, Pile labels and card descriptions all follow the match rules.', WN_KEY ]],
      v311: [[ '🃏', 'House Rules is being prepared for Play Friends, with custom card powers, adaptive bots and protected casual-only rewards.', WN_KEY ]],
      v310: [[ '🔗', 'The game has a new home: shithead-deluxe.web.app. Invite links, referral links and shared results now use it; the old address still works.' ]],
      v309: [[ '✨', 'Opening the installed app on Android now flows smoothly from the app icon into the loading screen.' ]],
      v308: [[ '🔥', 'Coloured Flame now sets your real card alight: violet, pink and blue flames, each moving on its own, burn it from the bottom up while its edge curls over.', WN_KEY ]],
      v307: [[ '🌋', 'Lava Melt now sinks your real card into a bubbling pool of lava ringed by rocks: it burns away at the surface, softens as it goes under, then the lava cools and sinks away.', WN_KEY ]],
      v306: [[ '🍬', 'Stupendous Confectionery now bursts your real card open like a sweet wrapper: dozens of sweets, each flying, tumbling and bouncing on its own, with your card back on the torn halves.', WN_KEY ]],
      v305: [[ '🦢', 'Origami Fold now folds your real card: it creases into a kite, folds in half, lifts its neck and head, shows your card back on every fold, beats its wings and flies off the screen.', WN_KEY ]],
      v304: [[ '🔥', 'Five Shop burns are reborn as painted 3D scenes: Coloured Flame, Electric Blast, Stupendous Confectionery, Lava Melt and Origami Fold, each with its own new sound.', WN_KEY ],
        [ '⚡', 'Electric Blast strikes your card with real lightning; Stupendous Confectionery sends painted sweets tumbling out of the Pile.', WN_KEY ],
        [ '🦢', 'Origami Fold folds a paper swan round your card, then it flies away. Lava Melt sinks your card into a field of molten rock.', WN_KEY ],
        [ '🖼️', 'Every reworked burn now shows its painted artwork as its icon in the Shop and Custom.' ]],
      v303: [[ '🔥', 'The Default Burn is reborn: the coals glow, then real fire roars up around your card and burns it away in a shower of sparks and ash.', WN_KEY ]],
      v302: [[ '✨', 'A new app icon: three Emerald Court cards behind a big red and gold SH.', WN_KEY ],
        [ '🃏', 'The loading screen now says ShitHead Deluxe, in the same lettering as the home screen.' ]],
      v301: [[ '⚡', 'The game opens faster: a loading screen shows straight away, and your level and Diamonds are on the home screen from the start.', WN_KEY ],
        [ '⏩', 'Your chosen game speed no longer flicks back to 1x while the game is starting.' ]],
      v300: [[ '✨', 'Spark Snap (Lvl 5) is reborn: a charge crackles round your card, then snaps into a white-gold explosion of sparks and light.', WN_KEY ],
        [ '🔥', 'Inferno Sweep (Lvl 40) is reborn: a whip of fire lashes across the Pile and sweeps your card away in a swirl of flame.', WN_KEY ]],
      v299: [[ '💩', 'The ShitStorm (Lvl 99) is reborn: a grinning storm whirls up out of the Pile in a blaze of gold and spins your card away.', WN_KEY ],
        [ '🌪️', 'Tall burns now shrink to fit the space above the Pile, so they are never cut off at the top of the screen.' ]],
      v298: [[ '👑', 'Royal Incineration (Lvl 80) is reborn: a jewelled gold crown descends over your card as golden fire bursts out beneath it.', WN_KEY ],
        [ '🌪️', 'Hellfire Spiral (Lvl 60) is reborn: a magma tornado rears up out of the Pile and spins your card away.', WN_KEY ]],
      v297: [[ '💨', 'Smoke Burst (Lvl 20) is reborn: a rolling cloud of smoke and fire bursts out of the Pile around your card.', WN_KEY ],
        [ '🃏', 'Burning cards that flip over now show the card back of the player who burned them.' ]],
      v296: [[ '👻', 'Ghost Flames is reborn: a spectral wraith rises from blue-violet fire and tears the Pile apart, with new sound.', WN_KEY ],
        [ '🔥', 'Inferno Sweep now burns your real top card in 3D as a wave of fire rolls across the table.', WN_KEY ]],
      v295: [[ '🔥', 'Level Burns have richer sparks, smoke, fire trails and gold shockwaves, with matching sound.' ]],
      v294: [[ '🔥', 'The six level-reward Burns now have cinematic artwork, layered animations and matching sounds.' ]],
      v293: [
        [ '💡', 'Ten more helper tips: pickups, burns, the 3, last cards, swapping, Gauntlet lives, the Inbox, levelling up and Ranked.' ]
      ],
      v292: [
        [ '💡', 'Seven more helper tips: Face-Up and Face-Down cards, Bonus Draw, inviting friends, equipping in Custom, spending Diamonds, the 9 and Ranked ratings.' ]
      ],
      v291: [
        [ '💡', 'Helper tips: short one-time tips explain things the first time you meet them. Turn them off in Settings → Display → Helper Tips.', WN_KEY ],
        [ '🪜', 'The Level Ladder now names the weekly unlocks: a 6th weekly challenge at Lvl 45 and a 7th at Lvl 65.' ],
        [ '👆', 'Tap outside the match summary to close it.' ]
      ],
      v290: [
        [ '📅', 'More challenges as you level up: a 4th daily challenge at Lvl 35 and a 5th at Lvl 55, plus an extra weekly challenge at Lvl 45 and another at Lvl 65.', WN_KEY ],
        [ '🪜', 'Level Ladder: tapping a reward opens its big preview, with an Equip button.' ],
        [ '📂', 'Challenges: every section folds away with its own chevron and shows how many you have done.' ],
        [ '🎓', 'Quick Start: the first step already shows the table you play on in step 2.' ]
      ],
      v289: [
        [ '🔄', 'Weekly Reroll: from Lvl 40, swap one weekly challenge for a different one each week.', WN_KEY ],
        [ '👆', 'Custom: double-tap an item to equip it, so a stray tap never changes your look.' ],
        [ '🎁', 'Gifting unlocks at Lvl 2.' ],
        [ '⏱️', 'Play Friends turn timers now run Blitz, Balanced, Casual from left to right.' ],
        [ '🎓', 'Quick Start always shows the cards you can play in green, and explains the Play Matrix more clearly.' ],
        [ '📈', 'The match summary\'s Level Ladder button is centred.' ]
      ],
      v288: [
        [ '⌨️', 'Bonus Draw on a keyboard: pressing the drawn card\'s key (or Enter) plays it and closes the prompt.' ]
      ],
      v287: [
        [ '🦁', "Lion's Roar has a real lion's roar, and the Pumpkin Joker gets a proper crowd boo." ]
      ],
      v286: [
        [ '💎', 'The Diamonds in the header now say they open the Shop.' ]
      ],
      v285: [
        [ '💎', 'Reaching level 99 now pays 999 Diamonds.', WN_KEY ]
      ],
      v284: [
        [ '🧭', 'Every page now shows its icon next to its title, like the Shop.' ]
      ],
      v283: [
        [ '👤', 'Profile now has its own button in the header, next to the Inbox.' ],
        [ '🪜', 'Level Ladder is in the menu, with a new ladder icon. Challenges has a new target icon.', WN_KEY ]
      ],
      v282: [
        [ '👆', 'Select All Of A Rank moved from the header to the table, just left of your hand count, so it sits under your thumb.' ]
      ],
      v281: [
        [ '🛠️', 'Player cards, gift pop-ups, sign-out and reward messages now always show on top of the page you opened them from.' ]
      ],
      v280: [
        [ '👥', 'Level Ladder: tap +N on a level to see every friend there. Friends on the same level are ordered by XP.' ]
      ],
      v279: [
        [ '✨', 'A gold dot on your level means the Level Ladder has new rewards for you to see.' ]
      ],
      v278: [
        [ '⭐', 'Level Ladder: your friends now appear at their levels, and a level up climbs the ladder to show what you just unlocked.', WN_KEY ],
        [ '👆', 'Tap any level on the Level Ladder to see how much XP it needs.' ]
      ],
      v277: [
        [ '⭐', 'New: the Level Ladder. Tap your level anywhere to see your XP and every reward on the way to the top.', WN_KEY ]
      ],
      v276: [
        [ '↩️', 'Back from Custom returns to Profile when you opened it from your showcase.' ],
        [ '👆', 'Holding an item in Custom right after switching tabs opens its big preview.' ],
        [ '🎨', 'Signed out, your free table, card back and other free picks stay equipped when you open Custom.' ]
      ],
      v275: [
        [ '🏆', "Gauntlet: once a run is finished, View Result shows it again." ],
        [ '📌', 'Card Powers and the Play Matrix stay where you put them while cards are played.' ],
        [ '🦁', "Lion's Roar and Fireworks are quicker and a little smaller, so they fit phone screens." ]
      ],
      v274: [
        [ '🏁', 'The end of every match has the same buttons: Match Stats, the next step for that mode, and Leave under your result. Ranked shows Return To Ranked again.' ],
        [ '🃏', 'Ranked card history shows the cards played instead of "undefined".' ],
        [ '🎄', 'Fireside no longer has a row of wreaths along the top of the table.' ]
      ],
      v273: [[ '🎨', 'Custom has the Shop filters: All, Owned, Not Owned and Equipped.', WN_KEY ]],
      v272: [[ '🃏', "Opponents' Face-Up and Face-Down cards no longer overlap each other." ]],
      v271: [[ '🎴', 'Bots now choose randomly from the free card backs and keep their choice throughout the match.', WN_KEY ]],
      v270: [[ '🌄', 'Responsive full-scene tables with extended landscapes, complete large features and matching previews.', WN_KEY ]],
      v268: [[ '🖼️', 'Full-screen equipped table backgrounds on every device, star-only Cosmic Ace glints, and default card-back previews.', WN_KEY ]],
      v267: [[ '🎨', 'Correctly fitted card-back art and avatar borders, with rebuilt Cosmic Ace, Royal Flush and falling-tear animations.', WN_KEY ]],
      v266: [[ '🎴', 'The three free linen card backs are available in the Card Backs tab as well as All.', WN_KEY ]],
      v265: [
        ['🎨', 'New art for suit, seasonal and card avatars, including the 100-ranked-games Centurion.', WN_KEY],
        ['🃏', 'Redesigned themed card backs, a white textured SH default, and three free linen colours.', WN_KEY],
        ['✨', 'Royal Flush, Cosmic Ace, Burning 10, Joker Card and ShitHead have new looping animations.', WN_KEY]
      ],
      v264: [
        ["✨", "Shorter, seamless Lion and Fireworks victories, with a complete opening firework."],
        ["🤝", "Both players choose Ready before the next series game begins.", WN_KEY],
        ["🔄", "Updates wait until you return to the home screen."]
      ],
      v263: [
        ["👑", "Five redesigned crown avatars, with a Platinum glint and animated Master glow.", WN_KEY]
      ],
      v262: [
        ['🛡️', 'Ranked now keeps hidden cards on the server and checks every move before updating the table.', WN_KEY]
      ],
      v261: [
        ['🛡️', 'Stronger match checks: online wins use the actual match ID, and Ranked results require the matching server deal.'],
        ['🔄', 'Ranked stays in the lobby to retry if its server deal cannot be loaded.']
      ],
      v260: [
        ['📖', 'Tap the rotating home card to jump to its highlighted Card Powers entry in the Guide.', WN_KEY],
        ['ℹ️', 'Home mode information boxes are centred.']
      ],
      v259: [
        ['🎨', 'Tap an item in another player’s showcase to find it directly in Custom.', WN_KEY]
      ],
      v258: [
        ['✨', 'Smoother Lion’s Roar and Fireworks victories with matching sound timing and a complete gold firework.'],
        ['🎴', 'The free card-back preview now follows your equipped deck.'],
        ['🔄', 'Update prompts wait until you return to the home screen.'],
        ['📖', 'Tap outside menu pages to close them; Hard and Boss Gauntlet now have their own Key Terms.'],
        ['🏅', 'Challenges and Gauntlet leaderboards now have All-time and This week views.', WN_KEY]
      ],
      v257: [
        ['🦁', "Lion's Roar has brand-new art: the lion surges in and roars, with a real roar, gold shockwaves and flying crystals.", WN_KEY],
        ['🎆', 'Fireworks is redrawn: five rockets whistle up and burst in gold, red, blue, purple and green, with the bangs and crackle to match.', WN_KEY],
        ['🎃', 'Halloween refresh: the Pumpkin Joker ghost bursts out with a spooky "Boooo!", the Jack-o\'-Lantern avatar flickers with candlelight, and the Cobweb card back is redrawn.', WN_KEY]
      ],
      v256: [
        ['🏆', 'Beating the Boss Gauntlet again on a later day now pays 200 Diamonds.', WN_KEY],
        ['✨', 'Burn King, Chaos Jester and The ShitHead avatars now move: glowing eyes, flickering flames, glinting gems and a gleam across the shades.', WN_KEY],
        ['📂', 'Custom is split into folding groups (Free, Shop, Earn in Ranked, the Gauntlet, levelling up, Seasonal) that remember how you left them.'],
        ['ℹ️', 'Vs Bots, Play Friends and Ranked each have a small ⓘ that explains the mode.'],
        ['📖', 'Quick Start: Card Powers always fits on screen, and the hold step waits a moment so you can read the card.'],
        ['🔧', 'The Gauntlet info box stays on screen.']
      ],
      v255: [
        ['🛒', 'On tablets and computers the Shop has its own button in the header, next to your Diamonds.'],
        ['🔧', 'Folding sections (Best Of Series, Shop, Custom, Guide and others) now open and close on every tap.']
      ],
      v254: [
        ['⚔️', 'Two new Gauntlets: Hard (Medium, three Hard, then the Boss, 2 lives) at Lvl 30 once you have beaten the Easy Gauntlet, and Boss (three Boss bots, 1 life) at Lvl 50 once you have beaten Easy once and Hard 3 times.', WN_KEY],
        ['🏆', 'Beat the Hard Gauntlet for 400 Diamonds, the Gauntlet Conqueror avatar and the Crimson Gauntlet frame; beat the Boss Gauntlet for 600 Diamonds, the Gauntlet Overlord avatar and the Amethyst Gauntlet frame.', WN_KEY],
        ['✨', 'The Gauntlet Champion avatar has new animated art, with shining swords and glinting gems. If you own it, it has changed over by itself.', WN_KEY],
        ['📅', 'One Gauntlet a day: the first one you start is your Gauntlet for that day, and a run must be finished before you can start another.'],
        ['📖', 'The Guide explains all three Gauntlets.']
      ],
      v253: [
        ['🔥', 'Six new burn effects to earn by levelling up: Spark Snap (5), Smoke Burst (20), Inferno Sweep (40), Hellfire Spiral (60), Royal Incineration (80) and The ShitStorm (99).', WN_KEY]
      ],
      v252: [
        ['📜', 'Match History: tap a game to see its full stats, and tap a player in it to open their player card.', WN_KEY],
        ['📖', 'The Guide now explains Ranked, Play Friends and Best Of Series.', WN_KEY],
        ['💡', 'Opening Ranked or Play Friends for the first time shows a short card on how it works. Tap "How it works" to see it again.'],
        ['👀', 'Tap an item you don\'t own yet in Custom or the Collection to preview it.', WN_KEY]
      ],
      v251: [
        ['🏆', 'New earn-only avatars for levelling up: Rookie Rogue (10), Card Shark (25), Burn King (50), Chaos Jester (75) and The ShitHead (99).', WN_KEY],
        ['🃏', 'New earn-only card backs: First Burn (10), Shark\'s Mark (30), Inferno (50), Chaos Crown (70) and Master of the Pile (99).', WN_KEY],
        ['✨', 'Level badges below Lvl 20 are now white.']
      ],
      v250: [
        ['🏆', 'Level badges change colour as you climb: bronze at 20, silver at 40, gold at 60, purple at 80 and a shimmering cyan at 99.', WN_KEY],
        ['👥', 'A friend request you send now shows as Pending until they accept, and you can accept theirs from their player card.'],
        ['👀', 'Tap a friend\'s "In a match" status to watch their game.'],
        ['🔒', 'Saved looks: the second slot unlocks at Lvl 10 and the third at Lvl 20.'],
        ['🏅', 'Tap your own row on the leaderboard to see your own player card.'],
        ['📊', 'The XP pop-up in the header now opens in the middle, under the bar.']
      ],
      v249: [
        ['📬', 'Tap any mail to go straight to what it is about: the item in Custom, the player, the leaderboard, your level or the challenge.', WN_KEY],
        ['👤', 'Profile pictures are now called Avatars everywhere.']
      ],
      v248: [
        ['🏆', 'Level rewards: the Rising Star card back at Lvl 15, the Ascendant frame at Lvl 25 and the Summit table at Lvl 50, free.', WN_KEY],
        ['✨', 'Press and hold any item in Custom or the Shop for a big preview that plays the effect.', WN_KEY],
        ['📬', 'Friends get a mail when you reach every 10th level, and level 99.', WN_KEY],
        ['📖', 'Challenge words like Snap Burn and Gauntlet open the Guide on that term; more Key Terms added.'],
        ['😄', 'Hold the emote button to send your last emote again.'],
        ['📊', 'Tap a leaderboard score, or hold a row, for a quick look at that player\'s stats.'],
        ['⌨️', 'Escape closes every menu and page in one press on PC.'],
        ['🔒', 'Tap or hover the lock on 2x and 4x speed to see how to unlock them.']
      ],
      v247: [
        ['⏩', 'Game speed: 2x now unlocks at Lvl 5 and 4x at Lvl 10 (sign in to use them). 0.5x and 1x are open to everyone.', WN_KEY]
      ],
      v246: [
        ['↩️', 'Back on your phone now returns to the page you came from, like Custom back to Profile.']
      ],
      v245: [
        ['🎨', 'Profile: tap anything in your showcase to jump straight to it in Custom.', WN_KEY]
      ],
      v244: [
        ['🏠', 'Home screen: a bigger profile picture beside your nickname.']
      ],
      v243: [
        ['🏠', 'Home screen: the level box now matches the nickname box, and levels read "Lvl".']
      ],
      v242: [
        ['🏠', 'Home screen: your profile picture and level now sit either side of your nickname.']
      ],
      v241: [
        ['👥', 'Friends are now listed by level, highest first.'],
        ['🛡️', 'Ranked: a match that fails the server\'s cheat checks no longer counts for rating or Diamonds.']
      ],
      v240: [
        ['📅', 'Weekly challenges: 5 a week from Monday 5 October, with 10 new ones including Streaker, Pile Diver, Gauntlet Runner and Daily Grinder.', WN_KEY],
        ['🔥', 'Weekly targets from next week: Bonfire Week 10 burns; Bot Hunter, Ranked Week, Snap Happy and Four Play 5 each.']
      ],
      v239: [
        ['🛠️', 'Ranked: Find Game now keeps searching after a match instead of asking you to try again.']
      ],
      v238: [
        ['🛠️', 'Best of series: fixed the next game not counting, which left a series stuck after game 1.'],
        ['⚔️', 'Missed the end of a series? You now see the result the next time you open the game.'],
        ['🛠️', 'Leaving a match now really leaves it: the stand-in bot keeps your seat instead of handing it straight back to you.']
      ],
      v237: [
        ['👆', 'Tapping a card in a big hand now picks the card you touched, not the one next to or under it. Tap a selected card again to put it back.'],
        ['🃏', 'Big hands show more of each card in the back row, so they are easier to tap.']
      ],
      v236: [
        ['📱', 'iPhone home-screen app: the table now reaches the bottom of the screen and your hand cards are bigger.']
      ],
      v235: [
        ['🔄', 'Dropped out of a Play Friends or Ranked game? You now go straight back into your seat, even if the app stayed open while your signal came back.', WN_KEY],
        ['🤖', 'The bot that covers for a missing player is always Medium now. After 5 of its turns in Play Friends, the missing player is out of that game and the rest play on.'],
        ['📱', 'Fixed tiny hand cards and a dark strip under the table in the iPhone home-screen app.']
      ],
      v234: [
        ['⚔️', 'Best of series is here: at level 20, challenge a friend in Play Friends to a Best of 3 or Best of 5. You both pay the entry and the winner takes four times it.', WN_KEY],
        ['🔄', 'Lost connection in a series? A bot keeps your seat warm while you get back, and signing in takes you straight back to it.'],
        ['👥', 'The Kick button in the Play Friends lobby now sits before the player\'s status.']
      ],
      v233: [
        ['🛠️', 'Best of series in the Play Friends lobby now folds away, and stays folded until you reach level 20.']
      ],
      v232: [
        ['👤', 'Profile sections now fold away: tap a heading to open or close it.'],
        ['🛠️', 'Best of series: the lobby choice and the accept pop-up (not open to everyone yet).']
      ],
      v231: [
        ['🛠️', 'Groundwork for Best of series between friends.']
      ],
      v230: [
        ['🏆', 'New Levels leaderboard: see who has the most XP of all time, or who has earned the most this week (it starts again every Monday).', WN_KEY]
      ],
      v229: [
        ['😄', 'The emote button is now the same size as the other round table buttons.']
      ],
      v228: [
        ['🃏', 'Cards always snap back into place after a swap or a drag, even if the table changes while you hold one.'],
        ['📐', 'The Hand label sits in the middle again, with your level just to its right.']
      ],
      v227: [
        ['📈', 'Levels now show everywhere: on the table next to each player, on every leaderboard, on your Profile and by your Hand.', WN_KEY]
      ],
      v226: [
        ['📈', 'A thin XP bar along the bottom of the header shows how close you are to your next level. Hover or tap it for the numbers.', WN_KEY],
        ['📅', 'Weekly challenges now give 100 XP.']
      ],
      v225: [
        ['📈', 'Levels are here: every game, win, challenge and Gauntlet bot earns XP. Climb from level 1 to 99, with Diamonds for every level and 100 on every 10th. Your past games already count.', WN_KEY],
        ['📈', 'Levels now take more XP to reach, so there is more to play for. Levels you have already been paid for never pay twice.']
      ],
      v224: [
        ['🛠️', 'The groundwork for an upcoming feature is finished.']
      ],
      v223: [
        ['🛠️', 'More groundwork for an upcoming feature.']
      ],
      v222: [
        ['🛠️', 'Behind-the-scenes groundwork for an upcoming feature.']
      ],
      v221: [
        ['♿', 'Reduce Motion no longer leaves flashing card shapes over the pile; High Contrast keeps moving card text readable.']
      ],
      v220: [
        ['✨', 'Animated profile pictures now move in Shop, Custom and every picture size.']
      ],
      v219: [
        ['✨', 'New premium picture: Turtley, a jewelled emerald turtle that snaps its jaws.', WN_KEY],
        ['✨', 'The premium pictures come alive: Sapphire Sovereign roars, Crimson Inferno chuckles and Scarlet Guardian flaps its wings.', WN_KEY],
        ['🔗', 'Game links shared in chats now show a fresh preview picture.'],
        ['✨', 'The Phoenix picture has been retired.']
      ],
      v218: [
        ['✨', 'Three new animated premium pictures in the Shop: Sapphire Sovereign, Crimson Inferno and Scarlet Guardian.', WN_KEY]
      ],
      v217: [
        ['✨', "What's New now shows only the big updates, all of them since you last played."]
      ],
      v216: [
        ['🤝', 'Draws now count in your stats: Match History and Ranked stats show how many games you have drawn.', WN_KEY],
        ['✨', 'There is a hidden challenge to find. Keep playing.', WN_KEY]
      ],
      v215: [
        ['🤝', 'Games can no longer get stuck: if the same cards keep going round with no progress, the game ends in a draw.', WN_KEY],
        ['🛡', 'Ranked rooms are now only open to signed-in players.'],
        ['📖', 'The Guide\'s close button no longer slips off the edge on narrow folded phones.']
      ],
      v214: [
        ['🏆', 'Ranked wins are worth more: every win adds 10 bonus points on top of the usual change.', WN_KEY],
        ['🔥', 'Win streak bonus in Ranked: +5 at 2 wins in a row, +10 at 3, +15 at 5 and +20 at 10. Losing streaks cost nothing extra.', WN_KEY]
      ],
      v213: [
        ['🃏', 'The Deck, Pile and Base Card now stay perfectly still: no more sliding when a power card lands or Snap Burn appears.']
      ],
      v212: [
        ['🎓', 'New players start against one Easy bot, and the Tutorial button stands out until you have tried it.'],
        ['🙂', 'Vs Bots and the Tutorial no longer need a nickname first.'],
        ['🔑', 'A Sign In button in the menu and on the match summary when you are not signed in.']
      ],
      v211: [
        ['🤖', 'Lots of new bot names from the UK, USA, France, India, Germany and Italy.', WN_KEY]
      ],
      v210: [
        ['👤', 'The menu now shows your username and profile picture, centred, with the quick buttons in one even row.'],
        ['📱', 'If a phone browser has Desktop Site switched on, the game now says how to turn it off (it makes everything tiny).']
      ],
      v209: [
        ['🃏', 'The home screen card and its power are centred, and fit in the installed app too.']
      ],
      v208: [
        ['🏠', 'The home screen now shows your table softly in the background, or the event table while an event is on.', WN_KEY],
        ['🃏', 'Where there is room, the home screen shows a card and its power, changing every few seconds.', WN_KEY],
        ['🖥️', 'Fixed: on some laptops the top of the home screen was hidden under the header.']
      ],
      v207: [
        ['🃏', 'Joker Duel lesson: a deck only has two Jokers, so now just Rival holds the other one, and you pick Rival to see the counter.']
      ],
      v206: [
        ['🔥', 'Snap Burn lesson: the Snap Burn banner at the bottom no longer hides behind your cards. Tap either Snap Burn button.'],
        ['🏠', 'The home screen no longer shows the last lesson or game behind it.'],
        ['✏️', 'Button names such as Select All Of A Rank and Snap Burn are now written the same way everywhere.']
      ],
      v205: [
        ['🎓', 'Cross-Phase Combo lesson: switch on Select All Of A Rank first, then one tap grabs all three 9s.'],
        ['🃏', 'Joker Duel lesson: the Pile has cards on it, so you can see who picks them up.']
      ],
      v204: [
        ['🎓', 'The Snap Burn lesson is clearer: Coach plays a King, then you snap the fourth on Rival\'s turn.'],
        ['🔄', 'The direction arrow now shows the right way round as soon as a lesson starts.']
      ],
      v203: [
        ['🃏', 'Tap outside the Pile History box to close it.']
      ],
      v202: [
        ['🏆', 'Players you ignore stay on the leaderboard.']
      ],
      v201: [
        ['👥', 'Friends who were stuck showing as online now show offline until they open the game again.']
      ],
      v200: [
        ['👥', 'Fixed: friends could show as online for hours after closing the game or signing out.']
      ],
      v199: [
        ['🏆', 'Tap a player\'s picture or name on the leaderboard to open their profile, add them as a friend or ignore them.', WN_KEY],
        ['💡', 'The "Click to inspect pile cards" hint no longer covers a card\'s description.'],
        ['▦', 'The tutorial explains the Play Matrix in plain words.']
      ],
      v198: [
        ['🎴', 'Dragon Scale and Stained Glass are now 1000 Diamonds each.']
      ],
      v197: [
        ['🃏', 'Eight new decks: Big Print (free, also in Settings → Accessibility), Lavender, Paper Classic, Blueprint, Chalkboard, Frosted Glass, Neon Night and Royal Gold.', WN_KEY],
        ['🎴', 'Two new card backs: Dragon Scale and Stained Glass.', WN_KEY],
        ['🔥', 'The Phoenix picture has been redrawn, and Burn Flame, Transparent Ghost and Frozen look sharper.', WN_KEY],
        ['🔄', 'When a new version is out, the game offers to update itself.', WN_KEY],
        ['📱', 'Better on foldable phones. The tutorial no longer covers Card Powers or the card you hold.']
      ],
      v196: [
        ['🛍️', 'New in the Shop: three animated premium pictures (Royal Flush, Phoenix, Cosmic Ace) and three premium tables (Neon City, Northern Lights, Deep Space).', WN_KEY],
        ['🖥️', 'Tablets and computers now get a bigger table and home screen. A phone turned sideways asks to be turned upright.', WN_KEY],
        ['💡', 'The Quick Start tutorial now shows how to press and hold a card to read what it does.', WN_KEY]
      ],
      v195: [
        ['🖥️', 'Fixed: on a computer, a big hand could run off both sides of the screen.'],
        ['💡', 'Fixed: holding an opponent\'s face-up card now shows the whole description, below the card when there\'s no room above.']
      ],
      v194: [
        ['⚙️', 'Fixed: a setting changed just before closing or refreshing the game could switch back at your next sign-in.']
      ],
      v193: [
        ['🎨', 'Classic Felt and Oak Wood are now sharp on every screen, from phones to 4K monitors.'],
        ['🔧', 'Fixed: a frame you had just equipped could switch back after you picked another item.']
      ],
      v192: [
        ['💡', 'Press and hold now also works on the Pile, the Base Card and other players\' face-up cards.'],
        ['📝', 'Clearer card descriptions, and your face-up cards remind you they wait until your hand is empty.']
      ],
      v191: [
        ['💡', 'Press and hold any card you can see to read what it does, and whether you can play it now.', WN_KEY]
      ],
      v190: [
        ['🕘', 'Card History can now fold into a circle on the left of the table. It shows the card to beat; tap it to open the history again.', WN_KEY],
        ['⚙️', 'New setting: Display → Card History chooses whether each game starts with the history open or folded.']
      ],
      v189: [
        ['🔥', 'Four premium burns: Black Hole, Origami Fold (the cards fold into swans and fly off), Pixel Blast and Lava Melt.', WN_KEY],
        ['🃏', 'Four premium Joker effects: Hypnotist, Vampire, Red Card and Portal.', WN_KEY],
        ['🏆', 'Four premium victories: Trophy Lift, Rocket Launch, Origami Flock and Lion\'s Roar.', WN_KEY],
        ['🎴', 'Shop and Custom previews are now the same size for every item, and Retro Arcade and Space show properly.']
      ],
      v188: [
        ['🛒', 'New in the Shop: decks that change your card faces (Classic Casino, Arcade and the premium Four-Colour).', WN_KEY],
        ['🎴', 'Four new card backs: Tartan, Retro Arcade, Art Deco and Space.', WN_KEY],
        ['✨', 'Six premium frames, including two-tone, dashed and moving ones.', WN_KEY]
      ],
      v187: [
        ['🃏', 'Play Friends and Ranked: a Joker that gets countered now leaves the game, along with the Joker that countered it.']
      ],
      v186: [
        ['🎓', 'Tutorial: the Bonus Draw lesson works again, the 4 lesson lets you try the refused play, and lessons read more calmly.'],
        ['🃏', 'A short hand spreads out when there is room, instead of overlapping.']
      ],
      v185: [
        ['🎓', 'Tutorial: the 3 lesson always shows the Coach playing the 3 now, even if you tap Continue twice.']
      ],
      v184: [
        ['⚔️', 'Ranked only pairs you with players on the same version of the game, and a game that is out of date updates itself before a match.']
      ],
      v183: [
        ['🃏', 'Play Friends: a Joker played with more than one player to pick from now leaves your table properly, instead of coming back to you.']
      ],
      v182: [
        ['⚔️', 'The Gauntlet starts again from the first Easy bot every day, with full lives.', WN_KEY],
        ['🎴', 'The Select All Of A Rank button in the header is full size again on iPhones, with a green or red dot for on and off.']
      ],
      v181: [
        ['⚔️', 'The Gauntlet button sits centred and wider once every bot difficulty is unlocked.']
      ],
      v180: [
        ['🃏', 'Bigger cards in big hands: the hand now fills the space under "Hand" and picks the best number of rows for your screen.', WN_KEY],
        ['👀', 'When a 3 is on the Pile, its label tells you what you really have to beat, e.g. "Transparent - Q".', WN_KEY]
      ],
      v179: [
        ['🎨', 'A cleaner look: softer page frames, easier-to-read small text, and one clear gold button for buying in the Shop.']
      ],
      v178: [
        ['✏️', 'Calmer, clearer wording across the game: shorter messages at the table, and less shouting.']
      ],
      v177: [
        ['🗂️', 'Collection: see every item in the game, the ones you own in colour. Open it from your Profile or by tapping the owned count in Custom.', WN_KEY],
        ['✅', 'Tap "completed" on the Challenges page to see every challenge you\'ve finished and the Diamonds they paid.', WN_KEY]
      ],
      v176: [
        ['🛠️', 'Fixed: the home screen could get stuck part-way down after reconnecting, and the room code stayed in the header after leaving Play Friends.'],
        ['👥', 'Play Friends has a four-player icon, and the room box has smaller Copy, Share link and Invite buttons on one row.']
      ],
      v175: [
        ['👥', 'Online Room is now called Play Friends, and the home screen mode buttons line up neatly: icon, name, then subtitle.'],
        ['💎', 'A bigger Diamond balance in the header, and drawn icons for every seasonal event.']
      ],
      v174: [
        ['💎', 'A fresh look: new drawn icons across the game instead of emoji, a new Diamond, and rank badges for every tier (the crown pictures match their tier colours).', WN_KEY],
        ['🎮', 'Vs Bots, Online Room and Ranked now have their own icons on the home screen.']
      ],
      v173: [
        ['🛠️', 'Fixed: the saved-look options now fit inside their slot, and tab highlights line up as soon as a page opens.']
      ],
      v172: [
        ['🎨', 'The Shop now has a Custom button in its header, so you can try on what you just bought straight away.']
      ],
      v171: [
        ['👕', 'Saved looks in Custom: keep up to 3 complete loadouts and switch between them in one tap.', WN_KEY]
      ],
      v170: [
        ['🙈', "New setting (Display): Show Others' Effects. Turn it off to see other players' burn, Joker and victory effects in the plain default style.", WN_KEY]
      ],
      v169: [
        ['🎉', 'Seasonal challenges: during every event a new Seasonal tab in Challenges has four big event-long challenges, plus a Season Complete bonus.', WN_KEY]
      ],
      v168: [
        ['🪵', 'Two new free tables in Custom: Oak Wood and Classic Felt, with real wood grain and felt texture.', WN_KEY],
        ['🃏', "A Joker as your last card on an empty pile now wins, even if it's countered: there's nothing to pick up, so you're out."]
      ],
      v167: [
        ['🃏', "Fixed: if your last card is a Joker and it's countered, you don't finish. You pick up the pile, and the victory waits until the game is really over."]
      ],
      v166: [
        ['🗂️', 'Custom has a new All tab with every item in the game, seasonal ones included, in sections that fold away.', WN_KEY],
        ['💎', 'Custom now shows your Diamonds, how many items you own, and a shortcut to the Shop.'],
        ['🔥', 'Burn and Joker previews in Custom now play right under the effect you tap.'],
        ['🛒', 'The Shop opens on a new All tab with every item in folding sections, and the Name Change Token at the top.', WN_KEY]
      ],
      v165: [
        ['🃏', 'New in the Shop: Joker Effects. A short animation plays over the table whenever you play a Joker, and everyone at the table sees it.', WN_KEY],
        ['🎃', "Every seasonal event gets its own Joker Effect too, from the Pumpkin Joker's BOO! to Santa Joker's HO HO HO!", WN_KEY],
        ['⚔️', 'The Guide has a new Gauntlet section, and Key Terms now cover the newer features.'],
        ['🛠️', 'Fixed: countering a Joker with your last card now finishes you properly, and the game carries on.']
      ],
      v164: [
        ['🖐️', 'Fixed: a hand with two or three rows no longer bounces side to side.'],
        ['🃏', 'Fixed: a game could freeze when a player finished by playing a Joker as their last card.']
      ],
      v163: [
        ['🃏', 'Fixed: a 3 on a 5 now does what the 5 did. If the base card is an 8 it skips, and if it is a 9 it reverses.']
      ],
      v162: [
        ['🔗', 'Links to the game now show a proper preview picture in WhatsApp, iMessage, Discord and everywhere else you share them.']
      ],
      v161: [
        ['🖼️', 'A new profile picture now shows straight away on the Challenges and Gauntatulations message lands in your Inbox.', WN_KEY]
      ],
      v159: [
        ['⬇', 'Profile → Your Data → Download My Data saves a copy of everything stored about your account.'],
        ['🗑️', 'Deleting your account now works properly, and you have 7 days to change your mind: sign back in and tap Keep My Account.'],
        ['🔑', "Can't sign in? New help on the sign-in screen, including resending the verification email."]
      ],
      v158: [
        ['📖', 'A shorter Guide: the note about the card-area labels is gone.']
      ],
      v157: [
        ['🏆', 'Challenges: your completed count now sits in the middle of the top bar.']
      ],
      v156: [
        ['🛒', 'A Shop button at the top of the Challenges page, next to your Diamonds and challenges completed.']
      ],
      v155: [
        ['🏆', 'The Challenges page shows how many you have completed.']
      ],
      v154: [
        ['🏷️', 'Your Profile shows your rank, rating and win/loss record together in one pill.']
      ],
      v153: [
        ['✨', 'Tidier Profile: a bigger picture lined up with your name, your rank and record on one line, matching buttons, and showcase cards that sit neatly inside your frame.']
      ],
      v152: [
        ['🎁', 'Invite links now work for brand-new players straight after sign-up, and the "You joined" message waits until you have picked your username.']
      ],
      v151: [
        ['🔗', 'Invite friends! Friends → Invite Friends shares your own link. When a friend signs up with it and plays 3 games, you get 💎 100 and they get 💎 50.', WN_KEY],
        ['👥', 'Profile → Invite Friends shows your code, who joined and how many games they have played.', WN_KEY],
        ['🏅', 'Recruit 5 players to earn the Recruiter picture and challenge.', WN_KEY]
      ],
      v150: [
        ['🏆', 'Challenges: the Gauntlet is now a challenge (Bots tab), plus a Daily Gauntlet worth 50 💎 every day. The top of the page shows how many challenges you have completed.', WN_KEY],
        ['☰', 'Challenges and the Shop are now one tap away at the top of the menu.'],
        ['🃏', 'Your showcase shows your cards the way they look in the game, with your frame on them.'],
        ['✕', 'The Play Matrix has a close button.']
      ],
      v149: [
        ['🛠️', 'Fixed an error about a "service worker" that could stop purchases, rewards and the Gauntlet on phones with notifications turned on.'],
        ['👀', 'In the Gauntlet, tap Gauntlet Champion or Gauntlet Gold to preview the prizes.']
      ],
      v148: [
        ['💾', 'Closed the app mid-game against bots? It now really comes back exactly where you left it (it could lose the game before).'],
        ['⚔️', 'The Gauntlet remembers your run: close the app between games and it reopens on the next bot. A result sent with no signal is saved and sent when you are back online.'],
        ['🎨', 'Gauntlet round labels use the same colours as the difficulty buttons.']
      ],
      v147: [
        ['⚔️', 'New: the Gauntlet! Beat 5 bots in a row (Easy, Easy, Medium, Hard, Boss) with 3 lives. Find it under the bot buttons.', WN_KEY],
        ['🏆', 'Beat it for the first time to win 200 💎, the Gauntlet Champion picture and the Gauntlet Gold frame. Then 50 💎 each day you beat it.', WN_KEY]
      ],
      v146: [
        ['🔒', 'Online games are steadier: two players acting at the same moment can no longer undo each other\'s move.'],
        ['📱', "If the host's app goes into the background, another player's phone keeps the game (and its bots) moving."]
      ],
      v145: [
        ['🎴', 'Ranked matches are now dealt by the server: nobody can rig the deal.', WN_KEY]
      ],
      v144: [
        ['🛡️', 'Ranked is checked on the server now: every move in a Ranked match is verified, so a tampered game can be spotted.']
      ],
      v143: [
        ['⚑', "Report a player: tap their name at the table, then REPORT (cheating, offensive name, abuse, quitting).", WN_KEY]
      ],
      v142: [
        ['🎮', 'Friends list shows who is in a match, and in which mode.', WN_KEY],
        ['👀', "Tap WATCH to spectate a friend's online or Ranked game live (Ranked hands stay hidden).", WN_KEY]
      ],
      v141: [
        ['📊', 'Match Stats still show players who left, even after you reload or rejoin.'],
        ['📜', "Match History now keeps everyone's numbers: tap a match to compare.", WN_KEY]
      ],
      v140: [
        ['✨', "What's New now lists everything you missed if you skipped a few updates."],
        ['🔕', "Don't want these? Settings → Sound & Alerts → What's New turns them off."]
      ],
      v139: [
        ['📊', 'Match Stats keep players who leave after the game, marked (left).']
      ],
      v138: [
        ['📐', 'Pop-ups and pages never slide under the top bar any more, on phones or PC.']
      ],
      v137: [
        ['🖼️', 'Friends list and Leaderboard update live: new profile pictures show straight away.']
      ],
      v136: [
        ['🂠', 'Face-down cards now fly from your table to the Pile before they flip.', WN_KEY],
        ['📖', 'New Swap Phase section in Guide & Strategy: what to put face-up and why.']
      ],
      v134: [
        ['🔗', 'Invite links: in an Online Room, tap SHARE INVITE LINK and send it on WhatsApp or anywhere. Friends tap it to jump straight into your room.', WN_KEY],
        ['🃏', 'Hand Sort (Settings → Gameplay): turn it on to sort your hand by power (4 up to A, then 10, 2, 3, Joker) instead of by rank.', WN_KEY]
      ],
      v130: [
        ['🎯', 'New Getting Started challenges: play your first game (ShitHead Virgin) and win your first game (Beginner), 20 Diamonds each.', WN_KEY]
      ],
      v129: [
        ['💎', 'Finish the Quick Start tutorial for 50 Diamonds.'],
        ['🎓', 'Tutorial Graduate now pays 200 Diamonds: complete Quick Start and every tutorial lesson.']
      ],
      v126: [
        ['⚡', 'New one-minute Quick Start: tap Tutorial to learn the whole game in 6 quick steps.', WN_KEY],
        ['☝️', "Last card alert: you'll see (and hear) when a player is down to their final card.", WN_KEY],
        ['📤', 'Share your result: tap SHARE on the match summary to send a picture of your game to friends.', WN_KEY],
        ['📴', 'Play Vs Bots with no signal: once the app has been opened online, it works offline too.', WN_KEY],
        ['🦇', 'The Bat Swarm victory now has real flapping bats.', WN_KEY]
      ],
      v115: [
        ['📜', 'Match History: menu → Stats shows your last 30 matches, with the finishing order, your stats, Diamonds earned and rating changes.', WN_KEY],
        ['🔥', 'Burns now have sound! Every Burn effect has its own, from ice shattering to candy pops, and everyone at the table hears yours.', WN_KEY],
        ['🃏', 'Fixed: countering a Joker now tops your hand back up to 3 straight away.']
      ],
      v114: [
        ['🔄', 'Closed the app mid-match? Open it again to jump straight back into your seat, even if a bot was covering for you.', WN_KEY],
        ['🃏', 'Blind flips online: everyone at the table now watches the card turn over, not just the player flipping it.', WN_KEY],
        ['👥', 'Friends shows who is online first. Invite friends straight into the room you are in from the lobby.'],
        ['🔃', 'Pull down on your Inbox or Friends list to refresh it.'],
        ['📳', 'Your turn now gives a short buzz too (Settings → Vibration).'],
        ['🛍️', 'The Shop opens on the tab you last used.'],
        ['⚠️', 'Leaving a Ranked match now warns you that it counts as a loss.']
      ]
    };
  window.ShWhatsNewData = { WN_KEY, WHATS_NEW };
})();





