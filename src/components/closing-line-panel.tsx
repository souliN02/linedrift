import { Badge } from "@/components/ui/badge";
import { formatChartTime, formatPercent, formatSignedPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  isValue,
  type ClvCell,
  type ClvHeadline,
  type ClvRow,
  type ConsensusProbabilities,
} from "@/lib/odds-math";

// The closing-line report for a finished match: per bookmaker and outcome, the
// opening price against the closing (last pre-kickoff) price, and the CLV of
// having taken the opener. All figures come precomputed from odds-math; this
// component only renders them (CLAUDE.md).
export type ClosingLinePanelProps = {
  /** One row per bookmaker (openers vs closers, sorted). */
  rows: ClvRow[];
  /** No-vig consensus over the closing set; null when < 3 books. */
  consensus: ConsensusProbabilities | null;
  /** The single biggest open→close move, either direction; null when none. */
  headline: ClvHeadline | null;
};

const OUTCOME_LABEL = { home: "Home", draw: "Draw", away: "Away" } as const;

function price(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

/** Open → close prices plus the signed CLV for one outcome. */
function MoveCell({ cell, align }: { cell: ClvCell; align: "end" | "center" }) {
  if (cell.opening === null && cell.closing === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const beatClose = cell.clv !== null && isValue(cell.clv);
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "end" ? "items-end" : "items-center",
      )}
    >
      <div className="flex items-center gap-1">
        {beatClose && (
          <Badge variant="value">{formatSignedPercent(cell.clv ?? 0)}</Badge>
        )}
        <span className="text-sm font-medium tabular-nums">
          {price(cell.opening)} → {price(cell.closing)}
        </span>
      </div>
      <span className="text-[0.65rem] text-muted-foreground tabular-nums">
        {cell.clv === null ? "—" : `${formatSignedPercent(cell.clv)} vs close`}
      </span>
    </div>
  );
}

function ConsensusNote({
  consensus,
}: {
  consensus: ConsensusProbabilities | null;
}) {
  return (
    <p className="text-xs text-muted-foreground">
      {consensus ? (
        <>
          Closing consensus (no-vig): H {formatPercent(consensus.home)} · D{" "}
          {formatPercent(consensus.draw)} · A {formatPercent(consensus.away)}{" "}
          across {consensus.bookmakerCount} bookmakers.
        </>
      ) : (
        <>No closing consensus — need at least 3 bookmakers.</>
      )}{" "}
      Closing = each bookmaker&apos;s last snapshot before kickoff; snapshots
      run every 4 hours, so the close can be a few hours before the whistle.
    </p>
  );
}

export function ClosingLinePanel({
  rows,
  consensus,
  headline,
}: ClosingLinePanelProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No pre-kickoff odds were captured for this match.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {headline && (
        <p className="text-xs text-muted-foreground">
          Biggest move:{" "}
          <span className="font-medium text-foreground">
            {headline.bookmakerTitle ?? headline.bookmakerKey}{" "}
            {OUTCOME_LABEL[headline.outcome]}
          </span>{" "}
          <span className="tabular-nums">
            {formatSignedPercent(headline.clv)}
          </span>{" "}
          vs close.
        </p>
      )}

      {/* Desktop: open → close per outcome. */}
      <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Bookmaker</th>
              <th className="px-4 py-2 text-right font-medium">Home</th>
              <th className="px-4 py-2 text-right font-medium">Draw</th>
              <th className="px-4 py-2 text-right font-medium">Away</th>
              <th className="px-4 py-2 text-right font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.bookmakerKey}
                className="border-b border-border last:border-0"
              >
                <td className="px-4 py-2 font-medium">
                  {row.bookmakerTitle ?? row.bookmakerKey}
                </td>
                <td className="px-4 py-2">
                  <MoveCell cell={row.home} align="end" />
                </td>
                <td className="px-4 py-2">
                  <MoveCell cell={row.draw} align="end" />
                </td>
                <td className="px-4 py-2">
                  <MoveCell cell={row.away} align="end" />
                </td>
                <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                  {formatChartTime(row.closedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per bookmaker. */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.bookmakerKey}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {row.bookmakerTitle ?? row.bookmakerKey}
              </span>
              <span className="text-xs text-muted-foreground">
                closed {formatChartTime(row.closedAt)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Home", row.home],
                  ["Draw", row.draw],
                  ["Away", row.away],
                ] as const
              ).map(([label, cell]) => (
                <div key={label} className="rounded-md bg-muted/40 py-1.5">
                  <div className="text-[0.65rem] text-muted-foreground">
                    {label}
                  </div>
                  <MoveCell cell={cell} align="center" />
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <ConsensusNote consensus={consensus} />
    </div>
  );
}
