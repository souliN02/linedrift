import {
  persistSnapshotRows,
  recordIngestionRun,
  type IngestionRunInput,
} from "@/db/ingest";
import {
  fetchOdds,
  SPORT_KEYS,
  toSnapshotRows,
  type OddsEvent,
} from "@/lib/odds-api";

// Mutating route: never prerendered, runs on Node, and may take a few seconds to
// fetch every configured league and write to Neon.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/snapshot — the only mutating endpoint (SPEC §9). Protected by a
 * bearer secret. Fetches h2h odds for every configured league, validates + upserts, logs the
 * remaining API credits, and returns a summary. Safe to retry: the unique
 * snapshot index makes duplicate runs harmless.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[snapshot] CRON_SECRET is not configured");
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Hoisted so the catch can log whatever credit headers were seen before the
  // failure — a run that failed halfway may still have spent credits.
  let creditsRemaining: number | null = null;
  let creditsUsed: number | null = null;

  try {
    const events: OddsEvent[] = [];

    for (const sportKey of SPORT_KEYS) {
      const result = await fetchOdds(sportKey);
      events.push(...result.events);
      // Keep the last non-null header pair: the calls run sequentially, so the
      // most recent value is also the lowest remaining count. A response
      // without the headers must not wipe an earlier reading.
      creditsRemaining = result.creditsRemaining ?? creditsRemaining;
      creditsUsed = result.creditsUsed ?? creditsUsed;
      console.log(
        `[snapshot] ${sportKey}: ${result.events.length} events, credits remaining=${result.creditsRemaining} used=${result.creditsUsed}`,
      );
    }

    const rows = toSnapshotRows(events);
    const { matches, snapshots } = await persistSnapshotRows(rows);
    console.log(
      `[snapshot] persisted ${matches} matches, ${snapshots} snapshots`,
    );

    await recordRun({
      status: "ok",
      matchesSeen: matches,
      snapshotsAttempted: snapshots,
      creditsRemaining,
      creditsUsed,
    });

    return Response.json({ matches, snapshots, creditsRemaining });
  } catch (err) {
    console.error("[snapshot] failed:", err);
    await recordRun({
      status: "error",
      matchesSeen: 0,
      snapshotsAttempted: 0,
      creditsRemaining,
      creditsUsed,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: "Snapshot failed" }, { status: 502 });
  }
}

// Best-effort run log: a failed insert is logged and swallowed so it can never
// turn a successful snapshot into a 5xx (or mask the original failure).
async function recordRun(input: IngestionRunInput): Promise<void> {
  try {
    await recordIngestionRun(input);
  } catch (err) {
    console.error("[snapshot] failed to record ingestion run:", err);
  }
}
