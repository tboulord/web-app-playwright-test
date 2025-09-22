import type { Locator, Page } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;

  // Stores the page reference and dashboard heading locator.
  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });
  }
}
