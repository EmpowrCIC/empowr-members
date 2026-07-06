# src/ — Next.js Project Root

This directory is the Next.js project root. **All npm commands (install, dev, build) run from here, never from the repo root.** Netlify's base directory points here — any file a function or build step needs must live inside src/.

## Structure

| Path | Purpose |
|---|---|
| `app/` | App Router routes — server components by default |
| `components/` | Reusable UI components, PascalCase, one per file |
| `lib/` | Utilities — `links.ts` (all external URLs), `types.ts`, Supabase clients |
| `lib/supabase/` | `client.ts` (browser anon), `server.ts` (server + cookies), `service.ts` (service role, server-only) — mirror the PecuvateCRM pattern |
| `supabase/migrations/` | Local `.sql` file for every migration applied to the `empowr-cic` project |
| `public/` | Static assets, favicons (via /init-brand) |

## Conventions

- TypeScript strict; no `any` — use `unknown` and narrow; no `@ts-ignore`
- Server Components by default; `"use client"` only where interactivity is genuine
- Tailwind v4 — brand tokens registered via `@theme` in `app/globals.css`; no arbitrary values for design-system properties; shadcn/ui components added on demand
- Icons: lucide-react — never emoji
- Never hardcode URLs, prices, or plan data in components — centralise in `lib/`
- Route groups `(member)/` and `(admin)/` to separate authenticated areas without polluting URLs
- Import alias `@/*` resolves from this directory (`"./*"` — src/ IS the project root)

## Data Access Rules

- Reads: RLS-scoped server client (`lib/supabase/server.ts`)
- Writes: **API routes with the service client only** (`lib/supabase/service.ts`)
- Never touch non-`mem_` tables except read-only waiver checks (`people`, `waiver_responses`, `form_versions`)
- Stripe webhook handler must verify signatures with `STRIPE_WEBHOOK_SECRET`

## Testing

- UI verification via /webapp-testing (Playwright) against `npm run dev`
- Dev server: `npm run dev -- --hostname 0.0.0.0` for LAN access (allowedDevOrigins configured in next.config.ts)
