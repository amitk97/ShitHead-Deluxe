# Plan: getting the game onto Google Play as an Android app

The game is a web game, so the Play Store package will be a **Trusted Web Activity (TWA)**: a thin Android app that opens the live website full screen in Chrome, with no address bar once the site is verified as yours. This is the standard route for a Progressive Web App and needs no game code rewrite. Google accepts it, and updates to the game still ship by deploying to Firebase Hosting (no new Play release needed for game changes).

Alternative considered: a Capacitor/WebView wrapper. It can use native features but ships the game inside the app, needs a rebuild for every change, and Google Sign-In inside a WebView is blocked by Google. Not recommended.

## What already works for a TWA

- Web app manifest with name, icons (192, 512, maskable 512), `display: standalone`, portrait orientation (`manifest.webmanifest`).
- Service worker with offline Play Computer (`sw.js`), HTTPS everywhere (Firebase Hosting).
- Push notifications are Web Push (FCM), which work in a TWA through Chrome. Google Sign-In uses the redirect flow, which is how the installed Android app already works.
- Privacy policy, terms and account-deletion pages, store graphics and listing text (this folder).

## Decisions to make first (they cannot easily be changed after release)

1. **Domain.** The game lives at `shithead-deluxe.web.app`. That address will be baked into the app, the Digital Asset Links file, share links and invite links, and it contains the old name. **Recommended:** buy a plain domain (for example `shedheaddeluxe.com`, about £10 a year; this is a real cost), connect it in Firebase Hosting (free) and make it the main address. If you skip this, everything below still works, but the old name stays in links and in the app's "about" screen.
   If you change domain, update: `SAME_SITE_AUTH_DOMAINS` in `app.js`, Firebase Auth → authorised domains, the Google OAuth client (add `https://<new domain>/__/auth/handler` as an authorised redirect URI), the share and invite links, `firebase.json` redirects, the Open Graph tags, the privacy and terms pages and the README. Test Google sign-in on a phone before going live.
2. **Package name** (Android application ID). Suggested: `com.shedheaddeluxe.app` (reverse-domain style; it does not need to match your website). Permanent once published.
3. **App name on the phone's home screen:** "Shed Head" (launcher) and "Shed Head Deluxe: Card Game" (store).
4. **Which Google account owns the listing** (your personal developer account).

## Steps

### A. Tools (once, on your computer; can be done on a laptop, not a phone)
1. Install Node.js (LTS), a JDK (17), and the Android command-line tools. (Bubblewrap can download the Android SDK and JDK for you on first run.)
2. `npm i -g @bubblewrap/cli`.

### B. Generate the Android project
1. `bubblewrap init --manifest=https://<your domain>/manifest.webmanifest`.
2. Answer the prompts: package name (above), app name, launcher name, start URL `/`, theme colour from the manifest, **notification delegation: on**, **enable site settings shortcut: off**, signing key: create a new keystore.
3. Bubblewrap needs the manifest to have `name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color` and icons including a 512 px maskable icon. All present. If it complains about anything, the fix is a one-line change to `manifest.webmanifest`.
4. Back up the keystore file and its two passwords somewhere safe and **separate from the repo**. Never commit it.

### C. Build and test
1. `bubblewrap build` produces `app-release-bundle.aab` (for Play) and `app-release-signed.apk` (for testing on your own phone).
2. Install the APK on an Android phone (`bubblewrap install`) and check: it opens full screen with no address bar (only after step D), Google sign-in works and returns to the game, notifications permission prompt appears, Play Computer works offline after the first load, the back button behaves (the game handles it), the keyboard does not cover the nickname box, the app icon and splash look right.

### D. Digital Asset Links (this is what removes the browser address bar)
1. In Play Console, upload the `.aab` to a testing track and turn on **Play App Signing** (use "let Google manage the app signing key"). Google then holds the real signing key, and your keystore becomes the upload key.
2. Play Console → Release → Setup → App signing: copy the **SHA-256 certificate fingerprint** of the *app signing key* (not the upload key).
3. Put it in `.well-known/assetlinks.json` in this repo (the file already exists as an empty list, and `firebase.json` has been changed to let `.well-known` deploy):
   ```json
   [{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.shedheaddeluxe.app","sha256_cert_fingerprints":["AA:BB:...:FF"]}}]
   ```
   Add your upload key's fingerprint as a second entry too, so your own test builds also verify.
