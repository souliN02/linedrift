# CLAUDE.md - OddsLens

Football odds tracker. Full product spec lives in `SPEC.md` - read it before any task. Build strictly within the MVP scope in SPEC.md section 2; suggest extras, do not build them.

## Commands

Package manager: **pnpm** (Vercel uses pnpm; pinned via the `packageManager` field).

```
pnpm dev             # local dev server
pnpm build           # production build
pnpm lint            # eslint
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest run
pnpm db:generate     # drizzle-kit generate migrations
pnpm db:migrate      # apply migrations
pnpm db:seed         # seed local/dev DB from tests/fixtures/odds-response.json
```

## Definition of done (every task)

1. `pnpm typecheck`, `pnpm lint`, and `pnpm test` all pass locally
2. New logic has tests (odds math is always test-first)
3. UI changes handle loading, empty, and error states
4. Commit with a conventional commit message (`feat:`, `fix:`, `test:`, `chore:`, `docs:`)

## Hard rules

- **Never call The Odds API during development or tests.** Use `tests/fixtures/odds-response.json`. The free tier has ~500 credits/month and the scheduled job needs almost all of them (SPEC.md section 4).
- **Never commit secrets.** `.env` is gitignored; keep `.env.example` updated when adding variables.
- TypeScript strict mode, no `any`, no `@ts-ignore`. If a type is hard, fix the type.
- All external data passes through Zod schemas in `src/lib/odds-api.ts` before touching the rest of the app.
- Odds values are `numeric` in Postgres and strings in Drizzle results; convert deliberately in one place.
- Odds math lives only in `src/lib/odds-math.ts` as pure functions. No math inline in components.
- Server components for data reads by default; client components only where interactivity requires it (charts, toggles, filters).
- Keep components small and colocated. No premature abstraction, no extra dependencies without asking.
- Timezone: display kickoff times in Europe/Copenhagen.

## UI / frontend design (Phase 6)

Goal: the app should look intentionally designed, not like a templated AI default ("just another shadcn dashboard"). This is a recruiter-facing portfolio piece (SPEC §1, §12 Phase 6) — distinctiveness is the point. Use Anthropic's `frontend-design` skill as the design lead during Phase 6.

Apply it hardest to `/about` (recruiter-facing) and overall presentation polish. Keep the data tables and odds charts restrained — clarity and scannability beat flair there.

Guardrails (these override the skill's instincts):

- **Stay in the existing system.** Build on shadcn/ui, Geist / Geist Mono, and `tw-animate-css`. No new fonts, animation libs, or other dependencies without asking first (see "no extra dependencies" above).
- **Lighthouse pass is a Phase 6 done-criterion.** Motion must be cheap and tasteful; watch CLS and font/asset weight. Don't trade performance for effects.
- **Tone: editorial/analytical credibility, not flashy betting site.** The footer says "Educational analytics. Not betting advice." — keep that posture. No casino/gambling energy.
- **Avoid the known AI-design clichés** the skill warns about: cream + serif + terracotta, near-black + single acid/vermilion accent, broadsheet hairline-rule layouts, predictable purple gradients, generic system fonts.

## Project structure

```
src/
  app/                  # routes: /, /match/[id], /about, /api
  components/           # shared UI
  db/                   # drizzle schema, client, seed
  lib/
    odds-api.ts         # The Odds API client + Zod schemas (only file that knows the external shape)
    odds-math.ts        # pure functions: implied, overround, noVig, consensus, edge, bestPrice
tests/
  fixtures/odds-response.json
.github/workflows/      # ci.yml, snapshot.yml
```

## Workflow

- One phase from SPEC.md section 12 per session, on a feature branch, merged via PR with green CI.
- Plan before implementing on any multi-file change; show the plan first.
- When a phase is done, update the README if behavior or setup changed.
