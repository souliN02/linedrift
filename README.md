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
```

## Disclaimer

Educational analytics project. Not betting advice.
