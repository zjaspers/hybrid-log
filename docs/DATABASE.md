# Database

Run `sql/001_reset_and_schema.sql` in Supabase, then `sql/002_programs.sql`.

The first schema intentionally wipes old app tables and starts clean while keeping Supabase Auth users.

The second migration adds `programs` / `program_workouts` / `program_exercises` — each user's own training content, editable in-app or importable as JSON (see `docs/PROGRAM_IMPORT.md`) — with row-level security so one account can never see or edit another's program. The original tables from `001` still have RLS off; worth adding before more than one real person is using this.
