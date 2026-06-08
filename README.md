# Hybrid Log

A mobile-first GitHub Pages app for tracking hybrid training with Supabase login and week-to-week memory.

## Stack

- GitHub Pages: hosts the app
- Supabase Auth: login
- Supabase Postgres: workout memory
- Plain HTML/CSS/JavaScript

## Files

- `index.html` app structure
- `style.css` mobile-first design
- `app.js` app logic and Supabase connection
- `supabase.sql` database tables and row-level security policies

## Setup

1. Create a Supabase project.
2. Run `supabase.sql` in Supabase SQL Editor.
3. In `app.js`, replace:
   - `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
   - `PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE`
4. Push files to GitHub.
5. Enable GitHub Pages: Settings → Pages → Deploy from branch → main → root.

## Important

Use only the Supabase anon public key in app.js. Never use the service role key in a browser app.
