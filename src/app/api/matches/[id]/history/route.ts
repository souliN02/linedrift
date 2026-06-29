import { getMatchById, getMatchSnapshots } from "@/db/queries";
import { toChartSeries } from "@/lib/match-history";

// Reads the DB per request; never prerendered.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/matches/[id]/history — chart-ready odds series for the detail page
 * (SPEC §9). The page itself reads the DB directly in its server component; this
 * endpoint exposes the same shaped data over HTTP, reusing `getMatchSnapshots` +
 * `toChartSeries` so there is one source of truth. 404 for an unknown/invalid id.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  try {
    const match = await getMatchById(id);
    if (!match) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }

    const snapshots = await getMatchSnapshots(match.id);

    return Response.json({
      match,
      series: {
        home: toChartSeries(snapshots, "home"),
        draw: toChartSeries(snapshots, "draw"),
        away: toChartSeries(snapshots, "away"),
      },
    });
  } catch (err) {
    console.error("[matches/history] failed:", err);
    return Response.json({ error: "History lookup failed" }, { status: 502 });
  }
}
