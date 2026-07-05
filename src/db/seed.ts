import "dotenv/config";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseOddsResponse, toSnapshotRows } from "../lib/odds-api";
import { persistSnapshotRows } from "./ingest";

// `--history` (pnpm db:seed:history) additionally replays
// tests/fixtures/odds-history.json — four synthetic pre-kickoff runs for two of
// the base matches — so movement charts and closing-line reports have real
// drift to show in local dev. Either way the pipeline is identical to the cron
// route and the live API is never called (SPEC §4).
async function seedFixture(fixture: string): Promise<void> {
  const raw: unknown = JSON.parse(
    readFileSync(join(process.cwd(), "tests/fixtures", fixture), "utf8"),
  );
  const rows = toSnapshotRows(parseOddsResponse(raw));
  const { matches, snapshots } = await persistSnapshotRows(rows);

  console.log(
    `Seeded ${fixture}: ${rows.leagues.length} leagues, ${rows.bookmakers.length} bookmakers, ${matches} matches, ${snapshots} snapshots.`,
  );
}

async function seed() {
  await seedFixture("odds-response.json");
  if (process.argv.includes("--history")) {
    await seedFixture("odds-history.json");
  }
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
