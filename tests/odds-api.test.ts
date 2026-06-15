import { describe, expect, it } from "vitest";

import { parseOddsResponse, toSnapshotRows } from "@/lib/odds-api";
import fixture from "./fixtures/odds-response.json";

describe("parseOddsResponse", () => {
  it("validates the fixture and returns every event", () => {
    const events = parseOddsResponse(fixture);
    expect(events).toHaveLength(6);
  });

  it.each([
    ["a number", 42],
    ["a bare object", {}],
    ["an event missing required fields", [{ id: "x" }]],
    ["a non-string id", [{ ...validEvent(), id: 123 }]],
  ])("throws on %s", (_label, payload) => {
    expect(() => parseOddsResponse(payload)).toThrow();
  });
});

describe("toSnapshotRows", () => {
  const rows = toSnapshotRows(parseOddsResponse(fixture));

  it("dedupes leagues and bookmakers and keeps every match", () => {
    expect(rows.leagues.map((l) => l.key).sort()).toEqual([
      "soccer_denmark_superliga",
      "soccer_epl",
    ]);
    expect(rows.bookmakers.map((b) => b.key).sort()).toEqual([
      "bet365",
      "marathonbet",
      "pinnacle",
      "unibet",
      "williamhill",
    ]);
    expect(rows.matches).toHaveLength(6);
    expect(rows.snapshots).toHaveLength(20);
  });

  it("maps h2h outcomes to home/draw/away odds as strings", () => {
    const snap = rows.snapshots.find(
      (s) =>
        s.externalId === "e1a1f0c2b3d4e5f60718293a4b5c6d7e" &&
        s.bookmakerKey === "pinnacle",
    );
    expect(snap).toBeDefined();
    expect(snap?.homeOdds).toBe("2.07"); // Arsenal
    expect(snap?.awayOdds).toBe("3.65"); // Chelsea
    expect(snap?.drawOdds).toBe("3.55");
  });

  it("stores a null draw when the bookmaker omits it", () => {
    const events = parseOddsResponse([
      bookmakerEvent([
        { name: "A", price: 1.8 },
        { name: "B", price: 4.0 },
      ]),
    ]);
    const { snapshots } = toSnapshotRows(events);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.homeOdds).toBe("1.8");
    expect(snapshots[0]?.drawOdds).toBeNull();
  });

  it("skips a bookmaker missing the home or away price", () => {
    const events = parseOddsResponse([
      bookmakerEvent([
        { name: "B", price: 4.0 },
        { name: "Draw", price: 3.0 },
      ]),
    ]);
    const { snapshots, bookmakers } = toSnapshotRows(events);
    expect(snapshots).toHaveLength(0);
    expect(bookmakers).toHaveLength(0);
  });
});

// Helpers ---------------------------------------------------------------

function validEvent() {
  return {
    id: "x",
    sport_key: "soccer_epl",
    sport_title: "EPL",
    commence_time: "2026-06-16T18:30:00Z",
    home_team: "A",
    away_team: "B",
    bookmakers: [],
  };
}

function bookmakerEvent(outcomes: { name: string; price: number }[]) {
  return {
    ...validEvent(),
    bookmakers: [
      {
        key: "bk",
        title: "BK",
        last_update: "2026-06-15T09:00:00Z",
        markets: [
          { key: "h2h", last_update: "2026-06-15T09:00:00Z", outcomes },
        ],
      },
    ],
  };
}
