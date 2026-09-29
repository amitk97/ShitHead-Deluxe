# ShitHead Deluxe — Owner's Handbook

A plain-English guide to running the game without a developer.

- **The game:** https://shithead-pro.web.app
- **The code:** GitHub → `amitk97/ShitHead-Deluxe`
- **The servers:** Firebase project `shithead-pro`, at https://console.firebase.google.com

---

## 1. How it fits together

| Part | What it is | Where it lives | How it goes live |
|---|---|---|---|
| **The game** | Everything players see | `index.html` (plus `art/`, `audio/`, `icons/`) | **Automatically**, about 2 minutes after a change reaches `main` |
| **The server code** | Pays Diamonds, runs the Shop, scores Ranked, sends notifications, checks for cheating | the `functions/` folder | **Automatically**, via the "Deploy notification functions" GitHub workflow, whenever `functions/` changes |
| **The database rules** | Decide who can read or change what (the anti-cheat wall) | `database.rules.json` | **By hand**: you paste them into the Firebase console (see section 3) |

`CLAUDE.md` is the detailed technical guide. If you ever use an AI assistant or a developer again, point them at it first.

---

## 2. Is everything working? Check these regularly

### In the game (signed in as the owner)
Open **Menu → Error Reports**. It has four tabs:

- **Errors:** crashes players have hit, grouped by message, with a count for each.
  - A handful of old ones: fine.
  - The same error appearing lots of times after an update: something broke. Roll back (section 5).
  - Press "Clear" once you've read them.
- **Players:** reports players have made about each other (cheating, bad names, abuse, quitting). The most-reported player is at the top.
  - You can clear a player's reports once you've dealt with them.
- **Ranked Audit:** the cheat checker's findings for Ranked games.
  - *Hard* findings are things that are impossible honestly, such as a card appearing from nowhere.
  - *Soft* findings are timing hiccups, usually a bad connection.
- **Health:** the last 7 days of sessions:
  - games started, finished and abandoned
  - devices used
  - how smoothly the game ran (slow frames)
  - rejected saves (two phones saving at once)

  A sudden jump in *abandoned* games after an update usually means something is wrong in play.

### In GitHub
Open the **Actions** tab. After each change you should see:
- **"Deploy to Firebase Hosting on merge"**: green means the new version of the game is live.
- **"Deploy notification functions"**: only runs when `functions/` changed. Green means the server code is live.

A **red** run means that part did **not** go live. Open it, read the last error lines, then try **Re-run jobs** once. If it's still red, see section 6.

### Which version is live?
Every release has a number such as **v212**. It's in the first line of `index.html`, in the "What's New" pop-up, and on each session in the Health tab.

Players with an old copy open get an **"Update available — Update Now"** prompt within about 15 minutes.

---

## 3. Publishing new database rules (the only manual step)

You only need this when a change touches `database.rules.json`. The AI assistant always gave you the rules as two copy-paste blocks.

1. If `functions/` also changed in the same update, **wait until "Deploy notification functions" is green** in GitHub → Actions. Rules published first can make purchases fail until the server catches up.
2. Firebase console → **Build → Realtime Database → Rules** tab.
3. Select everything in the editor and delete it.
4. Paste **block 1**, then paste **block 2** straight after it.
5. Press **Publish**.

If the console says "Line N invalid", the paste got cut or mangled. Copy from `database.rules.json` on GitHub instead: open it, press the **Raw** button, select all, copy.

---

## 4. Making a small change yourself

For wording, prices or names, you can edit directly on GitHub:

1. Open the file (usually `index.html`), then click the ✏️ pencil icon.
2. Use your browser's find (Ctrl/Cmd+F) to locate the text.
3. Change it, then **Commit changes → Commit directly to the `main` branch**.
4. About 2 minutes later it's live. Check GitHub → Actions is green.

Things to know:
- **Prices, Shop items, rewards and challenges** are also copied into `functions/catalog.json`, which the server reads.
  - Changing them in `index.html` alone makes the Shop disagree with the server, and purchases fail.
  - These changes need the export tool (`node tools/export-catalog.js`), so leave them to a developer or AI.
- **Bot names:** `BOT_NAMES` in `index.html`. Plain letters only.
- **What's New text:** `WHATS_NEW` in `index.html`.
- Don't edit `index1.html`, `index2.html` and so on. They're old copies and are not used.

---

## 5. Undoing a bad release (fastest fix)

If a new version breaks things, go back to the previous one right away:

**Option A: instant, no code**
Firebase console → **Hosting** → *Release history* → find the release before the bad one → **⋮ → Roll back**.

Players get the old version on their next load. The next push to GitHub will deploy the newest code again, so fix the problem before pushing.

**Option B: undo the change in GitHub**
Open the bad commit in GitHub → **Revert**.
- This makes a new commit that undoes it.
- If GitHub makes it a pull request, merge that.
- It deploys like any other change.

Server code (`functions/`) and database rules are **not** rolled back by Option A. If a server change caused the problem, use Option B. If a rules change caused it, paste back the previous `database.rules.json`: in GitHub, open the file → **History** → pick an older version → **Raw** → copy.

---

## 6. When something goes wrong

