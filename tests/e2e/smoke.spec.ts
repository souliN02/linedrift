import { expect, test } from "@playwright/test";

// One end-to-end pass over the three pages: seeded DB → server components →
// client hydration. Assertions are data-shape-agnostic so the same test passes
// against the CI fixture seed and a development database.

test("dashboard renders and links to a closing-line report", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Match odds" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Filter by league" }),
  ).toBeVisible();

  const report = page
    .getByRole("link", { name: /Closing line report/ })
    .first();
  await expect(report).toBeVisible();
  await report.click();

  // Match detail for a finished match: closing-line panel, closing-odds table,
  // and the client-side Recharts svg (regression guard for chart hydration).
  await expect(
    page.getByRole("heading", { name: "Closing line", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Closing odds" }),
  ).toBeVisible();
  await expect(
    page.locator("section[aria-label='Odds movement'] svg").first(),
  ).toBeVisible();
});

test("about page shows the live pipeline health panel", async ({ page }) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: "How LineDrift works" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pipeline health" }),
  ).toBeVisible();
});
