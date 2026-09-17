#!/usr/bin/env bash
# Deploys ShitHead Deluxe (index.html) to Firebase Hosting.
#
# Usage: ./deploy.sh
#
# See README.md for prerequisites (Node.js 20+, being logged into an
# account with access to the shithead-pro Firebase project) and for why
# https://shithead-pro.firebaseapp.com is the correct URL to use afterward.

set -euo pipefail

echo "== ShitHead Deluxe: deploy to Firebase Hosting =="

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js isn't installed. Install it from https://nodejs.org (version 20 or newer)"
  echo "or with nvm — see the README.md 'Deploying' section."
  exit 1
fi

node_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [ "$node_major" -lt 20 ]; then
  echo ""
  echo "Node.js 20 or newer is required — you have $(node -v)."
  echo "See the README.md 'Deploying' section for how to upgrade (nvm is the easiest way)."
  exit 1
fi

if ! command -v firebase >/dev/null 2>&1; then
  echo ""
  echo "Firebase CLI not found — installing it now (one-time, this may take a minute)..."
  npm install -g firebase-tools
fi

echo ""
echo "Deploying..."
firebase deploy --only hosting

echo ""
echo "== Done! =="
echo "Live at: https://shithead-pro.firebaseapp.com"
echo "(Use this exact URL, not shithead-pro.web.app, for Google sign-in to work — see README.md.)"
