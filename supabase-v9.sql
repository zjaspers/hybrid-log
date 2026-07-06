create table if not exists program_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  active_week int default 1 check (active_week between 1 and 8),
  advance_mode text default 'completed_lifts',
  lifts_required int default 3,
  week_started_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Optional: if a previous version created this table with fewer columns, these keep it safe.
alter table program_state add column if not exists active_week int default 1;
alter table program_state add column if not exists advance_mode text default 'completed_lifts';
alter table program_state add column if not exists lifts_required int default 3;
alter table program_state add column if not exists week_started_at timestamp with time zone default now();
alter table program_state add column if not exists updated_at timestamp with time zone default now();

-- v9: Hybrid Athlete OS V2.0 check-in fields
alter table weekly_checkins add column if not exists arm_measurement numeric;
alter table weekly_checkins add column if not exists zone2_pace text;
alter table weekly_checkins add column if not exists front_photo_note text;
alter table weekly_checkins add column if not exists side_photo_note text;
