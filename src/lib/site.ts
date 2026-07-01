// Single source of truth for absolute-URL metadata (OG tags, robots, sitemap).
// Overridable per-environment; falls back to the production deployment.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://oddslens-mocha.vercel.app";

export const SITE_NAME = "OddsLens";
export const SITE_DESCRIPTION =
  "Educational analytics project that snapshots bookmaker odds over time, computes no-vig consensus probabilities, and flags value. Not betting advice.";
