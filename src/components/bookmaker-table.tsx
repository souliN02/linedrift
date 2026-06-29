import type { MatchSnapshot } from "@/db/queries";
import { formatRelativeTime } from "@/lib/format";

// Phase 4 shows the latest decimal price per bookmaker only; implied/no-vig/
// overround/edge columns and best-price highlighting arrive in Phase 5.
export type BookmakerTableProps = {
  /** One row per bookmaker — the latest snapshot, sorted (see latestByBookmaker). */
  rows: MatchSnapshot[];
  /** Injectable for deterministic "X ago" text in tests. */
  now?: Date;
};

function odds(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

export function BookmakerTable({ rows, now }: BookmakerTableProps) {
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
                <td className="px-4 py-2 text-right tabular-nums">
                  {odds(row.homeOdds)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {odds(row.drawOdds)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {odds(row.awayOdds)}
                </td>
                <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                  {formatRelativeTime(row.capturedAt, now)}
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
                {formatRelativeTime(row.capturedAt, now)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Home", row.homeOdds],
                  ["Draw", row.drawOdds],
                  ["Away", row.awayOdds],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-md bg-muted/40 py-1.5">
                  <div className="text-[0.65rem] text-muted-foreground">
                    {label}
                  </div>
                  <div className="text-sm tabular-nums">{odds(value)}</div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