| What you see | Most likely cause | What to do |
|---|---|---|
| Buying, gifting, rewards or Ranked scores fail ("couldn't reach the server") | The server code is down or didn't deploy | GitHub → Actions → "Deploy notification functions": re-run it. Firebase console → **Functions → Logs** shows the error. Check the project is still on the **Blaze** plan (billing still active). |
| Everything fails to save; players logged out | Database rules broken or paste incomplete | Re-publish the rules (section 3). |
| "Deploy to Firebase Hosting" is red | The deploy key or Firebase access expired | Re-run once. If still red, GitHub → Settings → Secrets → `FIREBASE_SERVICE_ACCOUNT_SHITHEAD_PRO` needs a fresh key (Firebase console → Project settings → Service accounts → Generate new private key). |
| Google sign-in shows "missing initial state" or fails | A new web address isn't allowed | Firebase console → **Authentication → Settings → Authorized domains**. Only `shithead-pro.web.app` and `shithead-pro.firebaseapp.com` are needed. |
| Push notifications stopped | Server code down, or players turned them off | Check the functions workflow (first row). Notifications are only sent to players who allowed them. |
| A player says everything is tiny | "Desktop site" is on in their phone browser | The game already tells them how to switch it off. |
| A player can't join a friend's room | They're on different versions | Both close and reopen the game (or tap Update Now). |
| A player asks to delete their account | — | They can do it themselves: **Profile → Delete Account**. It's erased after 7 days, and signing back in before then cancels it. |
| A player wants a copy of their data | — | **Profile → Your Data → Download My Data**. |

The support inbox is **support.shitheaddeluxe@gmail.com**. The "Contact Support" button in the game fills in the player's device and game version for you.

---

## 7. Costs and safety

- **Plan:** the Firebase project is on the **Blaze** (pay-as-you-go) plan. With few players it costs pennies or nothing.
- **Budget alert (do this once):** Google Cloud console → **Billing → Budgets & alerts** → create a budget of, say, £10 a month with email alerts at 50% and 100%. You'll hear about any surprise straight away.
- **Backups:** Firebase console → **Realtime Database → Data** → ⋮ menu → **Export JSON**. Do it about once a month and keep the file somewhere safe. The **Backups** tab can do it daily for a small fee.
- **Never share** your service-account keys or the Firebase console login. The database rules stop players cheating, but someone with console access can change anything.

---

## 8. Ranked cheat protection

- **What happens today:** every Ranked game is checked by the server (the **Ranked Audit** tab), but it runs in *watch-only* mode. Matches are always scored, and suspicious ones are just recorded.
- **When to switch it on:** once you've seen plenty of real Ranked games with **no hard findings**.
- **How to switch it on:**
  1. Open `functions/economy.js` on GitHub.
  2. Change `const RANKED_AUDIT_ENFORCE = false;` to `true`.
  3. Commit to `main`.
  4. The functions workflow deploys it.
- **What changes:** matches with hard findings stop counting towards ratings.
- **If honest players start losing matches:** set it back to `false`.

---

### How Ranked points work
- Each game: the usual rating change (beating a stronger player gives more), plus **10 bonus points for every win**.
- Win streak bonus, once when the streak reaches: 2 wins **+5**, 3 **+10**, 5 **+15**, 10 **+20** (and +20 again at 20, 30…). Losing streaks cost nothing extra.
- If a game gets stuck with the same cards going round (the same position six times, or 150 turns without a burn, a card drawn or a table card played), it ends in a **draw**: nobody wins, nobody is the ShitHead, and in Ranked the rating change is small and streaks are kept.
- The numbers are `RANKED_BONUS` in `index.html`; changing them needs the catalog export (leave that to a developer or AI).

### XP & levels (your on/off switch)
- **Menu → XP & Levels: Off/On** (only you see it). Tap it and confirm; every player's game follows within about 10 seconds. Turning it off hides the level screens and stops XP, but nobody loses what they've earned.
- When it's on, each player's past games, wins, Ranked games, Gauntlet bots and daily/weekly challenges are turned into XP once (at their next sign-in or game), and the levels they pass pay their Diamonds with one Inbox mail.
- XP per game: finish 25, first game of the day +50, win +75, Ranked game +25, Ranked win +150, Gauntlet bots 40/80/120/200, daily challenge 50, weekly 350. Levels 1–99 (doubled in v225: level 5 = 954 XP, level 10 = 2,172, level 50 = 20,948, level 99 = 1,400,000). A level already paid never pays again. 20 💎 a level, 100 💎 every 10th level. No daily limit.
- The numbers are `XP_RULES` in `index.html`; changing them needs the catalog export (leave that to a developer or AI).

## 9. Your test account

- **`AmitK`** (amirk2197@googlemail.com) got a one-off 999,999 Diamonds for trying the Shop, and can buy seasonal items out of season.
- It never unlocks gameplay (bot difficulties, Ranked).
- **Menu → Error Reports** only appears for this account, because it's the owner.

---

## 10. Things that run by themselves

- **Seasonal events** (Lunar New Year, Valentine's, Ramadan, Easter, Summer, Halloween, Diwali, Christmas, New Year) start and end on their own.
  - They include their Shop items, challenges, table art on the home screen, and a notification on the first day.
  - Diwali dates are stored up to 2040; after that they need adding.
- **Daily login rewards, daily/weekly challenges, the Gauntlet and leaderboards** all reset on the **UK** day and week.
- **Deleted accounts** are erased every night at 03:30 UK time, 7 days after the request.
- **Old online rooms** are cleaned up after 2 days of no activity.

---

## 11. Ideas already agreed for later

Best of 3/5 series between friends, a weekly puzzle, a tournament mode (once there are more players). Further off: "you've been overtaken" leaderboard mail, clubs, a season pass. The full list, and the ideas you rejected, are at the end of `CLAUDE.md`.
