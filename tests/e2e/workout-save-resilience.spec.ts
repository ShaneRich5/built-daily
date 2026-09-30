import { expect, test, type Page } from "@playwright/test";

/**
 * Regression coverage for a reported bug: a workout stuck in "in progress"
 * forever because the Finish flow (components/active-workout-from-url.tsx)
 * swallowed any Firestore write error with a bare `catch {}`, leaving the
 * session doc's status untouched and showing a misleading "sign in next
 * time" message even when the user was fully signed in.
 *
 * These tests assert the contract "saving a workout always works": either
 * the finish write succeeds, or — if it transiently fails — the user is
 * told the truth (not a sign-in prompt) and given a real retry path that
 * succeeds once the network recovers. Nothing here should leave a session
 * silently parked in "in progress".
 */

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(EMAIL!);
  await page.getByRole("textbox", { name: "Password" }).fill(PASSWORD!);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}

async function startWorkoutWithOneSet(page: Page) {
  await page.getByRole("button", { name: "Start workout" }).click();
  await expect(page).toHaveURL(/\/workout\?s=/);

  await page.getByText("Add Exercise", { exact: true }).first().click();
  await page.getByRole("button", { name: /^Barbell back squat/ }).click();

  await page.getByLabel("Weight for set 1").fill("135");
  await page.getByLabel("Reps for set 1").fill("5");
}

async function deleteWorkoutFromSessionDetail(page: Page) {
  await page.getByRole("button", { name: "More actions" }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("menuitem", { name: "Delete workout" }).click();
}

test.describe("workout save resilience", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD not set",
  );

  test("finishing a workout saves it and it never shows as stuck in progress", async ({
    page,
  }) => {
    await signIn(page);
    await startWorkoutWithOneSet(page);

    await page.getByRole("button", { name: /^Finish/ }).click();
    await expect(page.getByText("Workout saved")).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL("/");

    const card = page.getByRole("link", { name: /Barbell back squat/ }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText("In progress")).toHaveCount(0);
    await expect(card.getByText("Finished")).toBeVisible();

    await card.click();
    await deleteWorkoutFromSessionDetail(page);
  });

  test("a failed finish write offers a real retry instead of a misleading sign-in message", async ({
    page,
  }) => {
    await signIn(page);
    await startWorkoutWithOneSet(page);

    let blockFirestore = true;
    await page.route("**/firestore.googleapis.com/**", (route) => {
      if (blockFirestore) {
        return route.abort("connectionfailed");
      }
      return route.continue();
    });

    await page.getByRole("button", { name: /^Finish/ }).click();

    // Signed-in user, transient failure: must NOT claim they weren't signed
    // in, and must offer a way to actually save the workout.
    await expect(page.getByText("Couldn't save")).toBeVisible();
    await expect(page.getByText("Sign in before finishing")).toHaveCount(0);
    const retryButton = page.getByRole("button", {
      name: "Try saving again",
    });
    await expect(retryButton).toBeVisible();

    blockFirestore = false;
    await retryButton.click();

    await expect(page.getByText("Workout saved")).toBeVisible();
    await page.unroute("**/firestore.googleapis.com/**");

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL("/");

    const card = page.getByRole("link", { name: /Barbell back squat/ }).first();
    await expect(card).toBeVisible();
    await expect(card.getByText("In progress")).toHaveCount(0);

    await card.click();
    await deleteWorkoutFromSessionDetail(page);
  });
});
