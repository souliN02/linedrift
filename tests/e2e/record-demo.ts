// Records the README demo clip against a locally running dev server:
// dashboard → a closing-line report → Home/Draw/Away chart toggles.
// Not a test (Playwright only discovers *.spec.ts). Usage:
//   pnpm dev                        # in one terminal, with DATABASE_URL set
//   pnpm exec tsx tests/e2e/record-demo.ts
// then convert the printed .webm to docs/demo.gif with ffmpeg (see PR notes).
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const SIZE = { width: 900, height: 620 };

async function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: "test-results/demo", size: SIZE },
    colorScheme: "dark",
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await pause(1500);
  await page.mouse.wheel(0, 260);
  await pause(1200);

  await page
    .getByRole("link", { name: /Closing line report/ })
    .first()
    .click();
  await page.waitForLoadState("networkidle");
  await pause(600);
  await page.mouse.wheel(0, 190);
  await pause(1400);

  const toggle = page.locator("div[role='group'][aria-label='Outcome'] button");
  await toggle.nth(1).click(); // Draw
  await pause(1500);
  await toggle.nth(2).click(); // Away
  await pause(1500);
  await toggle.nth(0).click(); // back to Home
  await pause(1500);

  const video = page.video();
  await context.close(); // flushes the recording
  console.log("webm:", await video?.path());
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
