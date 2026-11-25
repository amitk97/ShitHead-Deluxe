# Play Console paperwork: answers to give

Prepared from the game as it is today. Google changes these forms from time to time, so read each question before pasting an answer; where the form wording differs, answer what is true. Items marked **YOU** need you (accounts, test details, legal choices).

## 1. Set up your app

- **App name:** Shed Head Deluxe: Card Game. **Default language:** English (United Kingdom). **App or game:** Game. **Free or paid:** Free (this cannot be changed to paid later).
- **Declarations:** it is an app/game you made yourself; accept the Developer Programme Policies and US export laws.

## 2. Privacy policy and account deletion

- **Privacy policy URL:** https://shithead-deluxe.web.app/privacy-policy.html
- **Account deletion URL** (Data safety → Data deletion): https://shithead-deluxe.web.app/delete-account.html. In the form say: users can request deletion in the app (Profile → Danger Zone → Delete account) or by email; data is erased after 7 days; some records of finished online games can be removed on request.
- **App access:** most of the game works with no account (Play Computer, Gauntlet, Puzzles, Tutorial). Ranked, Play Friends, the Shop and rewards need an account. **YOU:** create a test account (email, verified, with a username), keep its password, and paste the instructions into the "App access → All or some functionality is restricted" box: "Sign in with Continue with Google or email. Test account: <email> / <password>. Ranked and Play Friends need a second player; Play Computer needs none."

## 3. Ads, audience, content

- **Ads:** No, the app contains no ads.
- **Target audience:** choose 13-15, 16-17 and 18+. Do not choose any age under 13. Say the app is not designed for children. This avoids the Families Policy.
- **News, health, government, financial features, COVID, social casino, gambling:** No to all. Gambling note: the game has a Daily Spin, Scratch Card, Three Cards and Drop Zone, but they are free once-a-day features that pay in free in-game Diamonds, and there is no way to pay real money, so they are not real-money gambling.
- **Data safety:** see section 4.
- **Content rating (IARC questionnaire).** Category: Game. Truthful answers, in plain terms:
  - Violence: none to the player's character. Cards burn, shatter or melt in cartoon effects; no people or animals are hurt. Answer "No" (if the form asks about fantasy or cartoon violence, answer the mildest option that is true).
  - Blood, gore, sexual content, nudity, profanity, drugs, alcohol, tobacco: No.
  - Crude humour: the Angry Twister burn effect is a brown cartoon tornado with a face. Answer "mild" if the form has that option.
  - Fear or horror: Halloween-themed Jokers and avatars (ghosts, vampire, pumpkin) are cartoon style. Answer "No" or "mild".
  - Gambling or simulated gambling: the Lucky Games wheel, scratch card and drop game are casino-style but free. Answer the question as worded. If it asks about games that "simulate gambling", answer **Yes**, and note that no real money or paid currency is involved. Expect a rating around PEGI 12 / ESRB Teen / IARC 12+. Answering Yes is the safe answer; a wrong "No" risks the app being pulled.
  - Users interact: Yes (friends, room codes, preset emotes, usernames). Users can share personal information: No (usernames only). Shares location: No. Digital purchases: No (nothing is bought with real money). Unrestricted web access: No.
  - Do not say "no" to user-generated content: usernames and room names are user-created. Reporting and ignoring players exist.
- **User-generated content policy:** satisfied by in-app Report and Ignore on the player card, plus the terms and moderation by the developer. State this if asked.
- **Government/Financial/Health apps:** none.

## 4. Data safety form

**Does the app collect or share user data?** Yes (collects). **Shared with third parties?** No (Google/Firebase acts as our service provider, hosting the data for us; this is "collected", not "shared").
**Is all data encrypted in transit?** Yes (HTTPS only). **Can users request deletion?** Yes (URL above).

Data types to declare as **Collected** (all required for app functionality, none used for advertising; none optional unless noted):

| Category | Type | Why / notes |
|---|---|---|
| Personal info | Name | From Google sign-in (display name); not shown to other players |
| Personal info | Email address | Account sign-in |
| Personal info | User IDs | Account ID and the public username |
| App activity | Game progress, stats and purchases (use "Other in-app actions" / "App interactions") | Rating, XP, Diamonds, items, match history |
| App activity | Other user-generated content | Username and emotes shown to other players |
| App info and performance | Crash logs | Error reports linked to the account ID |
| App info and performance | Diagnostics | Frame rate, load time, matches started/finished |
| Device or other IDs | Device or other IDs | Push-notification token (only if the user turns notifications on) |

**Not collected:** location, financial info or payment details, health and fitness, messages (emails, SMS, in-app chat; the game has preset emotes only), photos and videos, audio, files, contacts, calendar, web browsing history, advertising ID.

For each collected type choose: purpose **App functionality** (diagnostics and crash logs also **Analytics** if the form offers it only in that wording; they are used only to fix bugs), **not shared**, and mark "this data is processed ephemerally": No.
If a question needs "required or optional": email, name and user ID are required to have an account (the game also works as a guest without them); the push token is optional.

## 5. Store listing

Use `LISTING.md` in this folder: title, short and full description, graphics, contact details.

## 6. Other declarations you may be asked for

- **Advertising ID:** the app does not use it (answer No). Because the app is a web app wrapped for Android, check the "Advertising ID" declaration box and choose "No".
- **Health apps / Financial features / Government / Photo and video permissions / SMS and call log:** all No.
- **Permissions:** the Android wrapper asks for none beyond internet, and notifications (Android 13 and above). Notifications are optional.
- **Content ratings:** you will receive certificates for IARC regions including PEGI, ESRB and USK. Keep them.

## 7. Before you can publish (new personal developer account)

- Complete developer identity verification (legal name, address, contact details, phone number, and the ID check) in Play Console.
- A new personal account must run a **closed test with at least 12 testers opted in for 14 days in a row** before it can apply for production access (Google's rule as I know it; check Play Console → Release → "Production" for the current requirement). Recruit the testers now: friends and family with Android phones, added by Google Group or email list.
- You must be able to describe your testing and how you will fix problems when you apply for production.

## 8. Items I checked in the game, and what is still on you

| Item | Status |
|---|---|
| Privacy policy page, public, matches the app | Done (v548 and later) |
| Terms of Use page | Done |
| In-app link to the policy | Sign-in help panel and Profile → Your Data |
| In-app way to delete the account | Done (Profile → Danger Zone) |
| Public web page for deleting the account | Done (`delete-account.html`) |
| Report and ignore for user content | Done |
| Data export | Done (Profile → Your Data) |
| Test account for Google's reviewers | **YOU** |
| Developer identity verification | **YOU** |
| 12 closed testers for 14 days | **YOU** |
| Trademark checks (SHED HEAD, COLD BLOODED) | **YOU** |
