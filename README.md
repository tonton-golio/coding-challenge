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
- **Resend** — transactional email (candidate invites + email verification),
  called via its REST API (no SDK dependency).
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
- `RESEND_API_KEY` — Resend API key for sending invite + verification emails.
  Leave **unset** for local dev (the app runs in "log mode": no email is sent,
  verify links are logged and returned in the signup response). **Required** in
  production — candidate signup fails closed on Vercel without it.
- `EMAIL_FROM` — from address, e.g. `Simply.tv Hiring <hiring@simply.tv>`. To
  email external candidates this must be on a domain verified in Resend; the
  default `onboarding@resend.dev` sender only delivers to your own address.
- `APP_URL` — public base URL used to build links in emails (e.g.
  `https://your-app.vercel.app`). Falls back to Vercel's production URL if unset.

## Deploy

1. **Supabase**: create a project and run [`supabase/schema.sql`](supabase/schema.sql)
   in the SQL editor. Optionally run [`supabase/seed.example.sql`](supabase/seed.example.sql)
   for a starter placeholder challenge. RLS is enabled with no public policies —
   the server uses the service-role key, which bypasses RLS, so the key must stay
   server-side only.
2. **Resend**: create an account, add + verify your sending domain (or use the
   onboarding sender for a quick test), and create an API key. Set `RESEND_API_KEY`,
   `EMAIL_FROM`, and `APP_URL` in Vercel.
3. **Vercel**: import the repo and set the environment variables above in the
   project settings (`SESSION_SECRET`, `ADMIN_SETUP_TOKEN`, `ADMIN_EMAILS`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `APP_URL`). The Supabase marketplace integration injects `SUPABASE_URL` for
   you, but **not** `SUPABASE_SERVICE_ROLE_KEY` — paste that one in by hand.
4. **Admins** are whoever is listed in `ADMIN_EMAILS`. To create an admin
   account, open the signup page, click "Setting up an admin account?", paste the
   `ADMIN_SETUP_TOKEN`, and choose a password. Admins are verified on creation
   (no email step), then manage challenges and candidates in-app; everything is
   stored in the database, never in this repo.

## Security notes & known limitations

- **Auth** is a minimal custom email/password scheme: passwords hashed with
  scrypt, session is an HMAC-signed httpOnly cookie. `SESSION_SECRET` is required
  in production (the app refuses to run without it).
- **Email verification.** Candidates must confirm their invited email (via a
  Resend-delivered link) before they get a session, so knowing an invited email
  isn't enough to register as that candidate — you also need access to their
  inbox. Admins skip this step: the `ADMIN_SETUP_TOKEN` is their proof of
  authority, which also avoids an email-delivery dependency for the first admin.
- **`ADMIN_SETUP_TOKEN`** is a reusable shared secret (not one-time). Keep it out
  of shared links and rotate it once admin accounts exist.
- **No rate limiting** on auth/verify endpoints yet — fine for a small invite-only
  round; add it before any wider exposure.
- **RLS** is enabled on all tables with no policies; access is server-side only
  via the Supabase service-role key, which must never reach the browser.

## How it works

- Admins invite candidates by email (which sends an invite link) and assign each
  a challenge from the database-backed catalogue.
- Only an invited candidate can create a candidate account; admin accounts
  require the `ADMIN_SETUP_TOKEN`.
- After signing up, a candidate must click the verification link emailed to them
  before they can sign in — this confirms they own the invited address.
- A candidate sees their challenge brief **only after they reveal it**, which
  starts and records their 90-minute timer. There is no pause and no second
  reveal.
- Candidates submit by pasting a public GitHub repository link before the timer
  ends.
