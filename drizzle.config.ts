import "dotenv/config";

import { defineConfig } from "drizzle-kit";

// `generate` is offline and needs no connection; only `migrate`/`push` use the
// url, and drizzle-kit reports a clear error if it is empty at that point.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
