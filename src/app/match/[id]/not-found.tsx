import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">Match not found</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This match doesn&rsquo;t exist or hasn&rsquo;t been ingested yet.
      </p>
      <Link
        href="/"
        className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
