# ShitHead Deluxe

A single-file browser card game (`index.html`) using Firebase for multiplayer, accounts, and stats.

## File layout

- **`index.html`** — the live game. This is the only file that's actually served when someone visits the site (every web host, including Firebase Hosting, automatically serves whatever file is named `index.html` at the root URL).
- **`index1.html`, `index2.html`, `index11.html`, ... `index20.html`** — old snapshots kept for history. They are **not** part of the live site and are excluded from deployment (see `firebase.json`). Don't edit these; edit `index.html`.
- **`privacy-policy.html`** — linked from the app, deployed alongside `index.html`.
- **`googlee852b53c8d528fcd.html`** — a Google Search Console site-verification file. Leave it alone.

## Hosting & the two-domain gotcha

The site is hosted on **Firebase Hosting**, project `shithead-pro`. Firebase automatically gives every project **two** default domains that serve the exact same deployed content:

- `https://shithead-pro.web.app`
- `https://shithead-pro.firebaseapp.com`

**Only one of these currently works correctly for Google sign-in: `https://shithead-pro.firebaseapp.com`.**

This is the canonical URL — use this one when sharing the site or linking to it.

### Why only one domain works

Google sign-in uses Firebase's `authDomain` (currently set in `index.html`, in the `firebaseConfig` object, to `shithead-pro.firebaseapp.com`) to hand the signed-in session back to the app after Google's login screen. Browsers with strict privacy protections (Safari's Intelligent Tracking Prevention, and increasingly Chrome) block that hand-off unless the page you're standing on is the *same* domain as `authDomain` — even though `.web.app` and `.firebaseapp.com` serve identical files, browsers treat them as two entirely different websites.

Symptom if you're on the wrong domain: clicking "Continue with Google" completes normally (Google's own login screen works, you get redirected back), but the site never shows you as signed in — it just silently doesn't work, with no error message.

- Email/password sign-in is unaffected by this — it works on either domain.
- If you ever want `shithead-pro.web.app` (or a custom domain) to be the canonical URL instead, update `authDomain` in `index.html`'s `firebaseConfig` to match, then redeploy. Whichever domain matches `authDomain` becomes the one Google sign-in works on.

## Deploying

**Prerequisites (one-time setup):**
1. Node.js version 20 or newer — check with `node -v`. If it's older, see below.
2. The Firebase CLI — installed automatically by the deploy script if missing.
3. Be logged into Firebase with an account that has access to the `shithead-pro` project (Owner, Editor, or Firebase Hosting Admin all work) — run `firebase login` once; it opens a browser to sign in.

If `node -v` shows a version older than 20, the easiest fix is [nvm](https://github.com/nvm-sh/nvm):
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
then restart your terminal and run:
```
nvm install 22
nvm use 22
nvm alias default 22
```

**To deploy a change:**
```
./deploy.sh
```
That's it — it checks your Node version, installs the Firebase CLI if needed, and deploys. If you're not logged in yet, `firebase login` will prompt you the first time.

The script always shows the correct live URL (`https://shithead-pro.firebaseapp.com`) when it finishes.

## API keys

The Google Cloud project behind `shithead-pro` has multiple API keys, and at least one existing key is also used by an unrelated app (it shows usage on Google Maps Platform APIs — Directions, Places, Street View, etc., which this game doesn't use). **Don't edit that shared key.** If a key ever needs new website/domain restrictions for this game, create a new dedicated API key restricted to just this game's domains and the APIs it actually needs (Identity Toolkit API, Firebase Realtime Database API), rather than modifying a key something else depends on.
