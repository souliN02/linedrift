import { describe, expect, it } from "vitest";

import type { MatchSnapshot } from "@/db/queries";
import type { BookmakerOpenClose } from "@/lib/match-history";
import {
  VALUE_THRESHOLD,
  bestPrices,
  biggestClvMove,
  clv,
  clvRows,
  consensusProbabilities,
  edge,
  enrichRows,
  impliedProbability,
  isValue,
  noVigProbabilities,
  overround,
  summarizeMatch,
} from "@/lib/odds-math";

// Build a latest-per-bookmaker snapshot row. Defaults form a normal 1X2 line;
// override any field (drawOdds: null models a bookmaker that omits the draw).
function snap(over: {
  bookmakerKey: string;
  bookmakerTitle?: string | null;
  homeOdds?: number;
  drawOdds?: number | null;
  awayOdds?: number;
  capturedAt?: string;
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
    capturedAt: new Date(over.capturedAt ?? "2026-06-15T09:00:00Z"),
  };
}

describe("impliedProbability", () => {
  const cases: [number, number][] = [
    [2.0, 0.5],
    [4.0, 0.25],
    [1.0, 1.0], // SPEC §7 edge case: odds of exactly 1.0
    [5.0, 0.2],
  ];
  it.each(cases)("1/%f = %f", (odds, expected) => {
    expect(impliedProbability(odds)).toBeCloseTo(expected, 10);
  });

  const guards: [string, number][] = [
    ["zero", 0],
    ["negative", -2],
    ["NaN", NaN],
    ["Infinity", Infinity],
  ];
  it.each(guards)("guards %s odds with null", (_label, odds) => {
    expect(impliedProbability(odds)).toBeNull();
  });
});

describe("overround", () => {
  it("sums implied probabilities minus one for a 1X2 line", () => {
    // 1/2 + 1/3.3 + 1/3.6 - 1 ≈ 0.0808
    expect(overround({ home: 2.0, draw: 3.3, away: 3.6 })).toBeCloseTo(
      0.0808,
      4,
    );
  });

  it("treats a missing draw as a two-way market", () => {
    expect(overround({ home: 2.0, draw: null, away: 2.0 })).toBeCloseTo(0, 10);
  });

  it("returns null when a required price is invalid (division guard)", () => {
    expect(overround({ home: 0, draw: 3.3, away: 3.6 })).toBeNull();
    expect(overround({ home: 2.0, draw: 3.3, away: -1 })).toBeNull();
  });
});

describe("noVigProbabilities", () => {
  it("scales each implied probability so they total one", () => {
    const p = noVigProbabilities({ home: 2.0, draw: 3.3, away: 3.6 });
    expect(p).not.toBeNull();
    expect(p?.home).toBeCloseTo(0.4626, 3);
    expect(p?.draw).toBeCloseTo(0.2804, 3);
    expect(p?.away).toBeCloseTo(0.257, 3);
    expect((p?.home ?? 0) + (p?.draw ?? 0) + (p?.away ?? 0)).toBeCloseTo(1, 10);
  });

  it("keeps draw null and normalizes the two remaining outcomes", () => {
    const p = noVigProbabilities({ home: 2.0, draw: null, away: 2.0 });
    expect(p?.draw).toBeNull();
    expect(p?.home).toBeCloseTo(0.5, 10);
    expect((p?.home ?? 0) + (p?.away ?? 0)).toBeCloseTo(1, 10);
  });

  it("returns null when a required price is invalid", () => {
    expect(noVigProbabilities({ home: 0, draw: 3.3, away: 3.6 })).toBeNull();
  });
});

describe("edge", () => {
  const cases: [number, number, number][] = [
    [2.0, 0.55, 0.1],
    [2.0, 0.5, 0],
    [3.0, 0.25, -0.25],
  ];
  it.each(cases)("%f x %f - 1 = %f", (odds, prob, expected) => {
    expect(edge(odds, prob)).toBeCloseTo(expected, 10);
  });
});

describe("isValue", () => {
  it("flags an edge at or above the 3% default threshold", () => {
    expect(VALUE_THRESHOLD).toBe(0.03);
    expect(isValue(0.03)).toBe(true);
    expect(isValue(0.0299)).toBe(false);
    expect(isValue(-0.1)).toBe(false);
  });

  it("honors a configurable threshold", () => {
    expect(isValue(0.05, 0.06)).toBe(false);
    expect(isValue(0.05, 0.04)).toBe(true);
  });
});

