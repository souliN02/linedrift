import { persistSnapshotRows } from "@/db/ingest";
import {
  fetchOdds,
  SPORT_KEYS,
  toSnapshotRows,
  type OddsEvent,
} from "@/lib/odds-api";

// Mutating route: never prerendered, runs on Node, and may take a few seconds to
// fetch both leagues and write to Neon.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/snapshot — the only mutating endpoint (SPEC §9). Protected by a
 * bearer secret. Fetches h2h odds for both leagues, validates + upserts, logs the
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

  try {
    const events: OddsEvent[] = [];
    let creditsRemaining: number | null = null;

    for (const sportKey of SPORT_KEYS) {
      const result = await fetchOdds(sportKey);
      events.push(...result.events);
      creditsRemaining = result.creditsRemaining;
      console.log(
        `[snapshot] ${sportKey}: ${result.events.length} events, credits remaining=${result.creditsRemaining} used=${result.creditsUsed}`,
      );
    }

    const rows = toSnapshotRows(events);
    const { matches, snapshots } = await persistSnapshotRows(rows);
    console.log(
      `[snapshot] persisted ${matches} matches, ${snapshots} snapshots`,
    );

    return Response.json({ matches, snapshots, creditsRemaining });
  } catch (err) {
    console.error("[snapshot] failed:", err);
    return Response.json({ error: "Snapshot failed" }, { status: 502 });
  }
}
