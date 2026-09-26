-- Upgrade for projects that already ran the original schema.sql.
-- Adds: card submission, withdrawn players, and Past Champions archive.
-- Safe to run more than once. Does not touch existing scores.

alter table players add column if not exists withdrawn boolean not null default false;
alter table players add column if not exists submitted_at timestamptz;

create table if not exists archives (
  year int primary key check (year between 2000 and 2100),
  archived_at timestamptz not null default now(),
  standings jsonb not null,
  awards jsonb not null
);
alter table archives enable row level security;
drop policy if exists "public read archives" on archives;
create policy "public read archives" on archives for select using (true);
grant select on archives to anon, authenticated;
grant all on archives to service_role;
