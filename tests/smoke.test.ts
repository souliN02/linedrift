import { describe, expect, it } from "vitest";

// Phase 0 placeholder: proves the Vitest pipeline runs in CI.
// Real coverage (odds math, schemas, routes) arrives in later phases.
describe("smoke", () => {
  it("runs the test suite", () => {
    expect(1 + 1).toBe(2);
  });
});
