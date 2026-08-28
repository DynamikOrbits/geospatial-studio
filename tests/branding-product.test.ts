import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_ABOUT_LINKS,
  PRODUCT_FEEDBACK_URL,
  PRODUCT_REPOSITORY_URL,
  PRODUCT_WEBSITE_URL,
  shouldOfferProductUpdates,
  UPSTREAM_PROJECT_URL,
} from "../apps/geolibre-desktop/src/branding/product";

describe("Geospatial Studio product identity", () => {
  it("routes product and feedback links to Dynamik Orbits", () => {
    assert.equal(PRODUCT_WEBSITE_URL, "https://dynamikorbits.com");
    assert.equal(
      PRODUCT_REPOSITORY_URL,
      "https://github.com/DynamikOrbits/geospatial-studio"
    );
    assert.equal(PRODUCT_FEEDBACK_URL, `${PRODUCT_REPOSITORY_URL}/issues`);
  });

  it("keeps explicit GeoLibre upstream attribution in About", () => {
    assert.equal(UPSTREAM_PROJECT_URL, "https://github.com/opengeos/GeoLibre");
    assert.ok(
      PRODUCT_ABOUT_LINKS.some((link) => link.href === UPSTREAM_PROJECT_URL)
    );
  });

  it("offers update checks only to non-Store desktop builds", () => {
    assert.equal(shouldOfferProductUpdates(false, false), false);
    assert.equal(shouldOfferProductUpdates(true, false), true);
    assert.equal(shouldOfferProductUpdates(true, true), false);
  });
});
