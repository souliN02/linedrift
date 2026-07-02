import Link from "next/link";

import {
  MatchCard,
  RecentMatchCard,
  type DashboardMatch,
  type RecentMatch,
} from "@/components/match-card";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DashboardProps = {
  matches: DashboardMatch[];
  leagues: { key: string; title: string }[];
  activeLeague: string | null;
  lastSnapshotAt: Date | null;
  /** Recently kicked-off matches linking to their closing-line reports; the
   * section is omitted entirely when empty. */
  recentMatches?: RecentMatch[];
  /** True when `matches` are the nearest fixtures shown because the next-7-days
   * window was empty (off-season) — the list carries an explanatory note. */
  showingNextFixtures?: boolean;
  /** Injectable for deterministic "X ago" text in tests. */
  now?: Date;
};

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function Dashboard({
  matches,
  leagues,
  activeLeague,
  lastSnapshotAt,
  recentMatches = [],
  showingNextFixtures = false,
  now,
}: DashboardProps) {
  const activeLeagueTitle =
    activeLeague === null
      ? null
      : (leagues.find((l) => l.key === activeLeague)?.title ?? activeLeague);

  // No snapshot has ever run vs. a populated DB with nothing upcoming — two
  // distinct empty states (SPEC §8).
  const emptyMessage =
    lastSnapshotAt === null
      ? "First snapshot pending — the cron runs every 4 hours."
      : `No upcoming matches in the next 7 days${
          activeLeagueTitle ? ` for ${activeLeagueTitle}` : ""
        }.`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-6">
        <p className="eyebrow">Upcoming · next 7 days</p>
        <h1 className="font-heading mt-1.5 text-3xl font-bold tracking-tight">
          Match odds
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Best available 1X2 prices across EU bookmakers, with no-vig consensus
          and value flags.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              lastSnapshotAt ? "bg-primary" : "bg-muted-foreground",
            )}
          />
          {lastSnapshotAt
            ? `Last snapshot ${formatRelativeTime(lastSnapshotAt, now)}`
            : "Last snapshot pending"}
        </p>
      </header>

      <nav aria-label="Filter by league" className="mb-6 flex flex-wrap gap-2">
        <FilterLink href="/" active={activeLeague === null}>
          All
        </FilterLink>
        {leagues.map((league) => (
          <FilterLink
            key={league.key}
            href={`/?league=${league.key}`}
            active={activeLeague === league.key}
          >
            {league.title}
          </FilterLink>
        ))}
      </nav>

      {matches.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <>
          {showingNextFixtures && (
            <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              No matches in the next 7 days — showing the next scheduled fixtures.
            </p>
          )}
          <ul className="space-y-2">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </ul>
        </>
      )}

      {recentMatches.length > 0 && (
        <section className="mt-10">
          <p className="eyebrow">Recently closed</p>
          <h2 className="font-heading mt-1.5 text-xl font-bold tracking-tight">
            Closing line reports
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How every pre-kickoff price compared to the closing line.
          </p>
          <ul className="mt-4 space-y-2">
            {recentMatches.map((match) => (
              <RecentMatchCard key={match.id} match={match} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
