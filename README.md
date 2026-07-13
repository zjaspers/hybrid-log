# Hybrid OS 2.0

A clean rebuild of your hybrid athlete training app using GitHub Pages + Supabase.

## What this version does

- White, mobile-first UI
- Email/password login via Supabase
- Today screen built around one action: Start Today's Workout
- Workout A / Workout B / Zone 2 / Recovery override buttons
- Monday–Friday rebalancing; weekends default to Recovery
- Full session and Minimum Viable Workout mode
- Equipment modes: full gym, hotel gym, dumbbells, bodyweight
- Session tracking: exercises, sets, weight, reps, RPE, Zone 2 minutes/distance fields
- Copy set 1 to all sets
- Finish Workout saves the session, locks the day, and updates lift progression
- Button loading/success states and toast feedback
- Program week is manual/workout-based, not calendar-based

## Install

1. In Supabase SQL Editor, run:
   `sql/001_reset_and_schema.sql`

2. Upload these files/folders to GitHub:
   - `index.html`
   - `manifest.webmanifest`
   - `src/`
   - `styles/`
   - `sql/`
   - `docs/`
   - `README.md`

3. GitHub repo settings:
   `Settings → Pages → Deploy from branch → main → root`

4. Open the GitHub Pages URL.

5. If using as a PWA, delete the old home-screen app first, then Add to Home Screen again.

## Cache busting

The app already uses `?v=200` on CSS/JS. When updating, change it to `?v=201`, `?v=202`, etc. in `index.html`.
