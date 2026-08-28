import { expect, test } from "@playwright/test";

test("Help presents Geospatial Studio identity on the hosted app", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help" }).click();

  const helpMenu = page.getByRole("menu");
  await expect(
    helpMenu.getByRole("menuitem", { name: "Website" })
  ).toBeVisible();
  await expect(
    helpMenu.getByRole("menuitem", { name: "GitHub repository" })
  ).toBeVisible();
  await expect(
    helpMenu.getByRole("menuitem", { name: "Give Feedback" })
  ).toBeVisible();
  await expect(
    helpMenu.getByRole("menuitem", { name: "Check for Updates" })
  ).toHaveCount(0);

  await helpMenu
    .getByRole("menuitem", { name: "About Geospatial Studio" })
    .click();

  const dialog = page.getByRole("dialog", { name: "About Geospatial Studio" });
  await expect(dialog).toContainText(
    "branded fork of the open-source GeoLibre project"
  );
  await expect(
    dialog.getByRole("button", { name: "Check for updates" })
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("link", { name: /Dynamik Orbits website/ })
  ).toHaveAttribute("href", "https://dynamikorbits.com");
  await expect(
    dialog.getByRole("link", { name: /Geospatial Studio repository/ })
  ).toHaveAttribute(
    "href",
    "https://github.com/DynamikOrbits/geospatial-studio"
  );
  await expect(
    dialog.getByRole("link", { name: /GeoLibre upstream project/ })
  ).toHaveAttribute("href", "https://github.com/opengeos/GeoLibre");
});
