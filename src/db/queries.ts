import {
  and,
  asc,
  countDistinct,
  eq,
  gte,
  inArray,
  lte,
  max,
} from "drizzle-orm";

import { getDb } from "./client";
import { leagues, matches, oddsSnapshots } from "./schema";

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

/**
 * For each given match, how many distinct bookmakers have quoted it.
 *
 * `captured_at` is per-bookmaker (each row stores that bookmaker's
 * `last_update`, not a single run timestamp — see `toSnapshotRows`), so there
 * is no shared "latest snapshot" instant to group on. Counting distinct
 * bookmaker keys per match gives the real coverage figure.
 */
export async function getBookmakerCounts(
  matchIds: string[],
): Promise<Map<string, number>> {
  if (matchIds.length === 0) return new Map();

  const rows = await getDb()
    .select({
      matchId: oddsSnapshots.matchId,
      bookmakerCount: countDistinct(oddsSnapshots.bookmakerKey),
    })
    .from(oddsSnapshots)
    .where(inArray(oddsSnapshots.matchId, matchIds))
    .groupBy(oddsSnapshots.matchId);

  return new Map(rows.map((row) => [row.matchId, row.bookmakerCount]));
}
