// Pure helpers that reshape a match's raw snapshot rows for the detail page.
// These are data-shaping only — implied/no-vig/overround/edge math lives in
// odds-math.ts (Phase 5). Pure functions so they are unit-testable and can run
// in a server component without a client round-trip.

import type { MatchSnapshot } from "@/db/queries";

export type Outcome = "home" | "draw" | "away";

export type BookmakerRef = { key: string; title: string };

function valueFor(snapshot: MatchSnapshot, outcome: Outcome): number | null {
  if (outcome === "home") return snapshot.homeOdds;
  if (outcome === "away") return snapshot.awayOdds;
  return snapshot.drawOdds;
}

function displayTitle(snapshot: MatchSnapshot): string {
  return snapshot.bookmakerTitle ?? snapshot.bookmakerKey;
}

/**
 * The most recent snapshot per bookmaker, sorted by display title.
 *
 * `captured_at` is per-bookmaker (each row is that bookmaker's `last_update`,
 * not a shared run instant — see `toSnapshotRows`), so "latest" must be taken
 * per bookmaker rather than off one global timestamp. The unique
 * (match, bookmaker, captured_at) index rules out exact ties within a bookmaker.
 */
export function latestByBookmaker(snapshots: MatchSnapshot[]): MatchSnapshot[] {
  const latest = new Map<string, MatchSnapshot>();
  for (const s of snapshots) {
    const prev = latest.get(s.bookmakerKey);
    if (!prev || s.capturedAt.getTime() > prev.capturedAt.getTime()) {
      latest.set(s.bookmakerKey, s);
    }
  }
  return [...latest.values()].sort((a, b) =>
    displayTitle(a).localeCompare(displayTitle(b)),
  );
}

// One point on the time axis: `t` is the captured timestamp in ms; every other
// key is a bookmaker key mapped to its odds (null where that bookmaker had no
// point at this time, so Recharts can `connectNulls` across gaps).
export type ChartPoint = { t: number; [bookmakerKey: string]: number | null };

export type ChartSeries = {
  points: ChartPoint[];
  bookmakers: BookmakerRef[];
};

/**
 * Pivot snapshots into Recharts-ready series for one outcome: a time-sorted
 * array of points over the union of all timestamps, plus the bookmakers that
 * quoted that outcome at least once. Bookmakers missing the draw price simply
 * don't appear in the draw series.
 */
export function toChartSeries(
  snapshots: MatchSnapshot[],
  outcome: Outcome,
): ChartSeries {
  const titles = new Map<string, string>();
  const byTime = new Map<number, ChartPoint>();

  for (const s of snapshots) {
    const value = valueFor(s, outcome);
    if (value === null) continue;

    titles.set(s.bookmakerKey, displayTitle(s));

    const t = s.capturedAt.getTime();
    let point = byTime.get(t);
    if (!point) {
      point = { t };
      byTime.set(t, point);
    }
    point[s.bookmakerKey] = value;
  }

  const keys = [...titles.keys()];
  const points = [...byTime.values()]
    .sort((a, b) => a.t - b.t)
    .map((point) => {
      const filled: ChartPoint = { t: point.t };
      for (const key of keys) {
        filled[key] = key in point ? point[key] : null;
      }
      return filled;
    });

  const bookmakers = keys
    .map((key) => ({ key, title: titles.get(key) ?? key }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return { points, bookmakers };
}
