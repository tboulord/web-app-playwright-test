import type { Locator, Page } from "@playwright/test";

export class CampaignListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newCampaignLink: Locator;

  // Initializes campaign list locators used across tests.
  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Campaigns" });
    this.newCampaignLink = page
      .getByRole("link", { name: "New Campaign" })
      .first();
  }

  // Opens the campaign list view in the browser.
  async goto() {
    await this.page.goto("/campaigns");
  }

  // Launches the new campaign creation flow.
  async startNewCampaign() {
    await this.newCampaignLink.click();
  }

  // Locates a campaign card heading by its name.
  campaignCard(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  // Provides access to the deletion success toast notification.
  get deletionSuccessToast(): Locator {
    return this.page.getByText("Campaign deleted successfully");
  }
}
