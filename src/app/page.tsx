import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { leagues, matches } from "@/db/schema";

// Reads the database per request — never prerendered at build time, so
// `next build` / CI do not need DATABASE_URL.
export const dynamic = "force-dynamic";

const kickoffFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function Home() {
  const rows = await getDb()
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      commenceTime: matches.commenceTime,
      leagueKey: matches.leagueKey,
      leagueTitle: leagues.title,
    })
    .from(matches)
    .leftJoin(leagues, eq(matches.leagueKey, leagues.key))
    .orderBy(asc(matches.commenceTime));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          OddsLens
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming matches</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No matches yet — run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            pnpm db:seed
          </code>{" "}
          to load fixture data.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {m.homeTeam} <span className="text-muted-foreground">v</span>{" "}
                  {m.awayTeam}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {m.leagueTitle ?? m.leagueKey}
                </div>
              </div>
              <time
                dateTime={m.commenceTime.toISOString()}
                className="shrink-0 text-right text-xs text-muted-foreground"
              >
                {kickoffFormatter.format(m.commenceTime)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
