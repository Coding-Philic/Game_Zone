-- =============================================
-- Gaming Fest — Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Games table
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  poster_url text not null,
  type text not null check (type in ('solo','team')),
  max_members int not null default 1,
  registration_open boolean default true,
  created_at timestamptz default now()
);

-- 2. Registrations table
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  team_name text,
  leader_name text not null,
  leader_email text not null,
  leader_phone text not null,
  college_name text not null,
  gamer_id text,
  members jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz default now()
);

create index if not exists idx_reg_game on registrations(game_id);
create index if not exists idx_reg_created on registrations(created_at desc);
create unique index if not exists idx_reg_unique_game_email on registrations(game_id, leader_email);

-- 3. Site settings table (for swappable background)
create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- =============================================
-- Row Level Security
-- =============================================

alter table games enable row level security;
alter table registrations enable row level security;
alter table site_settings enable row level security;

-- Games: readable by all
create policy "games_readable" on games for select using (true);

-- Site settings: readable by all, writable by authenticated
create policy "site_settings_readable" on site_settings for select using (true);
create policy "site_settings_update_admin" on site_settings for update using (auth.uid() is not null);

-- Registrations: anyone can insert, only authenticated can read/update/delete
create policy "registrations_insert" on registrations for insert with check (true);
create policy "registrations_select_admin" on registrations for select using (auth.uid() is not null);
create policy "registrations_update_admin" on registrations for update using (auth.uid() is not null);
create policy "registrations_delete_admin" on registrations for delete using (auth.uid() is not null);

-- =============================================
-- Seed Data — 5 Games
-- =============================================

insert into games (id, slug, name, poster_url, type, max_members, registration_open) values
  ('a1111111-1111-4111-a111-111111111111', 'tekken',         'Tekken 8',               '/games/tekken.jpg',        'solo', 1, true),
  ('a2222222-2222-4222-a222-222222222222', 'mortal-kombat',  'Mortal Kombat 1',         '/games/mortal-kombat.jpg', 'solo', 1, true),
  ('a3333333-3333-4333-a333-333333333333', 'fifa-26',        'FIFA 26',                '/games/fifa-26.jpg',       'solo', 1, true),
  ('a4444444-4444-4444-a444-444444444444', 'codm',           'Call of Duty: Mobile',    '/games/codm.jpg',          'team', 5, true),
  ('a5555555-5555-4555-a555-555555555555', 'bgmi',           'BGMI',                   '/games/bgmi.jpg',          'team', 4, true)
on conflict (slug) do nothing;

-- Seed site settings
insert into site_settings (key, value) values
  ('background_url', '/bg/cyberpunk-arena.jpg'),
  ('background_type', 'image')
on conflict (key) do nothing;
