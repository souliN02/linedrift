import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

let cached: Db | undefined;

/**
 * Lazily create and cache the Drizzle client.
 *
 * The connection is created on first use rather than at module import, so
 * `next build` (and CI) never require DATABASE_URL — only requests and the
 * seed/migrate scripts touch the database.
 */
export function getDb(): Db {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.",
    );
  }

  cached = drizzle(neon(url), { schema });
  return cached;
}
