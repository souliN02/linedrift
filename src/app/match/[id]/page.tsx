import Link from "next/link";
import { notFound } from "next/navigation";

import { BookmakerTable } from "@/components/bookmaker-table";
import { OddsChart } from "@/components/odds-chart";
import { getMatchById, getMatchSnapshots } from "@/db/queries";
import { formatKickoff } from "@/lib/format";
import { latestByBookmaker, toChartSeries } from "@/lib/match-history";
import { bestPrices, consensusProbabilities, enrichRows } from "@/lib/odds-math";

// Reads the database per request — never prerendered, so `next build` / CI do
// not need DATABASE_URL (matches the dashboard).
export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const match = await getMatchById(id);
  if (!match) notFound();

  // One read feeds both the chart (full history) and the table (latest per
  // bookmaker, derived in-memory) — no second query.
  const snapshots = await getMatchSnapshots(match.id);
  const latest = latestByBookmaker(snapshots);

  // Value engine (odds-math): consensus + best prices drive the enriched rows
  // the table renders. Components stay math-free (CLAUDE.md).
  const consensus = consensusProbabilities(latest);
  const best = bestPrices(latest);
  const rows = enrichRows(latest, consensus, best);

  const series = {
    home: toChartSeries(snapshots, "home"),
    draw: toChartSeries(snapshots, "draw"),
    away: toChartSeries(snapshots, "away"),
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/"
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to dashboard
      </Link>

      <header className="mt-3 mb-8">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {match.homeTeam}{" "}
          <span className="font-normal text-muted-foreground">v</span>{" "}
          {match.awayTeam}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {match.leagueTitle ?? match.leagueKey}
        </p>
        <time
          dateTime={match.commenceTime.toISOString()}
          className="mt-0.5 block text-xs text-muted-foreground"
        >
          {formatKickoff(match.commenceTime)}
        </time>
      </header>

      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No odds captured yet — the cron runs every 3 hours.
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold">Odds movement</h2>
            <OddsChart
              series={series}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold">Latest odds</h2>
            <BookmakerTable rows={rows} consensus={consensus} />
          </section>
        </div>
      )}
    </main>
  );
}
