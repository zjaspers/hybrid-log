-- Run this if you used the first version of the database.
-- It safely adds the progression decision field if it does not already exist.
alter table lift_baselines
add column if not exists next_decision text;
