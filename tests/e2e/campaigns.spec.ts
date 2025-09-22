import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { getAdminCredentials } from "../data/admin-credentials";
import { LoginPage } from "./pom/LoginPage";
import { DashboardPage } from "./pom/DashboardPage";
import { CampaignListPage } from "./pom/CampaignListPage";
import { NewCampaignPage } from "./pom/NewCampaignPage";
import { CampaignDetailPage } from "./pom/CampaignDetailPage";

const DEFAULT_CONNECTOR_LABEL = "playwright-default-connector (custom)";

async function authenticate(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  const credentials = getAdminCredentials();
  await loginPage.login(credentials.username, credentials.password);

  const dashboardPage = new DashboardPage(page);
  await expect(dashboardPage.heading).toBeVisible();
}

test.describe("Campaign management", () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test("campaign dashboard section has no critical accessibility regressions", async ({
    page,
  }) => {
    const campaignListPage = new CampaignListPage(page);
    await campaignListPage.goto();
    await expect(campaignListPage.heading).toBeVisible();

    const contentSectionHandle = await campaignListPage.contentSection.elementHandle();
    if (!contentSectionHandle) {
      throw new Error(
        "Expected campaign list content section to be available for accessibility analysis",
      );
    }

    const results = await new AxeBuilder({ page })
      .include(contentSectionHandle)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("creates a campaign and lands on its detail view", async ({ page }) => {
    const campaignListPage = new CampaignListPage(page);
    await campaignListPage.goto();
    await expect(campaignListPage.heading).toBeVisible();
    await campaignListPage.startNewCampaign();

    const newCampaignPage = new NewCampaignPage(page);
    await expect(newCampaignPage.heading).toBeVisible();

    const campaignName = `Playwright Campaign ${Date.now()}`;
    await newCampaignPage.fillName(campaignName);
    await newCampaignPage.fillInitialPrompt(
      "Initial instructions for automated verification.",
    );
    await newCampaignPage.addObjective("Validate E2E creation flow.");
    await newCampaignPage.selectConnector(DEFAULT_CONNECTOR_LABEL);

    await Promise.all([
      page.waitForURL(/\/campaigns\/.+$/),
      newCampaignPage.submit(),
    ]);

    const detailPage = new CampaignDetailPage(page);
    await expect(detailPage.headingWithName(campaignName)).toBeVisible();
  });

  test("blocks campaign creation when no connector is selected", async ({
    page,
  }) => {
    const campaignListPage = new CampaignListPage(page);
    await campaignListPage.goto();
    await campaignListPage.startNewCampaign();

    const newCampaignPage = new NewCampaignPage(page);
    await expect(newCampaignPage.heading).toBeVisible();

    const campaignName = `Missing Connector ${Date.now()}`;
    await newCampaignPage.fillName(campaignName);
    await newCampaignPage.fillInitialPrompt(
      "Prompt without connector selection.",
    );
    await newCampaignPage.addObjective(
      "Ensure validation prevents submission.",
    );
    await newCampaignPage.submit();

    await expect(newCampaignPage.missingConnectorError).toBeVisible();
  });

  test("deletes a campaign from detail view and removes it from the list", async ({
    page,
  }) => {
    const campaignListPage = new CampaignListPage(page);
    await campaignListPage.goto();
    await campaignListPage.startNewCampaign();

    const newCampaignPage = new NewCampaignPage(page);
    await expect(newCampaignPage.heading).toBeVisible();

    const campaignName = `Disposable Campaign ${Date.now()}`;
    await newCampaignPage.fillName(campaignName);
    await newCampaignPage.fillInitialPrompt("Prompt for deletion flow.");
    await newCampaignPage.addObjective("Verify removal from list.");
    await newCampaignPage.selectConnector(DEFAULT_CONNECTOR_LABEL);

    await Promise.all([
      page.waitForURL(/\/campaigns\/.+$/),
      newCampaignPage.submit(),
    ]);

    const detailPage = new CampaignDetailPage(page);
    await expect(detailPage.headingWithName(campaignName)).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/campaigns(\?|$)/),
      detailPage.deleteCampaign(),
    ]);

    await expect(campaignListPage.deletionSuccessToast).toBeVisible();
    await expect(campaignListPage.campaignCard(campaignName)).toHaveCount(0);
  });

  test("renders the empty state for a missing campaign id", async ({
    page,
  }) => {
    const detailPage = new CampaignDetailPage(page);
    const missingId = `missing-${Date.now()}`;
    await detailPage.goto(missingId);

    await expect(detailPage.notFoundMessage).toBeVisible();
  });
});