describe("consensusProbabilities", () => {
  it("averages the no-vig probabilities across bookmakers", () => {
    // Three identical lines → consensus equals the single line's no-vig probs.
    const c = consensusProbabilities([
      snap({ bookmakerKey: "a" }),
      snap({ bookmakerKey: "b" }),
      snap({ bookmakerKey: "c" }),
    ]);
    expect(c).not.toBeNull();
    expect(c?.bookmakerCount).toBe(3);
    expect(c?.home).toBeCloseTo(0.4626, 3);
    expect(c?.draw).toBeCloseTo(0.2804, 3);
    expect(c?.away).toBeCloseTo(0.257, 3);
  });

  it("returns null with fewer than three bookmakers (no consensus, no flags)", () => {
    expect(
      consensusProbabilities([
        snap({ bookmakerKey: "a" }),
        snap({ bookmakerKey: "b" }),
      ]),
    ).toBeNull();
  });

  it("excludes a bookmaker with invalid odds, dropping below the minimum", () => {
    expect(
      consensusProbabilities([
        snap({ bookmakerKey: "a" }),
        snap({ bookmakerKey: "b" }),
        snap({ bookmakerKey: "c", homeOdds: 0 }),
      ]),
    ).toBeNull();
  });

  it("excludes a two-way bookmaker (missing draw) from the consensus", () => {
    // a omits the draw → it cannot contribute a comparable 1X2 line, so only
    // b, c, d count.
    const c = consensusProbabilities([
      snap({ bookmakerKey: "a", drawOdds: null }),
      snap({ bookmakerKey: "b" }),
      snap({ bookmakerKey: "c" }),
      snap({ bookmakerKey: "d" }),
    ]);
    expect(c?.bookmakerCount).toBe(3);
  });

  it("returns null for a two-way market where no bookmaker prices the draw", () => {
    expect(
      consensusProbabilities([
        snap({ bookmakerKey: "a", drawOdds: null, awayOdds: 2.0 }),
        snap({
          bookmakerKey: "b",
          drawOdds: null,
          homeOdds: 1.9,
          awayOdds: 2.1,
        }),
        snap({
          bookmakerKey: "c",
          drawOdds: null,
          homeOdds: 2.05,
          awayOdds: 1.95,
        }),
      ]),
    ).toBeNull();
  });
});

describe("bestPrices", () => {
  const rows = [
    snap({ bookmakerKey: "a", homeOdds: 2.0, drawOdds: 3.4, awayOdds: 3.8 }),
    snap({ bookmakerKey: "b", homeOdds: 2.1, drawOdds: 3.2, awayOdds: 3.7 }),
  ];

  it("picks the highest decimal odds per outcome with its bookmaker", () => {
    const best = bestPrices(rows);
    expect(best.home).toEqual({
      price: 2.1,
      bookmakerKey: "b",
      bookmakerTitle: "B",
    });
    expect(best.draw?.bookmakerKey).toBe("a");
    expect(best.away?.bookmakerKey).toBe("a");
  });

  it("keeps the first bookmaker on a tie", () => {
    const best = bestPrices([
      snap({ bookmakerKey: "a", homeOdds: 2.1 }),
      snap({ bookmakerKey: "b", homeOdds: 2.1 }),
    ]);
    expect(best.home?.bookmakerKey).toBe("a");
  });

  it("returns a null outcome when no bookmaker prices it", () => {
    const best = bestPrices([
      snap({ bookmakerKey: "a", drawOdds: null }),
      snap({ bookmakerKey: "b", drawOdds: null }),
    ]);
    expect(best.draw).toBeNull();
    expect(best.home).not.toBeNull();
  });

  it("returns all-null for empty input", () => {
    expect(bestPrices([])).toEqual({ home: null, draw: null, away: null });
  });
});

// Shared fixture: C offers a standout home price; A the best draw and away.
const market = [
  snap({ bookmakerKey: "a", homeOdds: 2.0, drawOdds: 3.4, awayOdds: 3.8 }),
  snap({ bookmakerKey: "b", homeOdds: 2.05, drawOdds: 3.35, awayOdds: 3.75 }),
  snap({ bookmakerKey: "c", homeOdds: 2.3, drawOdds: 3.3, awayOdds: 3.7 }),
];

