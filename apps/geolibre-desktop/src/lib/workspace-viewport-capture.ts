import { captureMapImage, type MapLike } from "./print-layout-export";

export const MAX_WORKSPACE_CAPTURE_DIMENSION = 4096;

function boundedViewportDimension(value: number, name: string): number {
  const rounded = Math.floor(value);
  if (!Number.isFinite(rounded) || rounded < 1) {
    throw new Error(`Workspace ${name} is not available for capture`);
  }
  if (rounded > MAX_WORKSPACE_CAPTURE_DIMENSION) {
    throw new Error(
      `Workspace ${name} exceeds the ${MAX_WORKSPACE_CAPTURE_DIMENSION}px capture limit`,
    );
  }
  return rounded;
}

/**
 * Capture the complete visible GeoLibre application viewport for a trusted
 * embedding host. This is deliberately separate from `exportImage`, whose
 * product contract remains a map-only PNG.
 *
 * html2canvas-pro rasterizes the application chrome (toolbars, layer browser,
 * dialogs and controls). The live MapLibre/deck.gl canvases are composited a
 * second time from the map's preserved drawing buffer so WebGL content cannot
 * silently disappear from an otherwise valid screenshot.
 */
export async function captureWorkspaceViewportImage(map: MapLike): Promise<string> {
  const root = document.getElementById("root");
  if (!root || !root.isConnected) {
    throw new Error("The GeoLibre application root is not available for capture");
  }

  const width = boundedViewportDimension(window.innerWidth, "width");
  const height = boundedViewportDimension(window.innerHeight, "height");
  const rootRect = root.getBoundingClientRect();
  const mapRect = map.getContainer().getBoundingClientRect();
  if (mapRect.width < 1 || mapRect.height < 1) {
    throw new Error("The map viewport is not available for capture");
  }

  const { default: html2canvas } = await import("html2canvas-pro");
  const image = await html2canvas(root, {
    allowTaint: false,
    backgroundColor: null,
    height,
    logging: false,
    scale: 1,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    width,
    windowHeight: height,
    windowWidth: width,
  });

  const context = image.getContext("2d");
  if (!context) {
    throw new Error("Could not acquire a 2D context for Workspace capture");
  }
  const mapImage = captureMapImage(map).image;
  const left = Math.max(0, mapRect.left - rootRect.left);
  const top = Math.max(0, mapRect.top - rootRect.top);
  const right = Math.min(width, mapRect.right - rootRect.left);
  const bottom = Math.min(height, mapRect.bottom - rootRect.top);
  const destinationWidth = right - left;
  const destinationHeight = bottom - top;
  if (destinationWidth < 1 || destinationHeight < 1) {
    throw new Error("The map viewport is outside the visible Workspace capture");
  }
  context.drawImage(
    mapImage,
    0,
    0,
    mapImage.width,
    mapImage.height,
    left,
    top,
    destinationWidth,
    destinationHeight,
  );
  return image.toDataURL("image/png");
}
