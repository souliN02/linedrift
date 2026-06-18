import Link from "next/link";

import { MatchCard, type DashboardMatch } from "@/components/match-card";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DashboardProps = {
  matches: DashboardMatch[];
  leagues: { key: string; title: string }[];
  activeLeague: string | null;
  lastSnapshotAt: Date | null;
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
      ? "First snapshot pending — the cron runs every 3 hours."
      : `No upcoming matches in the next 7 days${
          activeLeagueTitle ? ` for ${activeLeagueTitle}` : ""
        }.`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          OddsLens
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming matches · next 7 days
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {lastSnapshotAt
            ? `Last snapshot: ${formatRelativeTime(lastSnapshotAt, now)}`
            : "Last snapshot: pending"}
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
        <ul className="space-y-2">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </ul>
      )}
    </main>
  );
}
