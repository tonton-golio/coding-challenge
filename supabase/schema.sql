-- simply.tv Coding Challenge — database schema
--
-- The application talks to these tables ONLY through the Supabase service-role
-- key from the server (lib/store.supabase.ts). The service role bypasses RLS,
-- so we enable RLS with NO public policies: that denies all anon/authenticated
-- access while leaving the server's service-role access fully functional.
--
-- Never expose the service-role key to the browser.

create table if not exists challenges (
  id       uuid primary key,
  title    text not null,
  intro    text not null,
  criteria jsonb not null default '[]'::jsonb
);

create table if not exists candidates (
  email        text primary key,
  challenge_id uuid references challenges (id) on delete set null,
  started_at   bigint,
  repo_url     text
);

create table if not exists users (
  email         text primary key,
  password_hash text not null
);

-- Enable RLS on every table. With no policies defined, anon + authenticated
-- clients are denied all access; the server's service-role key bypasses RLS.
alter table challenges enable row level security;
alter table candidates enable row level security;
alter table users      enable row level security;

-- (Intentionally NO policies. Access is server-side, via the service role.)
