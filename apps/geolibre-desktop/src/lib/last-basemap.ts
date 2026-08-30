import { LAST_BASEMAP_STORAGE_KEY } from "./storage-keys";

/** Embedded maps are ephemeral and must not inherit or mutate host-wide map preferences. */
export function shouldUseLastBasemapPersistence(embedded: boolean): boolean {
  return !embedded;
}

/** Read the last selected basemap. An empty string is the valid blank basemap. */
export function readLastBasemap(storage?: Storage): string | null {
  try {
    const target = storage ?? globalThis.localStorage;
    return target.getItem(LAST_BASEMAP_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist the current basemap without making storage availability app-critical. */
export function writeLastBasemap(styleUrl: string, storage?: Storage): void {
  try {
    const target = storage ?? globalThis.localStorage;
    target.setItem(LAST_BASEMAP_STORAGE_KEY, styleUrl);
  } catch {
    // Persistence is best-effort; storage can be disabled or full.
  }
}
