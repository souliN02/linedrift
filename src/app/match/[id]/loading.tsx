export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-4 mb-8">
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-72 w-full animate-pulse rounded-lg border border-border bg-card" />
      <div className="mt-8 h-4 w-24 animate-pulse rounded bg-muted" />
      <ul className="mt-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="h-10 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </ul>
    </main>
  );
}
