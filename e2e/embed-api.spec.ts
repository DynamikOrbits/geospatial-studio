import { expect, test } from "@playwright/test";

const HOST_PATH = "/__embed-api-host";
const E2E_PORT = Number(process.env.GEOLIBRE_E2E_PORT ?? "4173");
const HOST_ORIGIN = `http://localhost:${E2E_PORT}`;

test("keeps the isolated Workspace embed free of startup diagnostics", async ({
  context,
  page,
}) => {
  let serviceWorkerRequests = 0;
  context.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/sw.js")) {
      serviceWorkerRequests += 1;
    }
  });
  // The production embed origin deliberately returns 410 for this path. An
  // embedded app must not attempt registration in the first place.
  await page.route("**/sw.js", async (route) => {
    await route.fulfill({ status: 410, contentType: "text/plain", body: "disabled for embeds" });
  });
  // Exercise the MapLibre 6 missing-image path deterministically. The style's
  // absent `circle-11` used to produce the second visible diagnostic even
  // though the map continued rendering correctly.
  await page.route("https://tiles.openfreemap.org/styles/dark", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        sources: {
          places: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [{
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: [2.3522, 48.8566] },
              }],
            },
          },
        },
        layers: [{
          id: "missing-basemap-icon",
          type: "symbol",
          source: "places",
          layout: { "icon-image": "circle-11" },
        }],
      }),
    });
  });

  await page.goto("/?embed=1&welcome=0&theme=dark");

  await expect(page.getByRole("button", { name: "Diagnostics: 0" })).toBeVisible();
  expect(serviceWorkerRequests).toBe(0);
});

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

test("fits an injected layer after cold map startup and captures the complete embedded UI", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1133, height: 687 });
  await page.route(`**${HOST_PATH}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html>
        <style>html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; display: block; }</style>
        <iframe id="geolibre" src="/?embed=1&welcome=0&theme=dark"></iframe>
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
  // Keep this a deterministic cold start: the bridge announces itself before
  // this delayed style makes MapLibre interactive.
  await page.route("https://tiles.openfreemap.org/styles/dark", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
    });
  });

  await page.goto(HOST_PATH);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __embedEvents: Array<{ type?: string }> }).__embedEvents.some(
          (event) => event.type === "ready",
        ),
      ),
    )
    .toBe(true);

  await page.locator("#geolibre").evaluate((frame: HTMLIFrameElement, targetOrigin) => {
    frame.contentWindow?.postMessage(
      {
        v: 2,
        type: "addLayer",
        requestId: "fit-after-cold-start",
        payload: {
          spec: {
            id: "workspace-points",
            name: "Paris and Lyon",
            type: "geojson",
            source: {},
            geojson: {
              type: "FeatureCollection",
              features: [
                { type: "Feature", properties: { name: "Paris" }, geometry: { type: "Point", coordinates: [2.3522, 48.8566] } },
                { type: "Feature", properties: { name: "Lyon" }, geometry: { type: "Point", coordinates: [4.8357, 45.764] } },
              ],
            },
            fit: true,
          },
        },
      },
      targetOrigin,
    );
  }, HOST_ORIGIN);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __embedEvents: Array<{ type?: string; payload?: { requestId?: string; ok?: boolean } }> }).__embedEvents.find(
          (event) => event.type === "ack" && event.payload?.requestId === "fit-after-cold-start",
        ),
      ),
    )
    .toMatchObject({ payload: { ok: true } });

  // captureViewport is required to wait for the queued 800 ms camera fit, so
  // its image proves both the cold-start queue and the complete-UI compositor.
  await page.locator("#geolibre").evaluate((frame: HTMLIFrameElement, targetOrigin) => {
    frame.contentWindow?.postMessage(
      { v: 2, type: "captureViewport", requestId: "capture-fitted-ui", payload: {} },
      targetOrigin,
    );
  }, HOST_ORIGIN);
  const capture = await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as {
          __embedEvents: Array<{
            type?: string;
            payload?: { requestId?: string; ok?: boolean; result?: string; error?: string };
          }>;
        }).__embedEvents.find(
          (event) => event.type === "ack" && event.payload?.requestId === "capture-fitted-ui",
        ),
      ),
      { timeout: 30_000 },
    )
    .toMatchObject({ payload: { ok: true } });
  void capture;

  const result = await page.evaluate(() =>
    (window as unknown as {
      __embedEvents: Array<{
        type?: string;
        payload?: { requestId?: string; result?: string };
      }>;
    }).__embedEvents.find(
      (event) => event.type === "ack" && event.payload?.requestId === "capture-fitted-ui",
    )?.payload?.result,
  );
  expect(result).toMatch(/^data:image\/png;base64,/);
  const captureProof = await page.evaluate(
    (url) =>
      new Promise<{
        width: number;
        height: number;
        topToolbarDarkRatio: number;
        bluePixelCount: number;
      }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            reject(new Error("capture canvas context is unavailable"));
            return;
          }
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let darkToolbarPixels = 0;
          let bluePixelCount = 0;
          const toolbarHeight = 44;
          for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
              const offset = (y * canvas.width + x) * 4;
              const red = pixels[offset] ?? 0;
              const green = pixels[offset + 1] ?? 0;
              const blue = pixels[offset + 2] ?? 0;
              if (y < toolbarHeight && red < 45 && green < 45 && blue < 45) {
                darkToolbarPixels += 1;
              }
              if (blue > 150 && blue > red + 50 && blue > green + 50) {
                bluePixelCount += 1;
              }
            }
          }
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
            topToolbarDarkRatio: darkToolbarPixels / (canvas.width * toolbarHeight),
            bluePixelCount,
          });
        };
        image.onerror = () => reject(new Error("capture did not decode as a PNG"));
        image.src = url;
      }),
    result as string,
  );
  expect(captureProof.width).toBe(1133);
  expect(captureProof.height).toBe(687);
  // The previous clone-based compositor lost the external stylesheet: native
  // gray buttons occupied the toolbar and the injected blue points vanished.
  expect(captureProof.topToolbarDarkRatio).toBeGreaterThan(0.85);
  expect(captureProof.bluePixelCount).toBeGreaterThan(20);
});
