import { Dashboard } from "@/components/dashboard";
import {
  getBookmakerCounts,
  getLastSnapshotAt,
  getLeagues,
  getUpcomingMatches,
} from "@/db/queries";

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
  const counts = await getBookmakerCounts(matches.map((m) => m.id));

  const dashboardMatches = matches.map((m) => ({
    ...m,
    bookmakerCount: counts.get(m.id) ?? 0,
  }));

  return (
    <Dashboard
      matches={dashboardMatches}
      leagues={leagues}
      activeLeague={activeLeague}
      lastSnapshotAt={lastSnapshotAt}
    />
  );
}
