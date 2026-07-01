import { Dashboard } from "@/components/dashboard";
import {
  getLastSnapshotAt,
  getLatestSnapshotsForMatches,
  getLeagues,
  getUpcomingMatches,
} from "@/db/queries";
import { summarizeMatch } from "@/lib/odds-math";

// Reads the database per request — never prerendered at build time, so
// `next build` / CI do not need DATABASE_URL.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ league?: string | string[] }>;
}) {
  const { league } = await searchParams;
  const leagueParam = Array.isArray(league) ? league[0] : league;

  const [leagues, lastSnapshotAt] = await Promise.all([
    getLeagues(),
    getLastSnapshotAt(),
  ]);

  // Only honor a league filter that maps to a known league; otherwise show all.
  const activeLeague =
    leagueParam && leagues.some((l) => l.key === leagueParam)
      ? leagueParam
      : null;

  const matches = await getUpcomingMatches({
    leagueKey: activeLeague ?? undefined,
  });
  const latestByMatch = await getLatestSnapshotsForMatches(
    matches.map((m) => m.id),
  );

  const dashboardMatches = matches.map((m) => {
    const summary = summarizeMatch(latestByMatch.get(m.id) ?? []);
    return {
      ...m,
      bookmakerCount: summary.bookmakerCount,
      best: summary.best,
      lowestOverround: summary.lowestOverround,
      bestEdges: summary.bestEdges,
      value: summary.value,
    };
  });

  return (
    <Dashboard
      matches={dashboardMatches}
      leagues={leagues}
      activeLeague={activeLeague}
      lastSnapshotAt={lastSnapshotAt}
    />
  );
}
