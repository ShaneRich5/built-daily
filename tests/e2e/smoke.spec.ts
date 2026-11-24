import { expect, test } from "@playwright/test";

/**
 * Runs without Firebase credentials or a test account: the app degrades to a
 * signed-out shell when the NEXT_PUBLIC_FIREBASE_* vars are absent, which is
 * how CI runs it. The signed-in specs skip themselves in that case.
 */
test.describe("smoke", () => {
  test("login page renders its sign-in prompt", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Built Daily", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Sign in with email or create a new account."),
    ).toBeVisible();
  });

  for (const path of ["/", "/progress", "/history"]) {
    test(`${path} responds without a server error`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
    });
  }
});
