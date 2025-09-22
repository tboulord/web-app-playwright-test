import type { Locator, Page } from "@playwright/test";

export class CampaignDetailPage {
  readonly page: Page;
  readonly deleteButton: Locator;

  // Captures the page instance and delete button locator.
  constructor(page: Page) {
    this.page = page;
    this.deleteButton = page.getByRole("button", { name: "Delete" });
  }

  // Navigates directly to the campaign detail route.
  async goto(id: string) {
    await this.page.goto(`/campaigns/${id}`);
  }

  // Finds the detail page heading matching the campaign name.
  headingWithName(name: string): Locator {
    return this.page.getByRole("heading", { name });
  }

  // Exposes the empty state message shown for missing campaigns.
  get notFoundMessage(): Locator {
    return this.page.getByText("Campaign not found");
  }

  // Triggers the deletion confirmation and confirms the dialog.
  async deleteCampaign() {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.deleteButton.click();
  }
}
