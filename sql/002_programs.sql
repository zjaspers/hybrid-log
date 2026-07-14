-- Hybrid OS 2.0 — user-authored programs.
-- Additive migration. Run after 001_reset_and_schema.sql. Safe to re-run (guards with IF NOT EXISTS
-- where possible; drop the three tables manually first if you need a clean re-run).

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'My Program',
  -- 7 entries, Monday first, each a workout `key` referenced in program_workouts
  week_template jsonb not null default '["workout_a","zone2","workout_b","zone2","workout_a","recovery","recovery"]',
  is_active boolean not null default true,
  source text not null default 'manual', -- 'manual' | 'import' | 'default'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade not null,
  key text not null,
  display_name text not null,
  category text not null default 'lift', -- 'lift' | 'run' | 'recovery'
  sort_order integer not null default 0,
  substitutions jsonb not null default '{}', -- { hotel_gym: {"Bench Press":"DB Bench Press"}, dumbbells: {...}, bodyweight: {...} }
  unique(program_id, key)
);

create table if not exists program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_workout_id uuid references program_workouts(id) on delete cascade not null,
  name text not null,
  note text default '',
  target text default '',       -- display string, e.g. "3x8" or "20-30 min"
  sets integer default 3,
  reps numeric default 10,      -- rep target (or minutes, if is_run)
  default_weight numeric,
  increment numeric,            -- lb added on a hit; if null, engine falls back to reps>=10 ? 2.5 : 5
  is_run boolean default false,
  sort_order integer not null default 0
);

-- only one active program per user at a time
drop index if exists uniq_active_program_per_user;
create unique index uniq_active_program_per_user on programs(user_id) where is_active;

create index if not exists idx_programs_user on programs(user_id);
create index if not exists idx_program_workouts_program on program_workouts(program_id);
create index if not exists idx_program_exercises_workout on program_exercises(program_workout_id);

-- RLS: each person can only ever see/write their own program data.
-- (The 001 schema shipped without RLS — add it there too when you get a chance.)
alter table programs enable row level security;
alter table program_workouts enable row level security;
alter table program_exercises enable row level security;

drop policy if exists "own programs" on programs;
create policy "own programs" on programs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own program workouts" on program_workouts;
create policy "own program workouts" on program_workouts for all
  using (auth.uid() = (select user_id from programs where programs.id = program_workouts.program_id))
  with check (auth.uid() = (select user_id from programs where programs.id = program_workouts.program_id));

drop policy if exists "own program exercises" on program_exercises;
create policy "own program exercises" on program_exercises for all
  using (auth.uid() = (
    select p.user_id from programs p
    join program_workouts w on w.program_id = p.id
    where w.id = program_exercises.program_workout_id
  ))
  with check (auth.uid() = (
    select p.user_id from programs p
    join program_workouts w on w.program_id = p.id
    where w.id = program_exercises.program_workout_id
  ));
