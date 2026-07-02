import { Stat } from "@/components/stat";
import type { IngestionRun } from "@/db/queries";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

export type PipelineHealthProps = {
  /** Newest first (as returned by getRecentRuns). */
  runs: IngestionRun[];
  totalRuns: number;
  /** Injectable for deterministic tests. */
  now?: Date;
};

/**
 * Live operational summary of the snapshot pipeline: the latest run's headline
 * numbers plus a short run log. Render-only — the page fetches the rows.
 * Failed runs are shown as such, but their stored error text stays in the DB;
 * upstream error bodies don't belong on a public page.
 */
export function PipelineHealth({ runs, totalRuns, now }: PipelineHealthProps) {
  const latest = runs[0];

  if (!latest) {
    return (
      <p className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        No runs recorded yet — the cron runs every 4 hours.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={formatRelativeTime(latest.ranAt, now)} label="last run" />
        <Stat
          value={latest.creditsRemaining?.toString() ?? "—"}
          label="credits remaining"
        />
        <Stat
          value={latest.snapshotsAttempted.toString()}
          label="snapshots last run"
        />
        <Stat value={totalRuns.toString()} label="runs recorded" />
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {runs.map((run) => (
          <li
            key={run.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-xs"
          >
            <span
              aria-hidden
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                run.status === "ok" ? "bg-primary" : "bg-destructive",
              )}
            />
            <span className="text-muted-foreground">
              {formatRelativeTime(run.ranAt, now)}
            </span>
            {run.status === "ok" ? (
              <span className="font-mono text-foreground tabular-nums">
                {run.snapshotsAttempted} snapshots · {run.matchesSeen} matches
              </span>
            ) : (
              <span className="font-medium text-destructive">run failed</span>
            )}
            {run.creditsRemaining !== null && (
              <span className="ml-auto font-mono text-muted-foreground tabular-nums">
                {run.creditsRemaining} credits left
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
