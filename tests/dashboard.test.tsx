import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Dashboard, type DashboardProps } from "@/components/dashboard";
import type { DashboardMatch, RecentMatch } from "@/components/match-card";
import type { MatchSnapshot } from "@/db/queries";
import { summarizeMatch } from "@/lib/odds-math";

afterEach(cleanup);

const leagues = [
  { key: "soccer_epl", title: "Premier League" },
  { key: "soccer_denmark_superliga", title: "Superliga" },
];

// Three full lines; Betfair's standout home price makes the home outcome a value.
const captured = new Date("2026-06-18T11:48:00Z");
const snapshots: MatchSnapshot[] = [
  { bookmakerKey: "pinnacle", bookmakerTitle: "Pinnacle", homeOdds: 2.0, drawOdds: 3.4, awayOdds: 3.8, capturedAt: captured },
  { bookmakerKey: "bet365", bookmakerTitle: "Bet365", homeOdds: 2.05, drawOdds: 3.35, awayOdds: 3.75, capturedAt: captured },
  { bookmakerKey: "betfair", bookmakerTitle: "Betfair", homeOdds: 2.3, drawOdds: 3.3, awayOdds: 3.7, capturedAt: captured },
];
const summary = summarizeMatch(snapshots);

const match: DashboardMatch = {
  id: "m1",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  commenceTime: new Date("2026-06-19T18:00:00Z"),
  leagueKey: "soccer_epl",
  leagueTitle: "Premier League",
  bookmakerCount: summary.bookmakerCount,
  best: summary.best,
  lowestOverround: summary.lowestOverround,
  bestEdges: summary.bestEdges,
  value: summary.value,
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
    expect(screen.getByText("3 bookmakers")).toBeInTheDocument();
  });

  it("renders best odds with the offering bookmaker and lowest overround", () => {
    renderDashboard();
    expect(screen.getByText("2.30")).toBeInTheDocument();
    expect(screen.getByText("Betfair")).toBeInTheDocument();
    expect(screen.getByText(/vig 0\.8%/)).toBeInTheDocument();
  });

  it("flags a value outcome with its edge badge", () => {
    renderDashboard();
    expect(screen.getByText("+4.8%")).toBeInTheDocument();
  });

  it("shows the last-snapshot relative time", () => {
    renderDashboard();
    expect(
      screen.getByText("Last snapshot 12 minutes ago"),
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

  it("notes when it is showing next fixtures because the 7-day window is empty", () => {
    renderDashboard({ showingNextFixtures: true });
    expect(
      screen.getByText(/showing the next scheduled fixtures/i),
    ).toBeInTheDocument();
    // The matches themselves still render.
    expect(screen.getByText(/Arsenal/)).toBeInTheDocument();
  });

  it("omits the next-fixtures note in the normal next-7-days window", () => {
    renderDashboard();
    expect(
      screen.queryByText(/showing the next scheduled fixtures/i),
    ).not.toBeInTheDocument();
  });

  const recentMatch: RecentMatch = {
    id: "r1",
    homeTeam: "FC Copenhagen",
    awayTeam: "Brondby IF",
    commenceTime: new Date("2026-06-18T17:00:00Z"),
    leagueKey: "soccer_denmark_superliga",
    leagueTitle: "Superliga",
  };

  it("lists recently closed matches linking to their closing-line reports", () => {
    renderDashboard({ recentMatches: [recentMatch] });

    expect(screen.getByText("Closing line reports")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /FC Copenhagen.*Closing line report/ }),
    ).toHaveAttribute("href", "/match/r1");
  });

  it("still shows recently closed matches alongside an empty upcoming list", () => {
    renderDashboard({ matches: [], recentMatches: [recentMatch] });

    expect(screen.getByText(/No upcoming matches/)).toBeInTheDocument();
    expect(screen.getByText("Closing line reports")).toBeInTheDocument();
  });

  it("omits the recently-closed section when there are none", () => {
    renderDashboard();
    expect(screen.queryByText("Closing line reports")).not.toBeInTheDocument();
  });
});
