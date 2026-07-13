-- Hybrid OS 2.0 clean reset for the existing Supabase project.
-- This deletes old app data but keeps Supabase Auth users.

drop table if exists exercise_sets cascade;
drop table if exists run_logs cascade;
drop table if exists workout_logs cascade;
drop table if exists daily_schedule cascade;
drop table if exists readiness_logs cascade;
drop table if exists lift_baselines cascade;
drop table if exists weekly_checkins cascade;
drop table if exists daily_nutrition_checks cascade;
drop table if exists user_preferences cascade;

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipment_mode text not null default 'full_gym',
  current_program_week integer not null default 1,
  week_advance_rule text not null default 'manual_or_3_lifts',
  weekend_training boolean not null default false,
  updated_at timestamptz default now()
);

create table daily_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  workout_date date not null,
  planned_workout text not null,
  actual_workout text,
  status text not null default 'planned',
  locked boolean not null default false,
  created_at timestamptz default now(),
  unique(user_id, workout_date)
);

create table readiness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  readiness_date date not null,
  feel text default 'good',
  sleep_score integer,
  hrv integer,
  body_battery integer,
  stress integer,
  soreness integer,
  available_minutes integer,
  recommended_workout text,
  created_at timestamptz default now(),
  unique(user_id, readiness_date)
);

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workout_date date not null,
  workout_type text not null,
  program_week integer,
  mode text default 'full',
  completed boolean default true,
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid references workout_logs(id) on delete cascade not null,
  exercise_name text not null,
  set_number integer not null,
  weight numeric,
  reps numeric,
  rpe numeric,
  completed boolean default true
);

create table run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  workout_log_id uuid references workout_logs(id) on delete cascade,
  run_date date not null,
  run_type text,
  minutes numeric,
  distance numeric,
  avg_hr integer,
  rpe numeric,
  notes text,
  created_at timestamptz default now()
);

create table lift_baselines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_name text not null,
  current_working_weight numeric,
  next_weight numeric,
  miss_count integer default 0,
  last_result text,
  next_decision text,
  updated_at timestamptz default now(),
  unique(user_id, exercise_name)
);

create table weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  body_weight numeric,
  waist numeric,
  arm numeric,
  zone2_pace text,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

create table daily_nutrition_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  check_date date not null,
  protein boolean default false,
  fruit boolean default false,
  vegetables boolean default false,
  water boolean default false,
  alcohol text default 'none',
  notes text,
  created_at timestamptz default now(),
  unique(user_id, check_date)
);

create index idx_daily_schedule_user_date on daily_schedule(user_id, workout_date);
create index idx_workout_logs_user_date on workout_logs(user_id, workout_date);
create index idx_exercise_sets_workout on exercise_sets(workout_log_id);
create index idx_run_logs_user_date on run_logs(user_id, run_date);
create index idx_lift_baselines_user on lift_baselines(user_id);

-- RLS intentionally off for this personal v1 rebuild. Add policies later once stable.
