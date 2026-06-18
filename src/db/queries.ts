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
 * For each given match, how many bookmakers are present in its *latest*
 * snapshot set (the rows sharing that match's most recent `captured_at`).
 *
 * One grouped query returns the distinct-bookmaker count per
 * (match, captured_at); we reduce in JS to the latest captured_at per match.
 * Snapshot volumes are tiny for the MVP, so this avoids a window/CTE.
 */
export async function getLatestBookmakerCounts(
  matchIds: string[],
): Promise<Map<string, number>> {
  if (matchIds.length === 0) return new Map();

  const rows = await getDb()
    .select({
      matchId: oddsSnapshots.matchId,
      capturedAt: oddsSnapshots.capturedAt,
      bookmakerCount: countDistinct(oddsSnapshots.bookmakerKey),
    })
    .from(oddsSnapshots)
    .where(inArray(oddsSnapshots.matchId, matchIds))
    .groupBy(oddsSnapshots.matchId, oddsSnapshots.capturedAt);

  const latest = new Map<string, { capturedAt: Date; count: number }>();
  for (const row of rows) {
    const prev = latest.get(row.matchId);
    if (!prev || row.capturedAt.getTime() > prev.capturedAt.getTime()) {
      latest.set(row.matchId, {
        capturedAt: row.capturedAt,
        count: row.bookmakerCount,
      });
    }
  }

  return new Map([...latest].map(([id, v]) => [id, v.count]));
}