describe("summarizeMatch", () => {
  it("flags only the outcome whose best price beats consensus by >= 3%", () => {
    const summary = summarizeMatch(market);
    expect(summary.bookmakerCount).toBe(3);
    expect(summary.best.home?.bookmakerKey).toBe("c");
    expect(summary.value).toEqual({ home: true, draw: false, away: false });
  });

  it("exposes the best-price edge per outcome", () => {
    const summary = summarizeMatch(market);
    expect(summary.bestEdges.home).toBeCloseTo(0.0484, 3);
    expect(summary.bestEdges.away).toBeLessThan(VALUE_THRESHOLD);
  });

  it("reports null edges without a consensus", () => {
    const summary = summarizeMatch(market.slice(0, 2));
    expect(summary.bestEdges).toEqual({
      home: null,
      draw: null,
      away: null,
    });
  });

  it("reports the lowest overround across bookmakers", () => {
    expect(summarizeMatch(market).lowestOverround).toBeCloseTo(0.0081, 3);
  });

  it("raises no flags without a consensus (fewer than three bookmakers)", () => {
    const summary = summarizeMatch(market.slice(0, 2));
    expect(summary.consensus).toBeNull();
    expect(summary.value).toEqual({ home: false, draw: false, away: false });
  });

  it("handles an empty match", () => {
    const summary = summarizeMatch([]);
    expect(summary.bookmakerCount).toBe(0);
    expect(summary.lowestOverround).toBeNull();
    expect(summary.value).toEqual({ home: false, draw: false, away: false });
  });
});

describe("enrichRows", () => {
  const consensus = consensusProbabilities(market);
  const best = bestPrices(market);
  const rows = enrichRows(market, consensus, best);
  const byKey = (k: string) => rows.find((r) => r.bookmakerKey === k)!;

  it("returns one enriched row per bookmaker", () => {
    expect(rows.map((r) => r.bookmakerKey).sort()).toEqual(["a", "b", "c"]);
  });

  it("computes implied and no-vig probabilities per cell", () => {
    const c = byKey("c");
    expect(c.home.implied).toBeCloseTo(1 / 2.3, 6);
    expect(c.home.noVig).not.toBeNull();
    expect(c.overround).toBeCloseTo(0.0081, 3);
  });

  it("marks the best price per outcome and flags value edges", () => {
    expect(byKey("c").home.isBest).toBe(true);
    expect(byKey("a").home.isBest).toBe(false);
    expect(byKey("c").home.isValue).toBe(true);
    expect(byKey("a").away.isBest).toBe(true);
    expect(byKey("a").away.isValue).toBe(false);
  });

  it("leaves a missing draw cell empty without flags", () => {
    const noDraw = enrichRows(
      [
        snap({ bookmakerKey: "a", drawOdds: null }),
        snap({ bookmakerKey: "b" }),
        snap({ bookmakerKey: "c" }),
      ],
      consensus,
      best,
    );
    const a = noDraw.find((r) => r.bookmakerKey === "a")!;
    expect(a.draw.odds).toBeNull();
    expect(a.draw.implied).toBeNull();
    expect(a.draw.noVig).toBeNull();
    expect(a.draw.isValue).toBe(false);
  });

  it("yields null edges and no flags without a consensus", () => {
    const rowsNoConsensus = enrichRows(market, null, best);
    const c = rowsNoConsensus.find((r) => r.bookmakerKey === "c")!;
    expect(c.home.edge).toBeNull();
    expect(c.home.isValue).toBe(false);
    expect(c.home.isBest).toBe(true); // best-price highlight is independent of consensus
    expect(c.home.implied).not.toBeNull();
  });
});

// --- Closing line value (SPEC §14 post-MVP pick) ---

const OPENED_AT = new Date("2026-06-13T18:30:00Z");
const CLOSED_AT = new Date("2026-06-16T14:30:00Z");

type LineOdds = {
  homeOdds?: number;
  drawOdds?: number | null;
  awayOdds?: number;
};

function lineSnap(
  key: string,
  title: string | null,
  capturedAt: Date,
  over: LineOdds,
): MatchSnapshot {
  return {
    bookmakerKey: key,
    bookmakerTitle: title,
    homeOdds: over.homeOdds ?? 2.0,
    drawOdds: over.drawOdds === undefined ? 3.3 : over.drawOdds,
    awayOdds: over.awayOdds ?? 3.6,
    capturedAt,
  };
}

// Build one bookmaker's open/close pair the way openCloseByBookmaker would.
function openClose(over: {
  key?: string;
  title?: string | null;
  opening?: LineOdds;
  closing?: LineOdds;
  snapshotCount?: number;
}): BookmakerOpenClose {
  const key = over.key ?? "pinnacle";
  const title = over.title === undefined ? "Pinnacle" : over.title;
  return {
    bookmakerKey: key,
    bookmakerTitle: title,
    opening: lineSnap(key, title, OPENED_AT, over.opening ?? {}),
    closing: lineSnap(key, title, CLOSED_AT, over.closing ?? {}),
    snapshotCount: over.snapshotCount ?? 2,
  };
}

