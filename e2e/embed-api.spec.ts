import { expect, test } from "@playwright/test";

const HOST_PATH = "/__embed-api-host";
const E2E_PORT = Number(process.env.GEOLIBRE_E2E_PORT ?? "4173");
const HOST_ORIGIN = `http://localhost:${E2E_PORT}`;

test("exposes the embed bridge and accepts store-backed layers before the map is ready", async ({
  page,
}) => {
  await page.route(`**${HOST_PATH}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
        <iframe id="geolibre" src="/?embed=1&welcome=0"></iframe>
        <script>
          window.__embedEvents = [];
          window.addEventListener("message", (event) => {
            if (event.source === document.querySelector("#geolibre").contentWindow) {
              window.__embedEvents.push(event.data);
            }
          });
        </script>`,
    });
  });
  await page.route("**/geolibre-runtime-config.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: `window.__GEOLIBRE_DEPLOYMENT_ENV__ = {
        VITE_GEOLIBRE_EMBED_ORIGINS: "${HOST_ORIGIN}"
      };`,
    });
  });
  // Reproduce a background/cold-start map that has not reached MapLibre's
  // `load` event. The postMessage transport and store-backed commands must not
  // be coupled to that remote style request.
  await page.route("https://tiles.openfreemap.org/styles/dark", async (route) => {
    await route.fulfill({ status: 503, contentType: "text/plain", body: "style intentionally unavailable" });
  });

  await page.goto(HOST_PATH);

  await expect
    .poll(() => page.evaluate(() => (
      (window as unknown as { __embedEvents: unknown[] }).__embedEvents.some((event) => (
        typeof event === "object"
        && event !== null
        && (event as { v?: unknown }).v === 2
        && (event as { source?: unknown }).source === "geolibre"
        && (event as { type?: unknown }).type === "ready"
      ))
    )))
    .toBe(true);

  await page.locator("#geolibre").evaluate((frame: HTMLIFrameElement, targetOrigin) => {
    frame.contentWindow?.postMessage({
      v: 2,
      type: "addLayer",
      requestId: "before-map-ready",
      payload: {
        spec: {
          id: "workspace-points",
          name: "Workspace points",
          type: "geojson",
          source: {},
          geojson: { type: "FeatureCollection", features: [] },
        },
      },
    }, targetOrigin);
  }, HOST_ORIGIN);

  await expect
    .poll(() => page.evaluate(() => {
      const events = (window as unknown as { __embedEvents: unknown[] }).__embedEvents;
      return events.find((event) => (
        typeof event === "object"
        && event !== null
        && (event as { type?: unknown }).type === "ack"
        && (event as { payload?: { requestId?: unknown } }).payload?.requestId === "before-map-ready"
      ));
    }))
    .toMatchObject({
      v: 2,
      source: "geolibre",
      type: "ack",
      payload: { requestId: "before-map-ready", ok: true, result: "workspace-points" },
    });
});
