import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { BookmakerTable } from "@/components/bookmaker-table";
import { ClosingLinePanel } from "@/components/closing-line-panel";
import { OddsChart } from "@/components/odds-chart";
import { getMatchById, getMatchSnapshots } from "@/db/queries";
import { formatKickoff } from "@/lib/format";
import {
  latestByBookmaker,
  openCloseByBookmaker,
  toChartSeries,
} from "@/lib/match-history";
import {
  bestPrices,
  biggestClvMove,
  clvRows,
  consensusProbabilities,
  enrichRows,
} from "@/lib/odds-math";

// Reads the database per request — never prerendered, so `next build` / CI do
// not need DATABASE_URL (matches the dashboard).
export const dynamic = "force-dynamic";

// Deduped so generateMetadata and the page share a single query per request.
const loadMatch = cache(getMatchById);

// Request-time clock, outside the component render path (react-hooks/purity):
// the page is force-dynamic, so "has kicked off" is evaluated per request the
// same way the queries default their `now`.
function hasKickedOff(commenceTime: Date): boolean {
  return commenceTime.getTime() <= Date.now();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await loadMatch(id);
  // Malformed ids are already given a real 404 by proxy.ts; a well-formed
  // but unknown uuid renders the not-found UI here. (Under Next's streaming this
  // is a soft 200 — the framework cannot set 404 once the body has started.)
  if (!match) notFound();

  const fixture = `${match.homeTeam} v ${match.awayTeam}`;
  return {
    title: fixture,
    description: `Odds movement and no-vig consensus for ${fixture} — ${
      match.leagueTitle ?? match.leagueKey
    }.`,
    openGraph: { title: `${fixture} · LineDrift` },
  };
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const match = await loadMatch(id);
  if (!match) notFound();

  // One read feeds the chart (full history), the table, and the closing-line
  // report (both derived in-memory) — no second query.
  const snapshots = await getMatchSnapshots(match.id);

  // A finished match is graded against the closing line: the table shows each
  // bookmaker's last pre-kickoff quote ("latest" would be in-play prices, which
  // the cron keeps capturing), and the closing-line panel grades openers
  // against the close. If nothing pre-kickoff was captured, fall back to the
  // plain latest set.
  const isPast = hasKickedOff(match.commenceTime);
  const lines = isPast
    ? openCloseByBookmaker(snapshots, match.commenceTime)
    : [];
  const hasClosing = lines.length > 0;
  const latest = hasClosing
    ? lines.map((l) => l.closing)
    : latestByBookmaker(snapshots);

  // Value engine (odds-math): consensus + best prices drive the enriched rows
  // the table renders. Components stay math-free (CLAUDE.md).
  const consensus = consensusProbabilities(latest);
  const best = bestPrices(latest);
  const rows = enrichRows(latest, consensus, best);

  const clvTable = clvRows(lines);
  const headline = biggestClvMove(clvTable);

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
        <p className="eyebrow">{match.leagueTitle ?? match.leagueKey}</p>
        <h1 className="font-heading mt-1.5 text-2xl font-bold tracking-tight">
          {match.homeTeam}{" "}
          <span className="font-normal text-muted-foreground">v</span>{" "}
          {match.awayTeam}
        </h1>
        <time
          dateTime={match.commenceTime.toISOString()}
          className="mt-1 block text-xs text-muted-foreground"
        >
          {formatKickoff(match.commenceTime)}
        </time>
      </header>

      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No odds captured yet — the cron runs every 4 hours.
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold">Odds movement</h2>
            <OddsChart
              series={series}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              kickoffMs={isPast ? match.commenceTime.getTime() : undefined}
            />
          </section>

          {isPast && (
            <section>
              <h2 className="mb-3 text-sm font-semibold">Closing line</h2>
              <ClosingLinePanel
                rows={clvTable}
                consensus={hasClosing ? consensus : null}
                headline={headline}
              />
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold">
              {hasClosing ? "Closing odds" : "Latest odds"}
            </h2>
            <BookmakerTable rows={rows} consensus={consensus} />
          </section>
        </div>
      )}
    </main>
  );
}
