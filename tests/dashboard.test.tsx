import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Dashboard, type DashboardProps } from "@/components/dashboard";
import type { DashboardMatch } from "@/components/match-card";

afterEach(cleanup);

const leagues = [
  { key: "soccer_epl", title: "Premier League" },
  { key: "soccer_denmark_superliga", title: "Superliga" },
];

const match: DashboardMatch = {
  id: "m1",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  commenceTime: new Date("2026-06-19T18:00:00Z"),
  leagueKey: "soccer_epl",
  leagueTitle: "Premier League",
  bookmakerCount: 4,
};

const now = new Date("2026-06-18T12:00:00Z");

function renderDashboard(overrides: Partial<DashboardProps> = {}) {
  const props: DashboardProps = {
    matches: [match],
    leagues,
    activeLeague: null,
    lastSnapshotAt: new Date("2026-06-18T11:48:00Z"),
    now,
    ...overrides,
  };
  return render(<Dashboard {...props} />);
}

describe("Dashboard", () => {
  it("renders match rows with teams and bookmaker count", () => {
    renderDashboard();
    expect(screen.getByText(/Arsenal/)).toBeInTheDocument();
    expect(screen.getByText(/Chelsea/)).toBeInTheDocument();
    expect(screen.getByText("4 bookmakers")).toBeInTheDocument();
  });

  it("shows the last-snapshot relative time", () => {
    renderDashboard();
    expect(
      screen.getByText("Last snapshot: 12 minutes ago"),
    ).toBeInTheDocument();
  });

  it("renders a league filter with the active chip marked", () => {
    renderDashboard({ activeLeague: "soccer_epl" });
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Premier League" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows the 'first snapshot pending' empty state when nothing has run", () => {
    renderDashboard({ matches: [], lastSnapshotAt: null });
    expect(screen.getByText(/First snapshot pending/)).toBeInTheDocument();
  });

  it("shows a league-scoped empty state when snapshots exist but none upcoming", () => {
    renderDashboard({ matches: [], activeLeague: "soccer_epl" });
    expect(
      screen.getByText(
        "No upcoming matches in the next 7 days for Premier League.",
      ),
    ).toBeInTheDocument();
  });
});
