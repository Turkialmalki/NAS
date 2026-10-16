# NAS — منصة المهرجانات السينمائية

Next.js 15 (App Router) + Supabase. Arabic, right-to-left, dark/light themes.

## What's inside

| Route | Who | What |
|---|---|---|
| `/` | everyone | Landing page with the live film-analysis demo |
| `/apply`, `/f/[slug]` | filmmakers | Submit a film (link or file upload), AI rewrite of the synopsis, suggested category, readiness check, reference number |
| `/status` | filmmakers | Track a submission by reference number + email |
| `/login` | team & jury | Email code / magic link, Google, Apple, phone (SMS) — sign in or sign up |
| `/app` | festival team | Today's summary, cycle progress, KPIs |
| `/app/films` | festival team | Plain-language search, filters, NAS analysis, assign reviewers, status, decisions, publish decisions, add a film |
| `/app/jury` | festival team | Reviewer workload, AI-suggested assignment ("assign all"), invite members by email |
| `/app/reports` | festival team | Weekly submissions, breakdowns, audit log, CSV export |
| `/app/settings` | festival team | Festival info, publish/close, categories, scoring criteria, copy to a new edition |
| `/app/new` | anyone signed in | Create a festival (becomes owner) |
| `/app/admin` | platform admin | All festivals, users, contact requests |
| `/review` | reviewers | Only their assigned films: watch → score (1–5 per criterion) → send |

Film analysis (`lib/analyze.ts`) uses Claude when `ANTHROPIC_API_KEY` is set; otherwise a built-in Arabic analyzer runs, so the app works without any AI key.

## Setup

1. **Supabase**: create a project, then run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`).
2. **Auth** (Supabase → Authentication):
   - URL configuration → Site URL = your domain; add `https://your-domain/auth/callback` to Redirect URLs.
   - Email template "Magic Link": add `{{ .Token }}` so users can type the 6-digit code (the link also works).
   - Recommended: SMTP via Resend (Authentication → SMTP) — the built-in email sender is rate-limited.
   - Optional providers: Google, Apple (Authentication → Providers), Phone (needs an SMS provider such as Twilio).
3. **Env**: copy `.env.example` to `.env.local` and fill it in.
4. `npm install && npm run dev` → http://localhost:3000

The account `turkialmalki202200@gmail.com` becomes platform admin automatically on first sign-in.

## Deploy (Vercel)

Import the repo, set **Root Directory = `web`**, Framework = Next.js, add the env variables, deploy.
Then Settings → Domains → add your domain and set the DNS records Vercel shows.
