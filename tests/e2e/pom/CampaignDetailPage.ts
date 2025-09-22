import type { Locator, Page } from "@playwright/test";

export class CampaignDetailPage {
  readonly page: Page;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.deleteButton = page.getByRole("button", { name: "Delete" });
  }

  async goto(id: string) {
    await this.page.goto(`/campaigns/${id}`);
  }

  headingWithName(name: string): Locator {
    return this.page.getByRole("heading", { name });
  }

  get notFoundMessage(): Locator {
    return this.page.getByText("Campaign not found");
  }

  async deleteCampaign() {
    this.page.once("dialog", (dialog) => dialog.accept());
    await this.deleteButton.click();
  }
}
