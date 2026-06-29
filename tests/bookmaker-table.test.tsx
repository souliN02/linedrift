import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BookmakerTable } from "@/components/bookmaker-table";
import type { MatchSnapshot } from "@/db/queries";

afterEach(cleanup);

// 10:00 "now" against a 09:00 capture → "1 hour ago".
const now = new Date("2026-06-15T10:00:00Z");

const rows: MatchSnapshot[] = [
  {
    bookmakerKey: "pinnacle",
    bookmakerTitle: "Pinnacle",
    homeOdds: 2.07,
    drawOdds: 3.55,
    awayOdds: 3.65,
    capturedAt: new Date("2026-06-15T09:00:00Z"),
  },
  {
    bookmakerKey: "bet365",
    bookmakerTitle: "Bet365",
    homeOdds: 2.0,
    drawOdds: null,
    awayOdds: 3.7,
    capturedAt: new Date("2026-06-15T09:00:00Z"),
  },
];

describe("BookmakerTable", () => {
  // The desktop table and mobile cards both render in jsdom (visibility is
  // CSS-only), so each value appears more than once — assert presence, not count.
  it("renders a row per bookmaker with its odds", () => {
    render(<BookmakerTable rows={rows} now={now} />);
    expect(screen.getAllByText("Pinnacle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bet365").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2.07").length).toBeGreaterThan(0);
  });

  it("shows a dash for a missing draw price", () => {
    render(<BookmakerTable rows={rows} now={now} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders the relative capture time", () => {
    render(<BookmakerTable rows={rows} now={now} />);
    expect(screen.getAllByText("1 hour ago").length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no rows", () => {
    render(<BookmakerTable rows={[]} now={now} />);
    expect(screen.getByText(/No odds captured yet/)).toBeInTheDocument();
  });
});
