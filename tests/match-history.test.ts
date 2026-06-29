import { describe, expect, it } from "vitest";

import type { MatchSnapshot } from "@/db/queries";
import { latestByBookmaker, toChartSeries } from "@/lib/match-history";

function snap(over: {
  bookmakerKey: string;
  capturedAt: string;
  bookmakerTitle?: string | null;
  homeOdds?: number;
  drawOdds?: number | null;
  awayOdds?: number;
}): MatchSnapshot {
  return {
    bookmakerKey: over.bookmakerKey,
    bookmakerTitle:
      "bookmakerTitle" in over
        ? (over.bookmakerTitle ?? null)
        : over.bookmakerKey.toUpperCase(),
    homeOdds: over.homeOdds ?? 2.0,
    drawOdds: over.drawOdds === undefined ? 3.3 : over.drawOdds,
    awayOdds: over.awayOdds ?? 3.6,
    capturedAt: new Date(over.capturedAt),
  };
}

const T1 = "2026-06-15T09:00:00Z";
const T2 = "2026-06-15T12:00:00Z";
const T3 = "2026-06-15T15:00:00Z";

describe("latestByBookmaker", () => {
  it("keeps only the most recent snapshot per bookmaker", () => {
    const latest = latestByBookmaker([
      snap({ bookmakerKey: "a", capturedAt: T1, homeOdds: 2.0 }),
      snap({ bookmakerKey: "a", capturedAt: T2, homeOdds: 2.1 }),
    ]);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.homeOdds).toBe(2.1);
  });

  it("returns one row per bookmaker, sorted by display title", () => {
    const latest = latestByBookmaker([
      snap({ bookmakerKey: "z", bookmakerTitle: "Zulu", capturedAt: T1 }),
      snap({ bookmakerKey: "a", bookmakerTitle: "Alpha", capturedAt: T1 }),
    ]);
    expect(latest.map((s) => s.bookmakerKey)).toEqual(["a", "z"]);
  });

  it("handles a single bookmaker", () => {
    const latest = latestByBookmaker([
      snap({ bookmakerKey: "x", capturedAt: T1 }),
    ]);
    expect(latest).toHaveLength(1);
    expect(latest[0]?.bookmakerKey).toBe("x");
  });

  it("falls back to the key when a title is missing without crashing", () => {
    const latest = latestByBookmaker([
      snap({ bookmakerKey: "x", bookmakerTitle: null, capturedAt: T1 }),
    ]);
    expect(latest[0]?.bookmakerTitle).toBeNull();
  });

  it("returns nothing for empty input", () => {
    expect(latestByBookmaker([])).toEqual([]);
  });
});

describe("toChartSeries", () => {
  it("pivots over the union of timestamps, padding gaps with null", () => {
    const { points, bookmakers } = toChartSeries(
      [
        snap({ bookmakerKey: "a", capturedAt: T1, homeOdds: 2.0 }),
        snap({ bookmakerKey: "a", capturedAt: T2, homeOdds: 2.1 }),
        snap({ bookmakerKey: "b", capturedAt: T2, homeOdds: 1.9 }),
        snap({ bookmakerKey: "b", capturedAt: T3, homeOdds: 1.95 }),
      ],
      "home",
    );

    expect(points).toEqual([
      { t: Date.parse(T1), a: 2.0, b: null },
      { t: Date.parse(T2), a: 2.1, b: 1.9 },
      { t: Date.parse(T3), a: null, b: 1.95 },
    ]);
    expect(bookmakers).toEqual([
      { key: "a", title: "A" },
      { key: "b", title: "B" },
    ]);
  });

  it("excludes bookmakers that have no price for the outcome (null draw)", () => {
    const draw = toChartSeries(
      [
        snap({ bookmakerKey: "a", capturedAt: T1, drawOdds: 3.3 }),
        snap({ bookmakerKey: "b", capturedAt: T1, drawOdds: null }),
      ],
      "draw",
    );
    expect(draw.bookmakers.map((b) => b.key)).toEqual(["a"]);
    expect(draw.points).toEqual([{ t: Date.parse(T1), a: 3.3 }]);
  });

  it("reads the away price for the away outcome", () => {
    const away = toChartSeries(
      [snap({ bookmakerKey: "a", capturedAt: T1, awayOdds: 4.2 })],
      "away",
    );
    expect(away.points).toEqual([{ t: Date.parse(T1), a: 4.2 }]);
  });

  it("returns empty series for empty input", () => {
    expect(toChartSeries([], "home")).toEqual({ points: [], bookmakers: [] });
  });
});
