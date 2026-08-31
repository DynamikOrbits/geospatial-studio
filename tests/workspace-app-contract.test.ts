import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Geospatial Studio declares and implements the Workspace app contract", async () => {
  const manifest = JSON.parse(await readFile(
    new URL("../apps/geolibre-desktop/public/.well-known/dynamik-app", import.meta.url),
    "utf8",
  ));
  assert.equal(manifest.app.slug, "geospatial-studio");
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

  const nginx = await readFile(
    new URL("../docker/nginx.conf", import.meta.url),
    "utf8",
  );
  for (const marker of [
    "location = /.well-known/dynamik-app",
    "default_type application/json",
    "try_files $uri =404",
  ]) {
    assert.ok(nginx.includes(marker), `missing discovery route marker: ${marker}`);
  }

  const dockerfile = await readFile(
    new URL("../Dockerfile", import.meta.url),
    "utf8",
  );
  assert.ok(
    dockerfile.includes("chmod -R a+rX /usr/share/nginx/html"),
    "runtime image must make built discovery metadata readable by nginx",
  );

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

test("Geospatial Studio derives one exact Workspace parent origin", async () => {
  const { resolveDynamikWorkspaceOrigin } = await import(
    "../apps/geolibre-desktop/src/lib/dynamik-workspace-app.js"
  );
  assert.equal(resolveDynamikWorkspaceOrigin(undefined, "https://workspace.example/view/1"), "https://workspace.example");
  assert.equal(resolveDynamikWorkspaceOrigin("https://override.example/path", "https://ignored.example"), "https://override.example");
  assert.equal(resolveDynamikWorkspaceOrigin(undefined, "javascript:alert(1)"), null);
  assert.equal(resolveDynamikWorkspaceOrigin(undefined, ""), null);
});
