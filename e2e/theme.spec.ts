import { expect, test } from "@playwright/test";
import { dropGeoJson, layerRow, readFixture, waitForMap } from "./helpers";

const FIXTURE_TEXT = readFixture("smoke.geojson");
const FIXTURE_FEATURE_COUNT = (JSON.parse(FIXTURE_TEXT) as { features: unknown[] }).features.length;

/**
 * Dark theme is the app's most theme-sensitive surface and ships changes
 * constantly, yet the rest of the E2E suite runs light-only. The documented
 * `?theme=dark` embed parameter sets the initial theme with no click-through
 * (see useThemeMode), so this drives the core flow — map, layer panel, and
 * attribute table — entirely in dark mode as a regression guard against dark
 * theme breaking the app shell or the data path.
 */
test("loads a layer and opens the attribute table in dark theme", async ({ page }) => {
  await waitForMap(page, "/?theme=dark");

  // The theme applies as `class="dark"` on <html> with a matching color-scheme.
  await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
  await expect(page.locator("html")).toHaveAttribute("style", /dark/);

  // Core data path must work unchanged under the dark theme.
  await dropGeoJson(page, "smoke", FIXTURE_TEXT);
  const row = layerRow(page, "smoke");
  await expect(row).toBeVisible();

  await row.locator('button[aria-label="Layer actions"]').click();
  await page.getByRole("menuitem", { name: "Open attribute table" }).click();
  await expect(page.getByTestId("attribute-table")).toBeVisible();
  await expect(page.locator('[data-testid="attribute-table"] tbody tr')).toHaveCount(
    FIXTURE_FEATURE_COUNT,
  );
});

/**
 * The Dynamik Workspace (iframe parent) pushes DS tokens. Dark DS borders are
 * translucent white; they must be composited over the surface rather than
 * become solid white, and the DS `--accent` colour must not overwrite shadcn's
 * `--accent` HSL channels (which would make every `bg-accent` invalid).
 */
test("inherits a dark Workspace theme with dim borders and a valid accent", async ({ page }) => {
  await page.route("**/__workspace-parent.html", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><iframe title="app" src="/" style="width:100%;height:800px;border:0"></iframe>',
  }));
  await page.goto("/__workspace-parent.html");
  const frame = page.frameLocator("iframe");
  await expect(frame.getByTestId("map-canvas")).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.querySelector("iframe")!.contentWindow!.postMessage({
    source: "dynamik.workspace.app", version: 1, type: "theme.changed",
    payload: {
      requestId: "theme-1", colorScheme: "dark", preset: "theme-dynamik", tokens: {
        "--surface-base": "rgb(5, 5, 5)",
        "--surface-overlay": "rgb(30, 30, 30)",
        "--border-default": "rgba(255, 255, 255, 0.22)",
        "--border-strong": "rgba(255, 255, 255, 0.36)",
        "--accent": "rgb(99, 102, 241)",
      },
    },
  }, location.origin));
  const app = page.frames().find((candidate) => candidate !== page.mainFrame())!;
  await expect(frame.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
  await expect(frame.locator("html")).toHaveAttribute("data-dynamik-workspace", "true");
  const { border, accent } = await app.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "border border-border bg-accent";
    document.body.append(probe);
    const style = getComputedStyle(probe);
    const result = { border: style.borderTopColor, accent: style.backgroundColor };
    probe.remove();
    return result;
  });
  const channels = border.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  expect(Math.max(...channels), border).toBeLessThan(80);
  expect(accent).not.toBe("rgba(0, 0, 0, 0)");
  // Light/dark follows the Workspace, so the app's own toggle is disabled.
  await expect(frame.getByRole("button", { name: "Switch to Light Mode" })).toBeDisabled();
});
