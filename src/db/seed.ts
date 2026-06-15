import "dotenv/config";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseOddsResponse, toSnapshotRows } from "../lib/odds-api";
import { getDb } from "./client";
import { bookmakers, leagues, matches, oddsSnapshots } from "./schema";

async function seed() {
  const fixturePath = join(process.cwd(), "tests/fixtures/odds-response.json");
  const raw: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  const events = parseOddsResponse(raw);
  const rows = toSnapshotRows(events);

  const db = getDb();

  // Reference data and matches: idempotent inserts keyed by their natural keys.
  await db.insert(leagues).values(rows.leagues).onConflictDoNothing();
  await db.insert(bookmakers).values(rows.bookmakers).onConflictDoNothing();
  await db
    .insert(matches)
    .values(rows.matches)
    .onConflictDoNothing({ target: matches.externalId });

  // Resolve external ids to match uuids so snapshots can reference them.
  const existing = await db
    .select({ id: matches.id, externalId: matches.externalId })
    .from(matches);
  const idByExternalId = new Map(existing.map((m) => [m.externalId, m.id]));

  const snapshotValues = rows.snapshots.flatMap((s) => {
    const matchId = idByExternalId.get(s.externalId);
    if (!matchId) return [];
    return [
      {
        matchId,
        bookmakerKey: s.bookmakerKey,
        homeOdds: s.homeOdds,
        drawOdds: s.drawOdds,
        awayOdds: s.awayOdds,
        capturedAt: s.capturedAt,
      },
    ];
  });

  // Unique (match, bookmaker, captured_at) makes re-runs harmless.
  await db.insert(oddsSnapshots).values(snapshotValues).onConflictDoNothing();

  console.log(
    `Seeded ${rows.leagues.length} leagues, ${rows.bookmakers.length} bookmakers, ${rows.matches.length} matches, ${snapshotValues.length} snapshots.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
