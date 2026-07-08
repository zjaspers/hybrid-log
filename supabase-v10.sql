-- Hybrid Log v10 schema patch
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  equipment_mode text default 'full',
  current_week int default 1,
  advance_after_lifts text default '3',
  lift_count_this_program_week int default 0,
  updated_at timestamp with time zone default now()
);

alter table user_preferences add column if not exists current_week int default 1;
alter table user_preferences add column if not exists advance_after_lifts text default '3';
alter table user_preferences add column if not exists lift_count_this_program_week int default 0;

create table if not exists daily_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  workout_date date not null,
  planned_workout text not null,
  actual_workout text,
  status text default 'planned',
  is_locked boolean default false,
  created_at timestamp with time zone default now(),
  unique(user_id, workout_date)
);

alter table lift_baselines add column if not exists next_decision text;
alter table weekly_checkins add column if not exists arm_measurement numeric;
alter table weekly_checkins add column if not exists zone2_pace text;
