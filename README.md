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
- `ADMIN_SETUP_TOKEN` — a (reusable) secret needed to create an admin account,
  pasted into the "Admin setup" field on the signup page, so an admin email
  alone can't be used to register. Rotate it once your admins are set up.
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
   account, open the signup page, click "Setting up an admin account?", paste the
   `ADMIN_SETUP_TOKEN`, and choose a password. Admins then manage challenges and
   candidates in-app; everything is stored in the database, never in this repo.

## Security notes & known limitations

- **Auth** is a minimal custom email/password scheme: passwords hashed with
  scrypt, session is an HMAC-signed httpOnly cookie. `SESSION_SECRET` is required
  in production (the app refuses to run without it).
- **No email verification.** Sign-up only checks the email is on the invite list
  (or, for admins, that the setup token matches). For a small, trusted hiring
  round this is an accepted trade-off — someone who knows an invited candidate's
  exact email could register as them. To close it, add magic-link / email
  confirmation or one-time invite tokens.
- **`ADMIN_SETUP_TOKEN`** is a reusable shared secret (not one-time). Keep it out
  of shared links and rotate it once admin accounts exist.
- **RLS** is enabled on all tables with no policies; access is server-side only
  via the Supabase service-role key, which must never reach the browser.

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
