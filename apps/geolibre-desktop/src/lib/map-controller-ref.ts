import type { MapController } from "@geolibre/map";

/**
 * The single live map controller for this application window.
 *
 * The embed transport is mounted at App level so a host can discover the
 * application while DesktopShell is still gated. DesktopShell and MapCanvas
 * populate the same ref once the interactive map exists.
 */
export const appMapControllerRef: { current: MapController | null } = {
  current: null,
};
