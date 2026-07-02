// One big mono number over a small label — used by /about for the budget grid
// and the pipeline health panel.
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-center">
      <div className="font-mono text-xl font-semibold text-foreground tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{label}</div>
    </div>
  );
}
