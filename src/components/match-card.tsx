import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatKickoff, formatPercent, formatSignedPercent } from "@/lib/format";
import type { BestPrice, BestPrices, OutcomeEdges, OutcomeFlags } from "@/lib/odds-math";

// View model for one dashboard row. The page precomputes the value-engine
// figures (odds-math) so this component stays render-only (CLAUDE.md).
export type DashboardMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  leagueKey: string;
  leagueTitle: string | null;
  bookmakerCount: number;
  best: BestPrices;
  lowestOverround: number | null;
  bestEdges: OutcomeEdges;
  value: OutcomeFlags;
};

function OutcomeCell({
  label,
  best,
  edge,
  isValue,
}: {
  label: string;
  best: BestPrice | null;
  edge: number | null;
  isValue: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[0.65rem] text-muted-foreground">{label}</span>
        {isValue && edge !== null && (
          <Badge variant="value">{formatSignedPercent(edge)}</Badge>
        )}
      </div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">
        {best === null ? "—" : best.price.toFixed(2)}
      </div>
      <div className="truncate text-[0.65rem] text-muted-foreground">
        {best?.bookmakerTitle ?? " "}
      </div>
    </div>
  );
}

// A finished match in the "Recently closed" list: no live prices to show, just
// the fixture and a pointer to its closing-line report.
export type RecentMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  leagueKey: string;
  leagueTitle: string | null;
};

export function RecentMatchCard({ match }: { match: RecentMatch }) {
  return (
    <li>
      <Link
        href={`/match/${match.id}`}
        className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {match.homeTeam} <span className="text-muted-foreground">v</span>{" "}
            {match.awayTeam}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {match.leagueTitle ?? match.leagueKey} · kicked off{" "}
            {formatKickoff(match.commenceTime)}
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          Closing line report →
        </span>
      </Link>
    </li>
  );
}

export function MatchCard({ match }: { match: DashboardMatch }) {
  const hasOdds =
    match.best.home !== null ||
    match.best.draw !== null ||
    match.best.away !== null;

  return (
    <li>
      <Link
        href={`/match/${match.id}`}
        className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {match.homeTeam} <span className="text-muted-foreground">v</span>{" "}
              {match.awayTeam}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {match.leagueTitle ?? match.leagueKey}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-0.5">
            <time
              dateTime={match.commenceTime.toISOString()}
              className="text-xs text-muted-foreground"
            >
              {formatKickoff(match.commenceTime)}
            </time>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {match.bookmakerCount}{" "}
              {match.bookmakerCount === 1 ? "bookmaker" : "bookmakers"}
              {match.lowestOverround !== null && (
                <span aria-label="Lowest overround">
                  · vig {formatPercent(match.lowestOverround)}
                </span>
              )}
            </span>
          </div>
        </div>

        {hasOdds && (
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <OutcomeCell
              label="Home"
              best={match.best.home}
              edge={match.bestEdges.home}
              isValue={match.value.home}
            />
            <OutcomeCell
              label="Draw"
              best={match.best.draw}
              edge={match.bestEdges.draw}
              isValue={match.value.draw}
            />
            <OutcomeCell
              label="Away"
              best={match.best.away}
              edge={match.bestEdges.away}
              isValue={match.value.away}
            />
          </div>
        )}
      </Link>
    </li>
  );
}
