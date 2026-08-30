import { DEFAULT_ELLIPSOID_ID, getPlanetaryBasemapByStyleUrl, useAppStore } from "@geolibre/core";
import { useLayoutEffect } from "react";
import {
  readLastBasemap,
  shouldUseLastBasemapPersistence,
  writeLastBasemap,
} from "../lib/last-basemap";
import { isEmbedded } from "./embedHost";

/** Restore the last basemap into the empty startup workspace and track changes. */
export function useLastBasemapPersistence(): void {
  useLayoutEffect(() => {
    // A framed project is an isolated view supplied by its host. Restoring the
    // last top-level basemap here makes an ephemeral embed depend on unrelated
    // browser history (and writes embed changes back into the full app).
    if (!shouldUseLastBasemapPersistence(isEmbedded())) return;

    const state = useAppStore.getState();
    const storedBasemap = readLastBasemap();

    // Never replace a project that another startup source already loaded.
    if (
      storedBasemap !== null &&
      state.projectGeneration === 0 &&
      state.projectPath === null &&
      !state.isDirty
    ) {
      const ellipsoidId =
        getPlanetaryBasemapByStyleUrl(storedBasemap)?.ellipsoidId ?? DEFAULT_ELLIPSOID_ID;
      useAppStore.setState({
        basemapStyleUrl: storedBasemap,
        preferences: {
          ...state.preferences,
          map: { ...state.preferences.map, ellipsoidId },
        },
      });
    }

    writeLastBasemap(useAppStore.getState().basemapStyleUrl);
    return useAppStore.subscribe((next, previous) => {
      if (next.basemapStyleUrl !== previous.basemapStyleUrl) {
        writeLastBasemap(next.basemapStyleUrl);
      }
    });
  }, []);
}
