import { and, asc, count, desc, eq, gte, inArray, lte, max } from "drizzle-orm";

import { getDb } from "./client";
import {
  bookmakers,
  ingestionRuns,
  leagues,
  matches,
  oddsSnapshots,
} from "./schema";

export type { IngestionRun } from "./schema";

// How far ahead the dashboard looks (SPEC §8: "next 7 days").
const UPCOMING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type UpcomingMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  leagueKey: string;
  leagueTitle: string | null;
};

/**
 * Upcoming matches kicking off within the next 7 days, ordered by kickoff.
 * Optionally narrowed to a single league. Joined to `leagues` for the title;
 * the join is left so a match with a not-yet-seeded league still appears.
 */
export async function getUpcomingMatches(
  options: {
    leagueKey?: string;
    now?: Date;
  } = {},
): Promise<UpcomingMatch[]> {
  const now = options.now ?? new Date();
  const horizon = new Date(now.getTime() + UPCOMING_WINDOW_MS);

  const conditions = [
    gte(matches.commenceTime, now),
    lte(matches.commenceTime, horizon),
  ];
  if (options.leagueKey) {
    conditions.push(eq(matches.leagueKey, options.leagueKey));
  }

  return getDb()
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      commenceTime: matches.commenceTime,
      leagueKey: matches.leagueKey,
      leagueTitle: leagues.title,
    })
    .from(matches)
    .leftJoin(leagues, eq(matches.leagueKey, leagues.key))
    .where(and(...conditions))
    .orderBy(asc(matches.commenceTime));
}

/**
 * The next matches kicking off from `now`, ignoring the 7-day window, ordered by
 * kickoff and capped at `limit`. The dashboard falls back to this when nothing is
 * upcoming in the next 7 days (e.g. between seasons) so the page is never empty.
 */
export async function getNextUpcomingMatches(
  options: {
    leagueKey?: string;
    now?: Date;
    limit?: number;
  } = {},
): Promise<UpcomingMatch[]> {
  const now = options.now ?? new Date();

  const conditions = [gte(matches.commenceTime, now)];
  if (options.leagueKey) {
    conditions.push(eq(matches.leagueKey, options.leagueKey));
  }

  return getDb()
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      commenceTime: matches.commenceTime,
      leagueKey: matches.leagueKey,
      leagueTitle: leagues.title,
    })
    .from(matches)
    .leftJoin(leagues, eq(matches.leagueKey, leagues.key))
    .where(and(...conditions))
    .orderBy(asc(matches.commenceTime))
    .limit(options.limit ?? 10);
}

/** All leagues that have been seeded/ingested, for the dashboard filter. */
export async function getLeagues(): Promise<{ key: string; title: string }[]> {
  return getDb()
    .select({ key: leagues.key, title: leagues.title })
    .from(leagues)
    .orderBy(asc(leagues.title));
}

/** Timestamp of the most recent snapshot across all matches, or null if none. */
export async function getLastSnapshotAt(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ value: max(oddsSnapshots.capturedAt) })
    .from(oddsSnapshots);
  return row?.value ?? null;
}

/** The most recent ingestion runs, newest first (id breaks same-instant ties). */
export async function getRecentRuns(limit = 6) {
  return getDb()
    .select()
    .from(ingestionRuns)
    .orderBy(desc(ingestionRuns.ranAt), desc(ingestionRuns.id))
    .limit(limit);
}

/** Total ingestion runs ever recorded. */
export async function getRunCount(): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(ingestionRuns);
  return row?.value ?? 0;
}

export type MatchDetail = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  leagueKey: string;
  leagueTitle: string | null;
};

// Canonical RFC 4122 UUID shape. `matches.id` is a Postgres uuid, so passing a
// non-uuid string throws `22P02`; we screen it out and treat it as "not found".
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One match by uuid (joined to its league title), or null if absent/invalid. */
export async function getMatchById(id: string): Promise<MatchDetail | null> {
  if (!UUID_RE.test(id)) return null;

  const [row] = await getDb()
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      commenceTime: matches.commenceTime,
      leagueKey: matches.leagueKey,
      leagueTitle: leagues.title,
    })
    .from(matches)
    .leftJoin(leagues, eq(matches.leagueKey, leagues.key))
    .where(eq(matches.id, id))
    .limit(1);

  return row ?? null;
}

