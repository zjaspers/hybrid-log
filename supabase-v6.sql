create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  equipment_mode text default 'full',
  updated_at timestamp with time zone default now()
);

create table if not exists weekly_plan_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  week_start date not null,
  date date not null,
  assigned_plan text not null,
  is_manual_override boolean default false,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

alter table lift_baselines add column if not exists next_decision text;
