-- Adds a champion name to each archived year and records past champions
-- from before the app. Safe to run more than once; never overwrites a year
-- that already has results.

alter table archives add column if not exists champion_name text;

insert into archives (year, champion_name, standings, awards) values
  (2023, 'Bo Hellquist', '[]', '[]'),
  (2024, 'Logan Neisinger', '[]', '[]'),
  (2025, 'Dan Hastings', '[]', '[]'),
  (2026, 'Ryan Punch', '[]', '[]')
on conflict (year) do nothing;
