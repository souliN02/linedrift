import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/matches/[id]/history/route";
import { getMatchById, getMatchSnapshots } from "@/db/queries";

// The route must never touch the DB in tests: the query layer is mocked, exactly
// like snapshot-route.test.ts mocks @/db/ingest. The shaping (toChartSeries) runs
// for real so the response shape is asserted end to end.
vi.mock("@/db/queries", () => ({
  getMatchById: vi.fn(),
  getMatchSnapshots: vi.fn(),
}));

const MATCH_ID = "11111111-1111-1111-1111-111111111111";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function request() {
  return new Request(`https://example.com/api/matches/${MATCH_ID}/history`);
}

const match = {
  id: MATCH_ID,
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  commenceTime: new Date("2026-06-19T18:00:00Z"),
  leagueKey: "soccer_epl",
  leagueTitle: "Premier League",
};

describe("GET /api/matches/[id]/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for an unknown match and never queries snapshots", async () => {
    vi.mocked(getMatchById).mockResolvedValue(null);

    const res = await GET(request(), ctx("missing"));

    expect(res.status).toBe(404);
    expect(getMatchSnapshots).not.toHaveBeenCalled();
  });

  it("returns the match and chart-ready series for the three outcomes", async () => {
    vi.mocked(getMatchById).mockResolvedValue(match);
    vi.mocked(getMatchSnapshots).mockResolvedValue([
      {
        bookmakerKey: "pinnacle",
        bookmakerTitle: "Pinnacle",
        homeOdds: 2.07,
        drawOdds: 3.55,
        awayOdds: 3.65,
        capturedAt: new Date("2026-06-15T09:00:00Z"),
      },
    ]);

    const res = await GET(request(), ctx(MATCH_ID));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.match.homeTeam).toBe("Arsenal");
    expect(body.series.home.bookmakers).toEqual([
      { key: "pinnacle", title: "Pinnacle" },
    ]);
    expect(body.series.home.points).toEqual([
      { t: Date.parse("2026-06-15T09:00:00Z"), pinnacle: 2.07 },
    ]);
    // Draw price present too.
    expect(body.series.draw.points).toEqual([
      { t: Date.parse("2026-06-15T09:00:00Z"), pinnacle: 3.55 },
    ]);
  });

  it("returns 502 when the query layer throws", async () => {
    vi.mocked(getMatchById).mockRejectedValue(new Error("db down"));

    const res = await GET(request(), ctx(MATCH_ID));
    expect(res.status).toBe(502);
  });
});
