import { Badge } from "@/components/ui/badge";
import {
  formatPercent,
  formatRelativeTime,
  formatSignedPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ConsensusProbabilities,
  EnrichedRow,
  OutcomeCell,
} from "@/lib/odds-math";

// The value-engine table: latest price per bookmaker plus implied/no-vig
// probabilities, overround, and edge vs consensus, with best prices marked.
// All figures are precomputed in odds-math; this component only renders them.
export type BookmakerTableProps = {
  /** One enriched row per bookmaker (latest snapshot, sorted). */
  rows: EnrichedRow[];
  /** Consensus fair probabilities for the summary row; null when < 3 books. */
  consensus: ConsensusProbabilities | null;
  /** Injectable for deterministic "X ago" text in tests. */
  now?: Date;
};

function impliedFair(cell: OutcomeCell): string {
  const parts: string[] = [];
  if (cell.implied !== null) parts.push(`impl ${formatPercent(cell.implied)}`);
  if (cell.noVig !== null) parts.push(`fair ${formatPercent(cell.noVig)}`);
  return parts.join(" · ");
}

/** The odds + probabilities + flags for one outcome (shared desktop/mobile). */
function Cell({ cell, align }: { cell: OutcomeCell; align: "end" | "center" }) {
  if (cell.odds === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "end" ? "items-end" : "items-center",
      )}
    >
      <div className="flex items-center gap-1">
        {cell.isValue && cell.edge !== null && (
          <Badge variant="value">{formatSignedPercent(cell.edge)}</Badge>
        )}
        {cell.isBest && <Badge variant="best">Best</Badge>}
        <span className="text-sm font-medium tabular-nums">
          {cell.odds.toFixed(2)}
        </span>
      </div>
      <span className="text-[0.65rem] text-muted-foreground tabular-nums">
        {impliedFair(cell)}
      </span>
    </div>
  );
}

function bestCellClass(isBest: boolean): string {
  return isBest ? "bg-emerald-500/[0.07]" : "";
}

export function BookmakerTable({ rows, consensus, now }: BookmakerTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No odds captured yet — the cron runs every 3 hours.
      </div>
    );
  }

  return (
    <>
      {/* Desktop: comparison table. */}
      <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Bookmaker</th>
              <th className="px-4 py-2 text-right font-medium">Home</th>
              <th className="px-4 py-2 text-right font-medium">Draw</th>
              <th className="px-4 py-2 text-right font-medium">Away</th>
              <th className="px-4 py-2 text-right font-medium">Overround</th>
              <th className="px-4 py-2 text-right font-medium">Updated</th>
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
                <td className={cn("px-4 py-2", bestCellClass(row.home.isBest))}>
                  <Cell cell={row.home} align="end" />
                </td>
                <td className={cn("px-4 py-2", bestCellClass(row.draw.isBest))}>
                  <Cell cell={row.draw} align="end" />
                </td>
                <td className={cn("px-4 py-2", bestCellClass(row.away.isBest))}>
                  <Cell cell={row.away} align="end" />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                  {row.overround === null ? "—" : formatPercent(row.overround)}
                </td>
                <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                  {formatRelativeTime(row.capturedAt, now)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/40 text-xs">
              <td className="px-4 py-2 font-medium">Consensus (no-vig)</td>
              {consensus ? (
                <>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatPercent(consensus.home)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatPercent(consensus.draw)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatPercent(consensus.away)}
                  </td>
                  <td
                    className="px-4 py-2 text-right text-muted-foreground"
                    colSpan={2}
                  >
                    {consensus.bookmakerCount} bookmakers
                  </td>
                </>
              ) : (
                <td
                  className="px-4 py-2 text-right text-muted-foreground"
                  colSpan={5}
                >
                  No consensus — need at least 3 bookmakers.
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile: one card per bookmaker, plus a consensus card. */}
      <div className="space-y-2 sm:hidden">
        <ul className="space-y-2">
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
                  {row.overround === null
                    ? formatRelativeTime(row.capturedAt, now)
                    : `vig ${formatPercent(row.overround)} · ${formatRelativeTime(row.capturedAt, now)}`}
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
                  <div
                    key={label}
                    className={cn(
                      "rounded-md py-1.5",
                      cell.isBest ? "bg-emerald-500/[0.07]" : "bg-muted/40",
                    )}
                  >
                    <div className="text-[0.65rem] text-muted-foreground">
                      {label}
                    </div>
                    <Cell cell={cell} align="center" />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs">
          {consensus ? (
            <div className="flex items-center justify-between">
              <span className="font-medium">Consensus (no-vig)</span>
              <span className="tabular-nums text-muted-foreground">
                H {formatPercent(consensus.home)} · D{" "}
                {formatPercent(consensus.draw)} · A {formatPercent(consensus.away)}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              No consensus — need at least 3 bookmakers.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