4. Push to `main`, wait for the deploy, and check `https://<domain>/.well-known/assetlinks.json` loads and shows JSON. Verify with Google's Statement List tester or the Bubblewrap `doctor`/`validate` commands. Reinstall the app and the address bar should be gone.

### E. Play Console setup
Fill the pages in order using `CONSOLE-PAPERWORK.md`: privacy policy, app access (test account), ads, content rating, target audience, data safety, store listing (`LISTING.md` and the graphics), then Pricing and distribution (free, countries: start with the United Kingdom, or all).

### F. Testing track (required for a new personal developer account)
1. Create a **closed testing** track, add an email list or Google Group of **at least 12 testers**, upload the `.aab`, and ask them to opt in and install. They must stay opted in for **14 days**. Give them a simple task: play a game, sign in, open the Guide.
2. Fix what they report and upload new builds to the same track (each upload needs a higher version code; Bubblewrap bumps it).
3. After 14 days, apply for production access in Play Console and answer the questions about your testing (what testers found, what you changed).

### G. Production release
1. Create the production release with the same bundle, set rollout to 100% (or staged, 20% first).
2. First review usually takes a few days. Google may reject for: broken sign-in for reviewers (give the test account), missing data-safety answers, content rating mismatches, or policy matches. Reply to the rejection email with fixes; resubmit.

### H. After launch
- Game updates: deploy to Firebase Hosting as usual. The Android app updates itself because it just shows the website. No Play release is needed unless you change the Android wrapper, icon, package settings or target API level.
- Play requires you to keep the app's **target API level** current (the required level goes up each year, normally with an August deadline) and to rebuild the wrapper (`bubblewrap update` then `bubblewrap build`) and upload a new bundle when it does. Put a yearly reminder in your calendar.
- Keep the data safety form and privacy policy true whenever you add something that collects data (ads, payments, analytics).
- Watch Play Console → Android vitals and reviews. Reply to reviews.

## Costs

- Google Play developer fee: one-off £/$25 (already paid).
- Domain (recommended): about £10 a year.
- Everything else (Bubblewrap, Firebase Hosting on the current plan, signing) is free.
- If you later add paid items in the Android app, Google requires Play Billing for digital goods and takes 15% on the first $1m a year (30% afterwards, or 15% for subscriptions). Not needed today.

## Risks and things to watch

- **Name and trademark.** Do the free searches before submitting (SHED HEAD and COLD BLOODED). A complaint after launch can pull the app.
- **Crest-lookalike avatars.** Keep the blue lion, red devil and red bird out of store graphics and never refer to clubs.
- **Content rating.** Answer the Lucky Games question honestly (see paperwork). A wrong answer is a policy risk.
- **Sign-in.** Google sign-in must be tested in the TWA, on a real phone, before submitting.
- **Reviewers and Ranked.** Ranked needs a second player; mention in the notes that Play Computer shows the game without one.
- **Dev-test hooks and test accounts.** Nothing in the production build gives special powers to any account except the developer's own, and only after a verified-email check. Keep it that way.

## What I can do in this repo versus what only you can do

| I can do (in this repo) | Only you can do |
|---|---|
| Keep the manifest and icons correct, add the fingerprint and push `assetlinks.json` once you give me the SHA-256 | Create the keystore, run Bubblewrap on your computer, upload to Play, verify your identity |
| Move the game to a new domain (code, redirects, sign-in settings list, links) once you have bought it and added it in Firebase | Buy the domain, add it in Firebase Hosting, add the Google OAuth redirect URI in Google Cloud |
| Update the listing, screenshots and legal pages | Recruit 12 testers, respond to Google reviews and emails |
