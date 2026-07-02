import type { SnapshotRows } from "../lib/odds-api";
import { getDb } from "./client";
import {
  bookmakers,
  ingestionRuns,
  leagues,
  matches,
  oddsSnapshots,
} from "./schema";

/**
 * Persist normalized rows from `toSnapshotRows`. Shared by the seed script and
 * the cron snapshot route, so both write identically.
 *
 * Every insert is idempotent: reference data and matches use `onConflictDoNothing`
 * on their natural keys, and snapshots rely on the unique
 * (match_id, bookmaker_key, captured_at) index — which makes duplicate runs
 * harmless (SPEC §9). No transaction: the neon-http driver does not support them,
 * and the idempotent inserts make a partially-applied run safe to retry.
 */
export async function persistSnapshotRows(
  rows: SnapshotRows,
): Promise<{ matches: number; snapshots: number }> {
  const db = getDb();

  // Guard empty arrays — Drizzle throws on `.values([])`, which happens when the
  // API returns no events (e.g. off-season).
  if (rows.leagues.length) {
    await db.insert(leagues).values(rows.leagues).onConflictDoNothing();
  }
  if (rows.bookmakers.length) {
    await db.insert(bookmakers).values(rows.bookmakers).onConflictDoNothing();
  }
  if (rows.matches.length) {
    await db
      .insert(matches)
      .values(rows.matches)
      .onConflictDoNothing({ target: matches.externalId });
  }

  // Resolve external ids to match uuids so snapshots can reference them.
  const existing = await db
    .select({ id: matches.id, externalId: matches.externalId })
    .from(matches);
  const idByExternalId = new Map(existing.map((m) => [m.externalId, m.id]));

  const snapshotValues = rows.snapshots.flatMap((s) => {
    const matchId = idByExternalId.get(s.externalId);
    if (!matchId) return [];
    return [
      {
        matchId,
        bookmakerKey: s.bookmakerKey,
        homeOdds: s.homeOdds,
        drawOdds: s.drawOdds,
        awayOdds: s.awayOdds,
        capturedAt: s.capturedAt,
      },
    ];
  });

  if (snapshotValues.length) {
    await db.insert(oddsSnapshots).values(snapshotValues).onConflictDoNothing();
  }

  return { matches: rows.matches.length, snapshots: snapshotValues.length };
}

export type IngestionRunInput = {
  status: "ok" | "error";
  matchesSeen: number;
  snapshotsAttempted: number;
  creditsRemaining: number | null;
  creditsUsed: number | null;
  error?: string;
};

/**
 * Append one row to the pipeline's run log (`ingestion_runs`). Callers must
 * treat a failure here as non-fatal: losing a log row can never be allowed to
 * fail the snapshot itself.
 */
export async function recordIngestionRun(
  input: IngestionRunInput,
): Promise<void> {
  await getDb().insert(ingestionRuns).values({
    status: input.status,
    matchesSeen: input.matchesSeen,
    snapshotsAttempted: input.snapshotsAttempted,
    creditsRemaining: input.creditsRemaining,
    creditsUsed: input.creditsUsed,
    // Cap stored failure text; upstream error bodies can be arbitrarily long.
    error: input.error?.slice(0, 500),
  });
}
