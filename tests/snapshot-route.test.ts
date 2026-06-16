import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/cron/snapshot/route";
import { persistSnapshotRows } from "@/db/ingest";
import { SPORT_KEYS } from "@/lib/odds-api";
import fixture from "./fixtures/odds-response.json";

// The route must never touch the DB or the live API in tests (SPEC §4):
// persistence is mocked and global fetch is spied per case.
vi.mock("@/db/ingest", () => ({
  persistSnapshotRows: vi.fn(),
}));

const SECRET = "test-secret";

function postRequest(headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/cron/snapshot", {
    method: "POST",
    headers,
  });
}

function fixtureResponse() {
  return new Response(JSON.stringify(fixture), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "x-requests-remaining": "476",
      "x-requests-used": "24",
    },
  });
}

describe("POST /api/cron/snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("ODDS_API_KEY", "test-key");
    vi.mocked(persistSnapshotRows).mockResolvedValue({
      matches: 6,
      snapshots: 20,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects a request with no authorization header (401)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await POST(postRequest());

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(persistSnapshotRows).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token (401)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await POST(postRequest({ authorization: "Bearer wrong" }));

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(persistSnapshotRows).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await POST(postRequest({ authorization: "Bearer anything" }));

    expect(res.status).toBe(500);
    expect(persistSnapshotRows).not.toHaveBeenCalled();
  });

  it("fetches both leagues, persists, and reports credits remaining", async () => {
    // Fresh Response per call — a body can only be read once.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => fixtureResponse());

    const res = await POST(postRequest({ authorization: `Bearer ${SECRET}` }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      matches: 6,
      snapshots: 20,
      creditsRemaining: 476,
    });
    // One API call per sport key.
    expect(fetchSpy).toHaveBeenCalledTimes(SPORT_KEYS.length);
    expect(persistSnapshotRows).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when the upstream fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    const res = await POST(postRequest({ authorization: `Bearer ${SECRET}` }));

    expect(res.status).toBe(502);
    expect(persistSnapshotRows).not.toHaveBeenCalled();
  });
});
