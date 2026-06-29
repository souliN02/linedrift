"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">Couldn&rsquo;t load this match</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The database may be unreachable. Check that DATABASE_URL is set and that
        migrations have run, then try again.
      </p>
      <Button variant="outline" className="mt-4" onClick={() => reset()}>
        Retry
      </Button>
    </main>
  );
}
