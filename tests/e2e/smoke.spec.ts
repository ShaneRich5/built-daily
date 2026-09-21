import { expect, test } from "@playwright/test";

/**
 * Runs without Firebase credentials: the app degrades to a signed-out shell
 * when the NEXT_PUBLIC_FIREBASE_* vars are absent, which is how CI runs it.
 */
test.describe("smoke", () => {
  test("home page renders the journal heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Built Daily", level: 1 }),
    ).toBeVisible();
  });

  test("login page renders its sign-in prompt", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Built Daily", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Sign in with email or create a new account."),
    ).toBeVisible();
  });

  test("progress page is reachable", async ({ page }) => {
    const response = await page.goto("/progress");
    expect(response?.status()).toBeLessThan(400);
  });
});