// Odds are `numeric` in Postgres and come back from Drizzle as strings; this is
// the single read-side place they become numbers (mirrors `toSnapshotRows` on
// the write side — CLAUDE.md). draw can be absent, so it stays number | null.
export type MatchSnapshot = {
  bookmakerKey: string;
  bookmakerTitle: string | null;
  homeOdds: number;
  drawOdds: number | null;
  awayOdds: number;
  capturedAt: Date;
};

// The one place Drizzle's numeric strings become numbers, shared by every
// snapshot read so the string→number conversion lives in a single spot.
function toMatchSnapshot(r: {
  bookmakerKey: string;
  bookmakerTitle: string | null;
  homeOdds: string;
  drawOdds: string | null;
  awayOdds: string;
  capturedAt: Date;
}): MatchSnapshot {
  return {
    bookmakerKey: r.bookmakerKey,
    bookmakerTitle: r.bookmakerTitle,
    homeOdds: Number(r.homeOdds),
    drawOdds: r.drawOdds === null ? null : Number(r.drawOdds),
    awayOdds: Number(r.awayOdds),
    capturedAt: r.capturedAt,
  };
}

/**
 * Every snapshot for a match over time, oldest first, joined to the bookmaker
 * title. Feeds both the movement chart and (after deriving the latest row per
 * bookmaker) the comparison table, so the detail page needs only this one read.
 */
export async function getMatchSnapshots(
  matchId: string,
): Promise<MatchSnapshot[]> {
  const rows = await getDb()
    .select({
      bookmakerKey: oddsSnapshots.bookmakerKey,
      bookmakerTitle: bookmakers.title,
      homeOdds: oddsSnapshots.homeOdds,
      drawOdds: oddsSnapshots.drawOdds,
      awayOdds: oddsSnapshots.awayOdds,
      capturedAt: oddsSnapshots.capturedAt,
    })
    .from(oddsSnapshots)
    .leftJoin(bookmakers, eq(oddsSnapshots.bookmakerKey, bookmakers.key))
    .where(eq(oddsSnapshots.matchId, matchId))
    .orderBy(asc(oddsSnapshots.capturedAt));

  return rows.map(toMatchSnapshot);
}

/**
 * The latest snapshot per (match, bookmaker) for several matches at once,
 * grouped by match id — the dashboard's value engine input. `captured_at` is
 * per-bookmaker (see `toSnapshotRows`), so `DISTINCT ON (match, bookmaker)`
 * ordered by `captured_at DESC` takes each bookmaker's most recent quote
 * without pulling the full history.
 */
export async function getLatestSnapshotsForMatches(
  matchIds: string[],
): Promise<Map<string, MatchSnapshot[]>> {
  if (matchIds.length === 0) return new Map();

  const rows = await getDb()
    .selectDistinctOn([oddsSnapshots.matchId, oddsSnapshots.bookmakerKey], {
      matchId: oddsSnapshots.matchId,
      bookmakerKey: oddsSnapshots.bookmakerKey,
      bookmakerTitle: bookmakers.title,
      homeOdds: oddsSnapshots.homeOdds,
      drawOdds: oddsSnapshots.drawOdds,
      awayOdds: oddsSnapshots.awayOdds,
      capturedAt: oddsSnapshots.capturedAt,
    })
    .from(oddsSnapshots)
    .leftJoin(bookmakers, eq(oddsSnapshots.bookmakerKey, bookmakers.key))
    .where(inArray(oddsSnapshots.matchId, matchIds))
    .orderBy(
      oddsSnapshots.matchId,
      oddsSnapshots.bookmakerKey,
      desc(oddsSnapshots.capturedAt),
    );

  const byMatch = new Map<string, MatchSnapshot[]>();
  for (const r of rows) {
    const list = byMatch.get(r.matchId);
    if (list) list.push(toMatchSnapshot(r));
    else byMatch.set(r.matchId, [toMatchSnapshot(r)]);
  }
  return byMatch;
}
