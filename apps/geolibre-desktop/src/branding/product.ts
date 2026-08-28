import type { ParseKeys } from "i18next";

/** Product identity and public destinations owned by the Geospatial Studio fork. */
export const PRODUCT_WEBSITE_URL = "https://dynamikorbits.com";
export const PRODUCT_REPOSITORY_URL =
  "https://github.com/DynamikOrbits/geospatial-studio";
export const PRODUCT_FEEDBACK_URL = `${PRODUCT_REPOSITORY_URL}/issues`;
export const UPSTREAM_PROJECT_URL = "https://github.com/opengeos/GeoLibre";

export const PRODUCT_ABOUT_LINKS: ReadonlyArray<{
  labelKey: ParseKeys;
  href: string;
}> = [
  { labelKey: "about.productWebsite", href: PRODUCT_WEBSITE_URL },
  { labelKey: "about.productRepository", href: PRODUCT_REPOSITORY_URL },
  { labelKey: "about.upstreamProject", href: UPSTREAM_PROJECT_URL },
];

/**
 * Hosted users always receive the version deployed by Dynamik Orbits, so an
 * in-app release check is meaningful only for an installed desktop build.
 * Store packages remain governed by their store's own updater.
 */
export function shouldOfferProductUpdates(
  desktopRuntime: boolean,
  storeBuild: boolean
): boolean {
  return desktopRuntime && !storeBuild;
}
