import { z } from "zod";

/**
 * The boundary for The Odds API. This is the only module that knows the
 * external JSON shape: everything else consumes the validated, normalized rows
 * returned by `toSnapshotRows`. Phase 1 ships the schema + transform (used by
 * the seed); Phase 2 adds the live `fetch` client + cron route on top.
 */

const outcomeSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
});

const marketSchema = z.object({
  key: z.string(),
  last_update: z.string(),
  outcomes: z.array(outcomeSchema),
});

const bookmakerSchema = z.object({
  key: z.string(),
  title: z.string(),
  last_update: z.string(),
  markets: z.array(marketSchema),
});

const eventSchema = z.object({
  id: z.string(),
  sport_key: z.string(),
  sport_title: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(bookmakerSchema),
});

export const oddsResponseSchema = z.array(eventSchema);

export type OddsEvent = z.infer<typeof eventSchema>;

/** Validate a raw `/odds` payload. Throws (ZodError) on a malformed shape. */
export function parseOddsResponse(raw: unknown): OddsEvent[] {
  return oddsResponseSchema.parse(raw);
}

export type LeagueRow = { key: string; title: string };
export type BookmakerRow = { key: string; title: string };
export type MatchRow = {
  externalId: string;
  leagueKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
};
// Snapshots reference their match by externalId; the seed resolves it to the
// match uuid after inserting matches. Odds are strings for the numeric columns.
export type SnapshotRow = {
  externalId: string;
  bookmakerKey: string;
  homeOdds: string;
  drawOdds: string | null;
  awayOdds: string;
  capturedAt: Date;
};

export type SnapshotRows = {
  leagues: LeagueRow[];
  bookmakers: BookmakerRow[];
  matches: MatchRow[];
  snapshots: SnapshotRow[];
};

function priceFor(
  outcomes: { name: string; price: number }[],
  name: string,
): number | undefined {
  return outcomes.find((o) => o.name === name)?.price;
}

/**
 * Normalize validated events into deduped rows for the DB layer. Considers only
 * the `h2h` market; the conversion of odds numbers to strings happens here and
 * nowhere else (CLAUDE.md). A bookmaker missing the home or away price is
 * skipped; a missing draw price is stored as null.
 */
export function toSnapshotRows(events: OddsEvent[]): SnapshotRows {
  const leagues = new Map<string, LeagueRow>();
  const bookmakers = new Map<string, BookmakerRow>();
  const matches: MatchRow[] = [];
  const snapshots: SnapshotRow[] = [];

  for (const event of events) {
    leagues.set(event.sport_key, {
      key: event.sport_key,
      title: event.sport_title,
    });
    matches.push({
      externalId: event.id,
      leagueKey: event.sport_key,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: new Date(event.commence_time),
    });

    for (const bookmaker of event.bookmakers) {
      const h2h = bookmaker.markets.find((m) => m.key === "h2h");
      if (!h2h) continue;

      const home = priceFor(h2h.outcomes, event.home_team);
      const away = priceFor(h2h.outcomes, event.away_team);
      if (home === undefined || away === undefined) continue;
      const draw = priceFor(h2h.outcomes, "Draw");

      bookmakers.set(bookmaker.key, {
        key: bookmaker.key,
        title: bookmaker.title,
      });
      snapshots.push({
        externalId: event.id,
        bookmakerKey: bookmaker.key,
        homeOdds: String(home),
        drawOdds: draw === undefined ? null : String(draw),
        awayOdds: String(away),
        capturedAt: new Date(bookmaker.last_update),
      });
    }
  }

  return {
    leagues: [...leagues.values()],
    bookmakers: [...bookmakers.values()],
    matches,
    snapshots,
  };
}
