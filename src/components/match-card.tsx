import { formatKickoff } from "@/lib/format";

// View model for one dashboard row. Phase 3 shows non-math data only; best
// odds, overround, and value badges are layered on in Phase 5.
export type DashboardMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  leagueKey: string;
  leagueTitle: string | null;
  bookmakerCount: number;
};

export function MatchCard({ match }: { match: DashboardMatch }) {
  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3">
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
          <span className="text-xs text-muted-foreground">
            {match.bookmakerCount}{" "}
            {match.bookmakerCount === 1 ? "bookmaker" : "bookmakers"}
          </span>
        </div>
      </div>
    </li>
  );
}
