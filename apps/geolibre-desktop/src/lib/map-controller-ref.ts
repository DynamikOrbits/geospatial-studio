import { type RefObject, useEffect, useSyncExternalStore } from "react";
import type { MapEngine } from "@geolibre/map";

/**
 * The embed transport is mounted at App level so a host can discover the
 * application while DesktopShell is still gated. DesktopShell keeps owning the
 * engine ref its canvases publish into and lends it here through
 * {@link useAppMapEngineBridge}.
 */
let shellEngineRef: RefObject<MapEngine | null> | null = null;

/** The live map engine for this application window; `null` without a shell. */
export const appMapControllerRef: RefObject<MapEngine | null> = {
  get current() {
    return shellEngineRef?.current ?? null;
  },
};

let appMapReadyGeneration = 0;
const generationListeners = new Set<() => void>();

function subscribeToGeneration(listener: () => void): () => void {
  generationListeners.add(listener);
  return () => {
    generationListeners.delete(listener);
  };
}

function readGeneration(): number {
  return appMapReadyGeneration;
}

/**
 * DesktopShell's side of the bridge: lend its engine ref to App, and forward
 * every map-ready generation change (a canvas publishing an engine, a renderer
 * hand-off, a remount) so App-level hooks can re-arm their map listeners.
 */
export function useAppMapEngineBridge(
  engineRef: RefObject<MapEngine | null>,
  mapReadyGeneration: number,
): void {
  useEffect(() => {
    shellEngineRef = engineRef;
    return () => {
      if (shellEngineRef === engineRef) shellEngineRef = null;
    };
  }, [engineRef]);
  useEffect(() => {
    appMapReadyGeneration += 1;
    for (const listener of generationListeners) listener();
  }, [mapReadyGeneration]);
}

/** App's side: a counter that changes whenever the shell's engine may have. */
export function useAppMapReadyGeneration(): number {
  return useSyncExternalStore(subscribeToGeneration, readGeneration, readGeneration);
}
