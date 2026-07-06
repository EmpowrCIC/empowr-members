# Empowr Members

Membership and session booking platform for Empowr CIC — members book, pay for, and manage sessions and monthly memberships at **members.empowrcic.org**. Replaces the legacy Wix booking system.

## Setup

```bash
cd src
npm install
cp .env.example .env.local   # then fill in values — see ops/CONTEXT.md
npm run dev
```

All npm commands run from `src/` — it is the Next.js project root (Netlify base directory).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (empowr-cic project) · Stripe · Resend · Netlify

## Orientation

- `CLAUDE.md` — routing map (start here)
- `planning/spec/CONTEXT.md` — product spec and build phases
- `planning/architecture/CONTEXT.md` — data model and system design
- `ops/CONTEXT.md` — deployment and environment variables
