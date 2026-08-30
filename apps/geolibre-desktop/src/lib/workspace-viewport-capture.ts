import { captureMapImage, type MapLike } from "./print-layout-export";

export const MAX_WORKSPACE_CAPTURE_DIMENSION = 4096;
const CAPTURE_NODE_ATTRIBUTE = "data-geolibre-capture-node";
const IGNORED_COMPUTED_STYLE_PROPERTIES = new Set(["all", "content", "d"]);

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
 * Give every source node a short-lived stable identity so its computed styles
 * can be copied to the matching html2canvas clone. The Vite production build
 * loads its Tailwind bundle from an external stylesheet; a freshly created
 * capture iframe can be parsed before that stylesheet finishes loading, which
 * otherwise produces an unstyled but technically valid PNG.
 */
function markCaptureNodes(root: HTMLElement): {
  elements: Element[];
  restore: () => void;
} {
  const elements: Element[] = [root, ...root.querySelectorAll("*")];
  const previous = elements.map((element) => element.getAttribute(CAPTURE_NODE_ATTRIBUTE));
  elements.forEach((element, index) => {
    element.setAttribute(CAPTURE_NODE_ATTRIBUTE, String(index));
  });
  return {
    elements,
    restore: () => {
      elements.forEach((element, index) => {
        const value = previous[index];
        if (value === null) element.removeAttribute(CAPTURE_NODE_ATTRIBUTE);
        else element.setAttribute(CAPTURE_NODE_ATTRIBUTE, value);
      });
    },
  };
}

/** Freeze the live computed layout onto the matching cloned elements. */
function freezeComputedCaptureStyles(sourceElements: Element[], clonedRoot: HTMLElement): void {
  const clonedElements = new Map<string, Element>();
  for (const element of [clonedRoot, ...clonedRoot.querySelectorAll(`[${CAPTURE_NODE_ATTRIBUTE}]`)]) {
    const id = element.getAttribute(CAPTURE_NODE_ATTRIBUTE);
    if (id !== null) clonedElements.set(id, element);
  }

  sourceElements.forEach((source, index) => {
    const target = clonedElements.get(String(index));
    if (!(target instanceof HTMLElement || target instanceof SVGElement)) return;
    const computed = getComputedStyle(source);
    const declarations: string[] = [];
    for (let propertyIndex = computed.length - 1; propertyIndex >= 0; propertyIndex -= 1) {
      const property = computed.item(propertyIndex);
      if (!property || property.startsWith("--") || IGNORED_COMPUTED_STYLE_PROPERTIES.has(property)) {
        continue;
      }
      const value = computed.getPropertyValue(property);
      if (value) declarations.push(`${property}:${value}`);
    }
    target.style.cssText = `${declarations.join(";")};transition-property:none;`;
  });
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
  const marked = markCaptureNodes(root);
  let image: HTMLCanvasElement;
  try {
    image = await html2canvas(root, {
      allowTaint: false,
      backgroundColor: null,
      height,
      logging: false,
      onclone: (_document, clonedRoot) => {
        freezeComputedCaptureStyles(marked.elements, clonedRoot);
      },
      scale: 1,
      scrollX: 0,
      scrollY: 0,
      useCORS: true,
      width,
      windowHeight: height,
      windowWidth: width,
    });
  } finally {
    marked.restore();
  }

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
