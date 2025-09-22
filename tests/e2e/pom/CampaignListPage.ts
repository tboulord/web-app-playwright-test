import type { Locator, Page } from "@playwright/test";

export class CampaignListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newCampaignLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Campaigns" });
    this.newCampaignLink = page
      .getByRole("link", { name: "New Campaign" })
      .first();
  }

  async goto() {
    await this.page.goto("/campaigns");
  }

  async startNewCampaign() {
    await this.newCampaignLink.click();
  }

  campaignCard(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  get deletionSuccessToast(): Locator {
    return this.page.getByText("Campaign deleted successfully");
  }
}
