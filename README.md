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
- **Leaderboard** — localStorage by default; Firebase when configured

## Firebase Setup (optional)

1. Create a Firebase project with **Authentication** (Email/Password) and **Firestore**.
2. Copy `.env.example` to `.env` and fill in your Firebase config values.
3. Add Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Without Firebase, the game works fully with **guest login** and a **local leaderboard**.

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
5. **Optional:** In Vercel → Project → Settings → Environment Variables, add the `VITE_FIREBASE_*` values from `.env.example` for cloud auth and leaderboard. Without them, guest login and local leaderboard work as-is.

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
