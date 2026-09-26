-- Minneapolis Masters: run this once in Supabase -> SQL Editor.
-- Safe to re-run: it drops and recreates everything (all scores are lost).

drop table if exists scores cascade;
drop table if exists player_tokens cascade;
drop table if exists players cascade;
drop table if exists private_config cascade;
drop table if exists settings cascade;

-- Public settings (readable by everyone, changed only by the admin through the server).
create table settings (
  id int primary key default 1 check (id = 1),
  pre_round_max int not null default 1 check (pre_round_max between 1 and 2),
  locked boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

-- Private config (never readable from the browser).
create table private_config (
  id int primary key default 1 check (id = 1),
  join_code text not null
);
-- Change this code here or later from the Admin page.
insert into private_config (id, join_code) values (1, 'BROOKVIEW');

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  pre_round_drinks int not null default 0 check (pre_round_drinks between 0 and 2),
  created_at timestamptz not null default now()
);
create unique index players_name_unique on players (lower(name));

-- Each player's secret edit link. Never readable from the browser.
create table player_tokens (
  player_id uuid primary key references players(id) on delete cascade,
  token text not null unique
);

create table scores (
  player_id uuid not null references players(id) on delete cascade,
  hole int not null check (hole between 1 and 18),
  strokes int check (strokes between 1 and 15),
  drinks int not null default 0 check (drinks between 0 and 50),
  updated_at timestamptz not null default now(),
  primary key (player_id, hole),
  constraint last_two_holes_one_drink check (hole < 17 or drinks <= 1)
);

-- Row Level Security: the browser may only READ public tables.
-- All writes go through the Next.js server using the secret key.
alter table settings enable row level security;
alter table private_config enable row level security;
alter table players enable row level security;
alter table player_tokens enable row level security;
alter table scores enable row level security;

create policy "public read settings" on settings for select using (true);
create policy "public read players" on players for select using (true);
create policy "public read scores" on scores for select using (true);
-- No policies on private_config or player_tokens = no browser access at all.

grant select on settings, players, scores to anon, authenticated;
revoke all on private_config, player_tokens from anon, authenticated;
grant all on settings, private_config, players, player_tokens, scores to service_role;

-- Turn on realtime for the live leaderboard.
alter publication supabase_realtime add table settings, players, scores;
