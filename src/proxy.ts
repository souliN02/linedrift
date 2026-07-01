import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// A dynamic page's notFound() can only soft-404 (HTTP 200) under Next's
// streaming render, so a malformed /match/<id> URL — the realistic bad-link and
// crawler case — is caught here instead, before any render, and given a real
// 404. matches.id is a Postgres uuid, so anything that is not a uuid can never
// resolve; we reject it on shape alone (no database round-trip).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function proxy(request: NextRequest) {
  const id = request.nextUrl.pathname.slice("/match/".length);
  if (UUID_RE.test(id)) return NextResponse.next();

  // Render the styled not-found UI, but with a real 404 status.
  return NextResponse.rewrite(new URL("/_not-found", request.url), {
    status: 404,
  });
}

export const config = {
  matcher: "/match/:id",
};
