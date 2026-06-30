import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BookmakerTable } from "@/components/bookmaker-table";
import type { MatchSnapshot } from "@/db/queries";
import { bestPrices, consensusProbabilities, enrichRows } from "@/lib/odds-math";

afterEach(cleanup);

// 10:00 "now" against a 09:00 capture → "1 hour ago".
const now = new Date("2026-06-15T10:00:00Z");

function snap(over: {
  bookmakerKey: string;
  bookmakerTitle: string;
  homeOdds: number;
  drawOdds: number | null;
  awayOdds: number;
}): MatchSnapshot {
  return { ...over, capturedAt: new Date("2026-06-15T09:00:00Z") };
}

// Three full 1X2 lines (enough for a consensus) plus one two-way book that
// omits the draw. Betfair offers a standout home price → value + best.
const snapshots: MatchSnapshot[] = [
  snap({ bookmakerKey: "pinnacle", bookmakerTitle: "Pinnacle", homeOdds: 2.0, drawOdds: 3.4, awayOdds: 3.8 }),
  snap({ bookmakerKey: "bet365", bookmakerTitle: "Bet365", homeOdds: 2.05, drawOdds: 3.35, awayOdds: 3.75 }),
  snap({ bookmakerKey: "betfair", bookmakerTitle: "Betfair", homeOdds: 2.3, drawOdds: 3.3, awayOdds: 3.7 }),
  snap({ bookmakerKey: "unibet", bookmakerTitle: "Unibet", homeOdds: 2.1, drawOdds: null, awayOdds: 3.6 }),
];

const consensus = consensusProbabilities(snapshots);
const rows = enrichRows(snapshots, consensus, bestPrices(snapshots));

// The desktop table and mobile cards both render in jsdom (visibility is
// CSS-only), so values appear more than once — assert presence, not count.
describe("BookmakerTable", () => {
  it("renders a row per bookmaker with its odds", () => {
    render(<BookmakerTable rows={rows} consensus={consensus} now={now} />);
    expect(screen.getAllByText("Pinnacle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Betfair").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2.30").length).toBeGreaterThan(0);
  });

  it("shows a dash for the two-way book's missing draw", () => {
    render(<BookmakerTable rows={rows} consensus={consensus} now={now} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders implied and no-vig probabilities per cell", () => {
    render(<BookmakerTable rows={rows} consensus={consensus} now={now} />);
    // Pinnacle home: implied 1/2.0 = 50.0%, no-vig ≈ 47.3%.
    expect(screen.getAllByText(/impl 50\.0% · fair 47\.3%/).length).toBeGreaterThan(0);
  });

  it("marks the best price and flags the value edge", () => {
    render(<BookmakerTable rows={rows} consensus={consensus} now={now} />);
    expect(screen.getAllByText("Best").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+4.8%").length).toBeGreaterThan(0);
  });

  it("shows the overround column and consensus summary", () => {
    render(<BookmakerTable rows={rows} consensus={consensus} now={now} />);
    expect(screen.getAllByText("0.8%").length).toBeGreaterThan(0); // Betfair overround
    expect(screen.getAllByText(/Consensus/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("3 bookmakers").length).toBeGreaterThan(0);
  });

  it("renders the relative capture time", () => {
    render(<BookmakerTable rows={rows} consensus={consensus} now={now} />);
    expect(screen.getAllByText(/1 hour ago/).length).toBeGreaterThan(0);
  });

  it("shows the no-consensus state when fewer than three books quote", () => {
    const thin = snapshots.slice(0, 2);
    const thinConsensus = consensusProbabilities(thin);
    const thinRows = enrichRows(thin, thinConsensus, bestPrices(thin));
    render(<BookmakerTable rows={thinRows} consensus={thinConsensus} now={now} />);
    expect(thinConsensus).toBeNull();
    expect(screen.getAllByText(/No consensus/).length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no rows", () => {
    render(<BookmakerTable rows={[]} consensus={null} now={now} />);
    expect(screen.getByText(/No odds captured yet/)).toBeInTheDocument();
  });
});
