export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-4 inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
        Phase 0 · skeleton
      </span>

      <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-6xl">
        OddsLens
      </h1>

      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        A football odds tracker that snapshots bookmaker odds over time,
        computes no-vig consensus probabilities, and flags value.
      </p>

      <p className="mt-3 max-w-md text-sm text-muted-foreground/80">
        Premier League and Danish Superliga · match-winner (1X2) market · odds
        snapshotted every 3 hours.
      </p>
    </main>
  );
}
