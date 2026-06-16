import "dotenv/config";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseOddsResponse, toSnapshotRows } from "../lib/odds-api";
import { persistSnapshotRows } from "./ingest";

async function seed() {
  const fixturePath = join(process.cwd(), "tests/fixtures/odds-response.json");
  const raw: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  const events = parseOddsResponse(raw);
  const rows = toSnapshotRows(events);

  const { matches, snapshots } = await persistSnapshotRows(rows);

  console.log(
    `Seeded ${rows.leagues.length} leagues, ${rows.bookmakers.length} bookmakers, ${matches} matches, ${snapshots} snapshots.`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
