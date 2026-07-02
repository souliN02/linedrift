import { defineConfig } from "@playwright/test";

// E2e smoke tests (tests/e2e) drive the real app against a seeded database —
// locally against `pnpm dev` (reused if already running), in CI against a
// production build backed by the NEON_CI_DATABASE_URL Neon branch. The live
// Odds API is never involved (SPEC §4).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    // CI builds first (see ci.yml); locally a running dev server is reused.
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
