import {
  bigserial,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// The Odds API sport key, e.g. "soccer_epl".
export const leagues = pgTable("leagues", {
  key: text("key").primaryKey(),
  title: text("title").notNull(),
});

// The Odds API bookmaker key, e.g. "bet365".
export const bookmakers = pgTable("bookmakers", {
  key: text("key").primaryKey(),
  title: text("title").notNull(),
});

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull().unique(),
    leagueKey: text("league_key")
      .notNull()
      .references(() => leagues.key),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    commenceTime: timestamp("commence_time", { withTimezone: true }).notNull(),
  },
  (t) => [index("matches_commence_time_idx").on(t.commenceTime)],
);

export const oddsSnapshots = pgTable(
  "odds_snapshots",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id),
    bookmakerKey: text("bookmaker_key")
      .notNull()
      .references(() => bookmakers.key),
    // Odds are numeric in Postgres and come back as strings from Drizzle;
    // convert to number only at the math/display layer. draw_odds is nullable
    // to tolerate a bookmaker that omits the draw price (SPEC §7 edge case).
    homeOdds: numeric("home_odds", { precision: 7, scale: 3 }).notNull(),
    drawOdds: numeric("draw_odds", { precision: 7, scale: 3 }),
    awayOdds: numeric("away_odds", { precision: 7, scale: 3 }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("odds_snapshots_match_captured_idx").on(t.matchId, t.capturedAt),
    uniqueIndex("odds_snapshots_match_bookmaker_captured_uq").on(
      t.matchId,
      t.bookmakerKey,
      t.capturedAt,
    ),
  ],
);

// One row per snapshot cron run — the pipeline's own operational log, written
// by the snapshot route and surfaced on /about. Append-only; failed runs are
// recorded too (with `error`), since a run that failed may still have spent
// credits.
export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ranAt: timestamp("ran_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status", { enum: ["ok", "error"] }).notNull(),
    matchesSeen: integer("matches_seen").notNull().default(0),
    // Insert-attempt count from persistSnapshotRows: rows skipped by the
    // idempotent unique index (duplicate re-runs) are still counted.
    snapshotsAttempted: integer("snapshots_attempted").notNull().default(0),
    // From The Odds API x-requests-* headers; null when no call returned them.
    creditsRemaining: integer("credits_remaining"),
    creditsUsed: integer("credits_used"),
    error: text("error"),
  },
  (t) => [index("ingestion_runs_ran_at_idx").on(t.ranAt)],
);

export type League = typeof leagues.$inferSelect;
export type Bookmaker = typeof bookmakers.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type OddsSnapshot = typeof oddsSnapshots.$inferSelect;
export type IngestionRun = typeof ingestionRuns.$inferSelect;
