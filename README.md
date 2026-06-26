# Coding Challenge

A small take-home coding-challenge platform. Invited candidates sign up with the
email they were invited with, reveal their assigned challenge when they're ready,
and submit a public GitHub repository link before a 90-minute timer runs out.
Admins invite candidates and assign each one a challenge from an in-app catalogue.

## Challenges are NOT in this repository

This repo is public. **No real challenge briefs, candidate emails, or secrets
live in the code.** Challenges and candidates are created in the in-app Admin
page and stored in the database. The only thing seeded in code is a single,
clearly-fake placeholder challenge that you edit or delete in Admin.

## Tech

- **Next.js** (App Router, TypeScript, React 19) — the web app and API routes.
- **Supabase** (Postgres) — production data store, accessed server-side via the
  service-role key.
- **Vercel** — hosting/deploy target.

Local development falls back to a JSON file store (no database required), so you
can run the whole thing with zero external services.

## Local development

```bash
npm install
cp .env.example .env.local      # then edit the values
npm run dev
```

Open http://localhost:3000.

With `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` left **unset** in `.env.local`,
the app uses a local JSON file store at `.data/db.json` (gitignored, created on
first run and seeded with the placeholder challenge). Set the two Supabase
variables to switch to the Postgres store.

### Environment variables

See `.env.example`:

- `SESSION_SECRET` — long random string used to sign the session cookie
  (required in production; the app refuses to run without it).
- `ADMIN_EMAILS` — comma-separated list of admin emails (case-insensitive).
- `ADMIN_SETUP_TOKEN` — one-time secret needed to create an admin account
  (admins sign up at `/signup?setup=<token>`), so an admin email alone can't be
  hijacked.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — leave unset for local dev (JSON
  store); **required** in production on Vercel (the JSON store is not durable on
  serverless, so the app fails closed without them).

## Deploy

1. **Supabase**: create a project and run [`supabase/schema.sql`](supabase/schema.sql)
   in the SQL editor. Optionally run [`supabase/seed.example.sql`](supabase/seed.example.sql)
   for a starter placeholder challenge. RLS is enabled with no public policies —
   the server uses the service-role key, which bypasses RLS, so the key must stay
   server-side only.
2. **Vercel**: import the repo and set the environment variables above in the
   project settings (`SESSION_SECRET`, `ADMIN_EMAILS`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`).
3. **Admins** are whoever is listed in `ADMIN_EMAILS`. To create an admin
   account, visit `/signup?setup=<ADMIN_SETUP_TOKEN>` once and choose a password.
   Admins then manage challenges and candidates in-app; everything is stored in
   the database, never in this repo.

## How it works

- Only an invited candidate can create a candidate account; admin accounts
  require the `ADMIN_SETUP_TOKEN`.
- A candidate sees their challenge brief **only after they reveal it**, which
  starts and records their 90-minute timer. There is no pause and no second
  reveal.
- Candidates submit by pasting a public GitHub repository link before the timer
  ends.
- Admins invite candidates by email and assign each a challenge from the
  database-backed catalogue.
