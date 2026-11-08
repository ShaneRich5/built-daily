import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Regression test for #38: iOS Safari auto-zooms the page (and never zooms
 * back out) whenever a focused input's computed font-size is below 16px.
 * Playwright's mobile-chrome project can't reproduce that WebKit zoom
 * behavior directly, so this asserts the actual fix instead: every editable
 * field in the active-workout / session-editing flow renders at >= 16px on
 * a phone-width viewport, which is what prevents the zoom from firing at all.
 */

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const MIN_MOBILE_FONT_PX = 16;

async function expectAtLeastMobileFontSize(locator: Locator) {
  await expect(locator).toBeVisible();
  const fontSizePx = await locator.evaluate(
    (el) => parseFloat(getComputedStyle(el).fontSize),
  );
  expect(fontSizePx).toBeGreaterThanOrEqual(MIN_MOBILE_FONT_PX);
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(EMAIL!);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD!);
  await page
    .locator("form")
    .getByRole("button", { name: "Sign in" })
    .click();
  await expect(page).toHaveURL("/");
}

async function discardActiveWorkout(page: Page) {
  await page.getByRole("button", { name: "More actions" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("menuitem", { name: "Delete workout" }).click();
  await expect(page).toHaveURL("/");
}

test.describe("mobile input zoom (issue #38)", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set",
  );

  test("editable fields in an active workout are at least 16px on mobile", async ({
    page,
  }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Start workout" }).click();
    await expect(page).toHaveURL(/\/workout\?s=/);

    // Name / date / time / note — the workout details sheet, opened from the header.
    await page.getByRole("button", { name: /Edit workout name/ }).click();
    await expectAtLeastMobileFontSize(page.getByLabel("Name", { exact: true }));
    await expectAtLeastMobileFontSize(page.getByLabel("Date", { exact: true }));
    await expectAtLeastMobileFontSize(page.getByLabel("Time", { exact: true }));
    await expectAtLeastMobileFontSize(page.getByLabel("Workout note"));
    await page.keyboard.press("Escape");

    // Exercise search, then the set inputs on the quick card.
    await page.getByRole("button", { name: "Add exercise" }).first().click();
    await expectAtLeastMobileFontSize(
      page.getByRole("searchbox", { name: "Search exercises" }),
    );
    await page.getByRole("searchbox", { name: "Search exercises" }).fill("back squat");
    await page.getByRole("button", { name: /^Barbell back squat/ }).click();
    await page.getByRole("button", { name: "Add 1 exercise" }).click();

    await expectAtLeastMobileFontSize(page.getByLabel("Weight for set 1"));
    await expectAtLeastMobileFontSize(page.getByLabel("Reps for set 1"));

    // Details screen: set note and exercise note.
    await page.getByRole("button", { name: /^Details/ }).click();
    await page.getByRole("button", { name: "Add a note to set 1" }).click();
    await expectAtLeastMobileFontSize(
      page.getByRole("textbox", { name: "Note for set 1" }),
    );
    await expectAtLeastMobileFontSize(page.getByLabel("Exercise note"));
    await page.getByRole("button", { name: "Done" }).click();

    await discardActiveWorkout(page);
  });
});
