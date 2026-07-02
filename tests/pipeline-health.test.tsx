import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PipelineHealth } from "@/components/pipeline-health";
import type { IngestionRun } from "@/db/queries";

// Fixed clock so formatRelativeTime is deterministic (same pattern as the
// dashboard test).
const NOW = new Date("2026-07-02T12:00:00Z");

function makeRun(overrides: Partial<IngestionRun> = {}): IngestionRun {
  return {
    id: 1,
    ranAt: new Date("2026-07-02T11:30:00Z"),
    status: "ok",
    matchesSeen: 6,
    snapshotsAttempted: 20,
    creditsRemaining: 476,
    creditsUsed: 24,
    error: null,
    ...overrides,
  };
}

describe("PipelineHealth", () => {
  afterEach(cleanup);

  it("renders headline stats from the latest run", () => {
    render(<PipelineHealth runs={[makeRun()]} totalRuns={42} now={NOW} />);

    // Appears in the "last run" stat and again in the run-log row.
    expect(screen.getAllByText("30 minutes ago")).toHaveLength(2);
    expect(screen.getByText("476")).toBeInTheDocument();
    expect(screen.getByText("credits remaining")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("snapshots last run")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("runs recorded")).toBeInTheDocument();
  });

  it("renders a dash when the credit headers were absent", () => {
    render(
      <PipelineHealth
        runs={[makeRun({ creditsRemaining: null, creditsUsed: null })]}
        totalRuns={1}
        now={NOW}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText(/credits left/)).not.toBeInTheDocument();
  });

  it("marks failed runs without exposing the stored error text", () => {
    render(
      <PipelineHealth
        runs={[
          makeRun({
            id: 2,
            status: "error",
            matchesSeen: 0,
            snapshotsAttempted: 0,
            error: "The Odds API request for soccer_epl failed: 429",
          }),
        ]}
        totalRuns={2}
        now={NOW}
      />,
    );

    expect(screen.getByText("run failed")).toBeInTheDocument();
    expect(screen.queryByText(/soccer_epl/)).not.toBeInTheDocument();
  });

  it("lists one row per run, newest first", () => {
    render(
      <PipelineHealth
        runs={[
          makeRun({ id: 3, ranAt: new Date("2026-07-02T11:30:00Z") }),
          makeRun({ id: 2, ranAt: new Date("2026-07-02T07:30:00Z") }),
        ]}
        totalRuns={2}
        now={NOW}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("30 minutes ago");
    expect(items[1]).toHaveTextContent("4 hours ago");
  });

  it("renders the empty state before any run has been recorded", () => {
    render(<PipelineHealth runs={[]} totalRuns={0} now={NOW} />);

    expect(screen.getByText(/No runs recorded yet/)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
