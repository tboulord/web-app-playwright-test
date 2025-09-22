import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { getAdminCredentials } from "../data/admin-credentials";
import { LoginPage } from "./pom/LoginPage";
import { DashboardPage } from "./pom/DashboardPage";

test.describe("Authentication", () => {
  // Confirms that valid credentials lead to the dashboard view.
  test("allows signing in with valid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    const credentials = getAdminCredentials();
    await loginPage.login(credentials.username, credentials.password);

    const dashboardPage = new DashboardPage(page);
    await expect(dashboardPage.heading).toBeVisible();
  });

  // Ensures an incorrect password shows the appropriate alert.
  test("surfaces incorrect password feedback", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const credentials = getAdminCredentials();
    await loginPage.login(credentials.username, "not-the-password");

    await expect(loginPage.incorrectCredentialsAlert).toBeVisible();
  });

  // Verifies the login form is accessible according to axe-core.
  test("login form passes focused accessibility checks", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const formHandle = await loginPage.form.elementHandle();
    if (!formHandle) {
      throw new Error("Expected login form element to be available for accessibility analysis");
    }

    const results = await new AxeBuilder({ page })
      .include(formHandle)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
