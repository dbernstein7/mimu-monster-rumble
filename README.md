# MIMU VS MONSTER RUMBLE

Top-down Halloween survival game — survive waves of monsters, use special abilities, collect power-ups, defeat bosses, and climb the leaderboard.

**Tagline:** *Survive the Rumble. Be the Legend.*

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow keys | Move |
| Space | Special ability |
| Esc / P | Pause |

## Features

- **4 playable MIMUs** — Void Warrior, Frost Guardian, Chaos Trickster, Fire Striker
- **7 enemy types** — Pumpkin Fiend, Skeleton, Ghost, Bat, Slime, Witch, Zombie
- **2 levels** — Haunted Carnival, Monster Pit
- **Boss fights** at the end of each level
- **6 power-ups** — Health, Speed, Shield, Damage, Coin Magnet, Bomb
- **Leaderboard** — live global board via Vercel KV (like OtterKart); Firebase optional; local fallback for offline dev

## Live leaderboard (recommended for production)

Same pattern as **OtterKart** / **Shell Snag**: scores POST to `/api/leaderboard` and are stored in **Vercel KV** (Upstash Redis), so every browser/device sees the same board.

1. In the [Vercel dashboard](https://vercel.com) → your **mimu-monster-rumble** project → **Storage** → create or link a **KV / Upstash Redis** database.
2. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically to the project.
3. Redeploy. Game over screen should say **“Score saved to live leaderboard”** and the leaderboard page **“Live global scores”**.

Guest players get a stable anonymous id on each device (`mimu:playerId` in localStorage), like OtterKart demo mode. Scores sync globally; usernames are per-device unless you register.

## Firebase Setup (required for accounts)

Accounts, coin wallets, and cross-device login use **Firebase Authentication + Firestore**. This is not a local-only game — players need real cloud accounts.

1. Create a Firebase project with **Authentication → Email/Password enabled** and **Firestore**.
2. Copy `.env.example` to `.env` for local dev and add the same `VITE_FIREBASE_*` values in **Vercel → Project → Environment Variables** (Production + Preview).
3. **Redeploy** after adding env vars (Vite bakes them in at build time).
4. Add Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.totalCoins >= resource.data.totalCoins;
    }
  }
}
```

Registered accounts get a `users/{uid}` profile. **Coins earned each run are banked to `totalCoins` at game over** and sync across devices.

Without Firebase env vars, sign-in is disabled and the auth screen shows a setup message.

## Build for Production

```bash
npm run build
npm run preview
```

Output goes to `dist/` (~55 MB with music and arena art). First load may take a few seconds on slower connections; a progress bar shows during asset loading.

## Deploy to Vercel

1. Push this folder to its own GitHub repository (see below).
2. Sign in at [vercel.com](https://vercel.com) and **Import Project** from that repo.
3. Vercel auto-detects Vite — build command `npm run build`, output directory `dist` (also set in `vercel.json`).
4. Deploy. The game runs standalone in the browser; no server required beyond static hosting.
5. **Optional:** In Vercel → Project → Settings → Environment Variables:
   - Link **KV** storage (see Live leaderboard above) for global scores — **recommended**
   - Or add the `VITE_FIREBASE_*` values from `.env.example` for email login + Firestore
6. Without KV or Firebase, guest login and a **per-browser** local leaderboard still work for testing.

## Push to GitHub

From this project folder:

```bash
git init
git add .
git commit -m "Initial commit: MIMU VS MONSTER RUMBLE"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mimu-monster-rumble.git
git push -u origin main
```

Create the empty repo on GitHub first (no README), then run the commands above with your repo URL.

## Project Structure

```
src/
├── config/       # Characters, enemies, levels, power-ups
├── entities/     # Player, Enemy, pickups
├── scenes/       # All game screens
├── services/     # Firebase + localStorage fallback
├── systems/      # Abilities, waves, power-ups
├── ui/           # HUD
└── types/        # TypeScript interfaces
```

## Replacing Placeholder Art

Textures are generated at runtime in `PreloadScene`. To use real sprites, load images in `PreloadScene` and keep the same texture keys (`player_voidWarrior`, `enemy_pumpkinFiend`, etc.).
