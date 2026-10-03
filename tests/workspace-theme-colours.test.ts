import assert from "node:assert/strict";
import test from "node:test";
import { rgbaToHslChannels } from "../apps/geolibre-desktop/src/lib/dynamik-workspace-app.ts";

const lightness = (channels: string) => Number(channels.split(" ")[2]!.replace("%", ""));

test("translucent Workspace borders are composited over the surface, not turned solid", () => {
  // Dark DS border: white at 22% over a near-black surface is a dim grey, not white.
  const border = rgbaToHslChannels([255, 255, 255, 0.22], [5, 5, 5, 1]);
  assert.ok(lightness(border) > 20 && lightness(border) < 26, border);
  // Opaque colours are unchanged.
  assert.equal(rgbaToHslChannels([255, 255, 255, 1]), "0.0 0.0% 100.0%");
  // Light mode: black at 22% over white stays a light grey.
  const light = lightness(rgbaToHslChannels([0, 0, 0, 0.22], [255, 255, 255, 1]));
  assert.ok(light > 75 && light < 81, String(light));
});
