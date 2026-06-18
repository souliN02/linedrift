# OddsLens

[![CI](https://github.com/souliN02/oddslens/actions/workflows/ci.yml/badge.svg)](https://github.com/souliN02/oddslens/actions/workflows/ci.yml)

A self-hosted football odds tracker that snapshots bookmaker odds over time,
computes no-vig consensus probabilities, and flags outlier prices.

**Live demo:** https://oddslens-mocha.vercel.app

> 🚧 Work in progress. Built in phases — see [`SPEC.md`](./SPEC.md) for the full
> product spec and [`CLAUDE.md`](./CLAUDE.md) for working conventions. The full
> README (architecture diagram, engineering decisions, screenshots) lands in the
> final polish phase.

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui · Drizzle +
Neon Postgres · Zod · Recharts · Vitest · GitHub Actions + Vercel.

## Local setup

Uses [pnpm](https://pnpm.io) (pinned via the `packageManager` field).

```bash
pnpm install
cp .env.example .env   # fill in values as later phases need them
pnpm dev               # http://localhost:3000
```

## Scripts

```bash
pnpm dev             # local dev server
pnpm build           # production build
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest run
pnpm format          # prettier --write .
pnpm db:generate     # drizzle-kit generate migrations
pnpm db:migrate      # apply migrations
pnpm db:seed         # seed local/dev DB from tests/fixtures/odds-response.json
```

## Ingestion pipeline

Free odds APIs only expose _current_ odds, so OddsLens builds its own history: a
scheduled job snapshots odds every 3 hours and stores them in Postgres.

- **`POST /api/cron/snapshot`** is the only mutating endpoint. It requires
  `Authorization: Bearer ${CRON_SECRET}`, fetches h2h odds for both leagues from
  [The Odds API](https://the-odds-api.com), validates them through the Zod
  boundary in [`src/lib/odds-api.ts`](src/lib/odds-api.ts), upserts via
  [`src/db/ingest.ts`](src/db/ingest.ts), logs `x-requests-remaining`, and
  returns `{ matches, snapshots, creditsRemaining }`. A unique
  `(match, bookmaker, captured_at)` index makes duplicate runs harmless.
- **[`.github/workflows/snapshot.yml`](.github/workflows/snapshot.yml)** curls
  that endpoint on a `0 */3 * * *` schedule (and on manual `workflow_dispatch`).
- **Budget:** 2 leagues × 1 region (`eu`) × 1 market (`h2h`) = 2 credits/run ×
  8 runs/day ≈ 480 of the free tier's 500 credits/month (see `SPEC.md` §4).
  **Development and tests never call the live API** — use `pnpm db:seed`.

### Configuration

| Where  | Name           | Value                                                   |
| ------ | -------------- | ------------------------------------------------------- |
| Vercel | `DATABASE_URL` | Neon connection string                                  |
| Vercel | `ODDS_API_KEY` | the-odds-api.com key                                    |
| Vercel | `CRON_SECRET`  | long random string                                      |
| GitHub | `CRON_SECRET`  | secret — same value as Vercel                           |
| GitHub | `SNAPSHOT_URL` | variable — `https://<app>.vercel.app/api/cron/snapshot` |

After setting these, trigger `snapshot.yml` via **workflow_dispatch** to confirm
rows land in Neon and credits are logged in the Vercel function logs.

## Dashboard

The home page (`/`) lists matches kicking off in the next 7 days, with kickoff
times in Europe/Copenhagen, a per-match count of bookmakers in the latest
snapshot set, and a "last snapshot" indicator. A league filter (`?league=...`)
is driven by the URL so the page stays a server component. It handles loading,
empty (no snapshots yet vs. nothing upcoming), and error states. Best odds,
overround, and value badges are layered on in a later phase.

## Disclaimer

Educational analytics project. Not betting advice.
