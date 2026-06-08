-- Hybrid Log Supabase setup
-- Run this in Supabase SQL Editor.

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  workout_type text not null,
  cycle_week int,
  is_deload boolean default false,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid references workout_logs(id) on delete cascade,
  exercise_name text not null,
  weight numeric,
  reps int,
  set_number int,
  rpe numeric,
  completed boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  run_type text,
  target_minutes int,
  completed_minutes int,
  rpe numeric,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  week_start date not null,
  body_weight numeric,
  waist numeric,
  lifts_completed int,
  runs_completed int,
  protein_rating text,
  recovery_rating text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists daily_nutrition_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  protein_rating text,
  carbs_around_training boolean,
  alcohol_rating text,
  hydration_rating text,
  notes text,
  created_at timestamp with time zone default now()
);

create table if not exists lift_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  exercise_name text not null,
  current_working_weight numeric,
  target_sets int default 3,
  target_reps int default 5,
  last_result text,
  miss_count int default 0,
  next_decision text,
  updated_at timestamp with time zone default now(),
  unique(user_id, exercise_name)
);

alter table workout_logs enable row level security;
alter table exercise_sets enable row level security;
alter table run_logs enable row level security;
alter table weekly_checkins enable row level security;
alter table daily_nutrition_checks enable row level security;
alter table lift_baselines enable row level security;

-- Policies: each logged-in user can manage only their own rows.
drop policy if exists "Users can manage own workout logs" on workout_logs;
create policy "Users can manage own workout logs"
on workout_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own run logs" on run_logs;
create policy "Users can manage own run logs"
on run_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own weekly checkins" on weekly_checkins;
create policy "Users can manage own weekly checkins"
on weekly_checkins for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own nutrition checks" on daily_nutrition_checks;
create policy "Users can manage own nutrition checks"
on daily_nutrition_checks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own lift baselines" on lift_baselines;
create policy "Users can manage own lift baselines"
on lift_baselines for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own exercise sets" on exercise_sets;
create policy "Users can manage own exercise sets"
on exercise_sets for all
using (
  exists (
    select 1 from workout_logs
    where workout_logs.id = exercise_sets.workout_log_id
    and workout_logs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from workout_logs
    where workout_logs.id = exercise_sets.workout_log_id
    and workout_logs.user_id = auth.uid()
  )
);
