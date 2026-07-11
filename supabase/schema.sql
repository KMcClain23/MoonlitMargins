-- Moonlit Margins Sisterhood — core schema
-- Run in the Supabase SQL editor, or via the CLI: supabase db push

create extension if not exists "pgcrypto";

-- One table for all three application funnels (member / interview / collab),
-- distinguished by `kind`, so status tracking and admin review stay unified.
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('member', 'interview', 'collab')),
  status text not null default 'pending' check (status in ('pending', 'in_review', 'accepted', 'declined')),
  full_name text not null,
  email text not null,
  instagram_handle text,
  tiktok_handle text,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists applications_kind_idx on applications (kind);
create index if not exists applications_status_idx on applications (status);

-- Events calendar (replaces the empty Wix widget)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null check (event_type in ('reading_sprint', 'tiktok_live', 'author_event', 'annual_meetup', 'other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  link_url text,
  registration_type text not null default 'rsvp' check (registration_type in ('rsvp', 'ticketing')),
  status text not null default 'scheduled' check (status in ('scheduled', 'canceled')),
  cover_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on events (starts_at);

-- Members / leadership directory
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text,
  bio text,
  photo_url text,
  tiktok_handle text,
  is_leadership boolean not null default false,
  display_order int not null default 0,
  tier text not null default 'member' check (tier in ('founder', 'council', 'junior_council', 'member')),
  socials jsonb not null default '{}'::jsonb,
  photo_zoom numeric not null default 1 check (photo_zoom >= 1 and photo_zoom <= 3),
  photo_offset_x numeric not null default 0 check (photo_offset_x >= -50 and photo_offset_x <= 50),
  photo_offset_y numeric not null default 0 check (photo_offset_y >= -50 and photo_offset_y <= 50),
  created_at timestamptz not null default now()
);

-- Memories gallery
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  image_url text not null,
  thumbnail_url text,
  title text,
  caption text,
  published_at timestamptz,
  event_id uuid references events (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Email list for the "Stay in the know" signup banner
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Row Level Security: public can read events/members/memories,
-- but only the service role (server-side) can write applications,
-- subscribers, or manage the rest. No public write access anywhere.
alter table applications enable row level security;
alter table events enable row level security;
alter table members enable row level security;
alter table memories enable row level security;
alter table subscribers enable row level security;

create policy "public can read events" on events for select using (true);
create policy "public can read members" on members for select using (true);
create policy "public can read memories" on memories for select using (true);

-- No public policies on applications or subscribers: all inserts happen
-- through Next.js API routes using the service role key, never the anon key.
