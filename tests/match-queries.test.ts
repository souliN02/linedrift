import { describe, expect, it } from "vitest";

import { getMatchById } from "@/db/queries";

// The uuid guard short-circuits before any DB connection is created, so this
// needs no DATABASE_URL — a bad id is treated as "not found", never a 22P02.
describe("getMatchById uuid guard", () => {
  it.each(["not-a-uuid", "", "123", "11111111-1111-1111-1111-11111111111"])(
    "returns null for the invalid id %j without hitting the database",
    async (id) => {
      await expect(getMatchById(id)).resolves.toBeNull();
    },
  );
});
