import { expect, test } from "@playwright/test";
import { layerRow, waitForMap } from "./helpers";

/**
 * G2 spike: the walker-shell bundled drop-in (a satellite-constellation demo
 * plugin) must surface as ordinary Layers-panel entries with working
 * visibility, proving the layer contract accepts a non-geospatial, plugin-fed,
 * time-driven layer. The drop-in payload lives outside this repo
 * (public/plugins/ is git-ignored by design), so the spec skips cleanly on a
 * build that does not carry it.
 */
test.beforeEach(async ({ page }) => {
  const manifest = await page.request.get("/plugins/walker-shell/plugin.json");
  test.skip(!manifest.ok(), "walker-shell drop-in not present in this build");
});

test("the walker shell registers two normal layers whose visibility toggles", async ({
  page,
}) => {
  await waitForMap(page);

  const sats = layerRow(page, "Walker shell satellites");
  const orbits = layerRow(page, "Walker shell orbits");
  // The plugin waits for the map before registering, so allow a little slack.
  await expect(sats).toBeVisible({ timeout: 15_000 });
  await expect(orbits).toBeVisible();

  // The rows behave like any other layer: hide, then show again.
  await sats.locator('button[aria-label="Hide layer"]').click();
  await expect(sats.locator('button[aria-label="Show layer"]')).toBeVisible();
  await sats.locator('button[aria-label="Show layer"]').click();
  await expect(sats.locator('button[aria-label="Hide layer"]')).toBeVisible();
});
