import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClosingLinePanel } from "@/components/closing-line-panel";
import type {
  ClvHeadline,
  ClvRow,
  ConsensusProbabilities,
} from "@/lib/odds-math";

const OPENED_AT = new Date("2026-06-13T18:30:00Z");
const CLOSED_AT = new Date("2026-06-16T14:30:00Z");

// Precomputed props, same pattern as bookmaker-table.test.tsx — the page does
// the math, the component only renders.
function makeRow(overrides: Partial<ClvRow> = {}): ClvRow {
  return {
    bookmakerKey: "pinnacle",
    bookmakerTitle: "Pinnacle",
    openedAt: OPENED_AT,
    closedAt: CLOSED_AT,
    home: { opening: 2.2, closing: 1.88, clv: 0.17 },
    draw: { opening: 3.45, closing: 3.6, clv: -0.042 },
    away: { opening: 3.4, closing: 4.05, clv: -0.16 },
    ...overrides,
  };
}

const consensus: ConsensusProbabilities = {
  home: 0.51,
  draw: 0.27,
  away: 0.22,
  bookmakerCount: 3,
};

const headline: ClvHeadline = {
  bookmakerKey: "pinnacle",
  bookmakerTitle: "Pinnacle",
  outcome: "home",
  clv: 0.17,
};

describe("ClosingLinePanel", () => {
  afterEach(cleanup);

  it("renders open → close prices with signed CLV per outcome", () => {
    render(
      <ClosingLinePanel rows={[makeRow()]} consensus={null} headline={null} />,
    );

    // Desktop table + mobile cards both render, so each cell appears twice.
    expect(screen.getAllByText("2.20 → 1.88").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+17.0% vs close").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-16.0% vs close").length).toBeGreaterThan(0);
  });

  it("badges an outcome whose opener beat the close by the value threshold", () => {
    render(
      <ClosingLinePanel rows={[makeRow()]} consensus={null} headline={null} />,
    );
    // Only the home cell (+17%) clears the 3% threshold.
    expect(screen.getAllByText("+17.0%").length).toBeGreaterThan(0);
    expect(screen.queryByText("-16.0%")).not.toBeInTheDocument();
  });

  it("renders dashes for cells without a computable CLV", () => {
    render(
      <ClosingLinePanel
        rows={[
          makeRow({
            draw: { opening: 3.45, closing: null, clv: null },
          }),
        ]}
        consensus={null}
        headline={null}
      />,
    );
    expect(screen.getAllByText("3.45 → —").length).toBeGreaterThan(0);
  });

  it("renders the headline move", () => {
    render(
      <ClosingLinePanel
        rows={[makeRow()]}
        consensus={null}
        headline={headline}
      />,
    );
    expect(screen.getByText(/Biggest move:/)).toBeInTheDocument();
    expect(screen.getByText(/Pinnacle Home/)).toBeInTheDocument();
  });

  it("shows the closing consensus when present, with the honesty footnote", () => {
    render(
      <ClosingLinePanel
        rows={[makeRow()]}
        consensus={consensus}
        headline={null}
      />,
    );
    expect(
      screen.getByText(/Closing consensus \(no-vig\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/across 3 bookmakers/)).toBeInTheDocument();
    expect(
      screen.getByText(/can be a few hours before the whistle/),
    ).toBeInTheDocument();
  });

  it("falls back to the no-consensus note below 3 bookmakers", () => {
    render(
      <ClosingLinePanel rows={[makeRow()]} consensus={null} headline={null} />,
    );
    expect(screen.getByText(/No closing consensus/)).toBeInTheDocument();
  });

  it("renders an empty state when nothing pre-kickoff was captured", () => {
    render(<ClosingLinePanel rows={[]} consensus={null} headline={null} />);
    expect(
      screen.getByText(/No pre-kickoff odds were captured/),
    ).toBeInTheDocument();
  });
});