describe("clv", () => {
  const cases: [number, number, number][] = [
    [2.2, 2.0, 0.1], // opening price beat the close
    [1.8, 2.0, -0.1], // the market moved against the opener
    [2.0, 2.0, 0],
    [4.1, 3.65, 0.1232876712],
  ];
  it.each(cases)("clv(%f, %f) = %f", (opening, closing, expected) => {
    expect(clv(opening, closing)).toBeCloseTo(expected, 6);
  });

  const guards: [string, number, number][] = [
    ["zero closing odds", 2.0, 0],
    ["zero opening odds", 0, 2.0],
    ["negative closing odds", 2.0, -1],
    ["NaN opening odds", NaN, 2.0],
    ["Infinite closing odds", 2.0, Infinity],
  ];
  it.each(guards)("guards %s with null", (_label, opening, closing) => {
    expect(clv(opening, closing)).toBeNull();
  });
});

describe("clvRows", () => {
  it("computes per-outcome open/close/clv for a full line", () => {
    const [row] = clvRows([
      openClose({
        opening: { homeOdds: 2.2, drawOdds: 3.3, awayOdds: 3.0 },
        closing: { homeOdds: 2.0, drawOdds: 3.6, awayOdds: 2.8 },
      }),
    ]);

    expect(row?.bookmakerKey).toBe("pinnacle");
    expect(row?.bookmakerTitle).toBe("Pinnacle");
    expect(row?.openedAt).toEqual(OPENED_AT);
    expect(row?.closedAt).toEqual(CLOSED_AT);
    expect(row?.home).toMatchObject({ opening: 2.2, closing: 2.0 });
    expect(row?.home.clv).toBeCloseTo(0.1, 6);
    expect(row?.draw.clv).toBeCloseTo(3.3 / 3.6 - 1, 6);
    expect(row?.away.clv).toBeCloseTo(3.0 / 2.8 - 1, 6);
  });

  it("nulls the draw clv when either side lacks a draw price, keeping home/away", () => {
    const [row] = clvRows([
      openClose({
        opening: { drawOdds: 3.3 },
        closing: { drawOdds: null },
      }),
    ]);

    expect(row?.draw).toEqual({ opening: 3.3, closing: null, clv: null });
    expect(row?.home.clv).not.toBeNull();
    expect(row?.away.clv).not.toBeNull();
  });

  it("nulls every clv when only one pre-kickoff snapshot exists (no movement recorded)", () => {
    const [row] = clvRows([openClose({ snapshotCount: 1 })]);

    // Prices still shown; a 0.0% "movement" from a single reading would mislead.
    expect(row?.home.opening).toBe(2.0);
    expect(row?.home.closing).toBe(2.0);
    expect(row?.home.clv).toBeNull();
    expect(row?.draw.clv).toBeNull();
    expect(row?.away.clv).toBeNull();
  });

  it("preserves input order and length", () => {
    const rows = clvRows([
      openClose({ key: "b", title: "Bravo" }),
      openClose({ key: "a", title: "Alpha" }),
    ]);
    expect(rows.map((r) => r.bookmakerKey)).toEqual(["b", "a"]);
  });
});

describe("biggestClvMove", () => {
  it("picks the largest move by magnitude, either direction", () => {
    const move = biggestClvMove(
      clvRows([
        openClose({
          key: "a",
          title: "Alpha",
          opening: { homeOdds: 2.2, awayOdds: 3.0 },
          closing: { homeOdds: 2.0, awayOdds: 3.6 }, // away drifted −16.7%
        }),
      ]),
    );

    expect(move?.outcome).toBe("away");
    expect(move?.bookmakerKey).toBe("a");
    expect(move?.clv).toBeCloseTo(3.0 / 3.6 - 1, 6);
  });

  it("keeps the first row/outcome on a tie", () => {
    const move = biggestClvMove(
      clvRows([
        openClose({
          key: "a",
          opening: { homeOdds: 2.2 },
          closing: { homeOdds: 2.0 },
        }),
        openClose({
          key: "b",
          opening: { homeOdds: 2.2 },
          closing: { homeOdds: 2.0 },
        }),
      ]),
    );
    expect(move?.bookmakerKey).toBe("a");
    expect(move?.outcome).toBe("home");
  });

  it("returns null when no clv could be computed", () => {
    expect(
      biggestClvMove(clvRows([openClose({ snapshotCount: 1 })])),
    ).toBeNull();
    expect(biggestClvMove([])).toBeNull();
  });
});
