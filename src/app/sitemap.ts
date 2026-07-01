import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// Only the stable public routes. Match pages are DB-driven and short-lived, so
// they are intentionally left out rather than listed and going stale.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
