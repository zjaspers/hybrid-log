# Hybrid Log v10

Reliable daily workout tracking loop for Hybrid Athlete OS V2.0.

## Install
1. Run `supabase-v10.sql` in Supabase SQL Editor.
2. Replace `index.html`, `style.css`, and `app.js` in your GitHub Pages repo.
3. Commit and refresh your GitHub Pages site.

## What changed
- Fixed Start Today's Workout flow.
- Logged-in users go directly to session tracking.
- Logged-out start intent is saved and resumes after login.
- Workout picker works for A/B/Zone 2/Recovery.
- Session tracking includes exercises, sets, reps, weight, RPE, run minutes, run distance, notes.
- Copy set 1 to remaining sets.
- Finish/save locks the day and updates progress.
- Readiness inputs recommend training adjustment.
- Minimum Viable mode for travel/rushed days.

## Verification checklist
- Log out, tap Start Today, log in, confirm workout opens.
- Log in, tap Start Today, confirm workout opens.
- Switch A/B/Zone 2/Recovery from Today and Session.
- Save a session and confirm it appears in Supabase workout_logs.
- Confirm run data appears in run_logs.
- Confirm no console errors.
