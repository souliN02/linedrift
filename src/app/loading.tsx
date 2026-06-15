export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-8">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded bg-muted" />
      </div>
      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="h-[58px] animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </ul>
    </main>
  );
}
