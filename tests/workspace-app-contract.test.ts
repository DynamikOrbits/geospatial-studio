import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GeoLibre declares and implements the Workspace app contract", async () => {
  const manifest = JSON.parse(await readFile(
    new URL("../apps/geolibre-desktop/public/.well-known/dynamik-app", import.meta.url),
    "utf8",
  ));
  assert.deepEqual(manifest.app.technology, {
    language: "TypeScript",
    ui: "React",
    application_framework: "Vite",
    styling: "Tailwind CSS",
  });
  assert.equal(manifest.control.canonical, "dynamik_capability_registry");
  assert.equal(manifest.control.mcp, "https://api.dynamikorbits.com/mcp");
  assert.deepEqual(manifest.control.capability_ids, [
    "agent.workspace.application.open",
    "agent.workspace.application.status",
    "agent.workspace.capture",
  ]);
  assert.deepEqual(manifest.workspace_contract.theme, {
    inheritance: true,
    acknowledgement: true,
    preferences: ["system", "light", "dark"],
    presets: true,
  });
  assert.equal(manifest.workspace_contract.shell, "dynamik.workspace.app-frame.v1");

  const bridge = await readFile(
    new URL("../apps/geolibre-desktop/src/lib/dynamik-workspace-app.ts", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "dynamik.workspace.app",
    "application.ready",
    "theme.changed",
    "theme.applied",
    "dynamik.workspace.app-frame.v1",
  ]) {
    assert.ok(bridge.includes(marker), `missing bridge marker: ${marker}`);
  }
});

test("GeoLibre derives one exact Workspace parent origin", async () => {
  const { resolveDynamikWorkspaceOrigin } = await import(
    "../apps/geolibre-desktop/src/lib/dynamik-workspace-app.js"
  );
  assert.equal(resolveDynamikWorkspaceOrigin(undefined, "https://workspace.example/view/1"), "https://workspace.example");
  assert.equal(resolveDynamikWorkspaceOrigin("https://override.example/path", "https://ignored.example"), "https://override.example");
  assert.equal(resolveDynamikWorkspaceOrigin(undefined, "javascript:alert(1)"), null);
  assert.equal(resolveDynamikWorkspaceOrigin(undefined, ""), null);
});
