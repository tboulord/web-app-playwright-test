import type { Locator, Page } from "@playwright/test";

export class NewCampaignPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nameInput: Locator;
  readonly connectorSelect: Locator;
  readonly initialPromptInput: Locator;
  readonly objectiveInput: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Create New Campaign" });
    this.nameInput = page.getByLabel("Campaign Name *");
    this.connectorSelect = page.getByRole("combobox", {
      name: "SUT Connector *",
    });
    this.initialPromptInput = page.getByLabel("Initial Prompt *");
    this.objectiveInput = page.getByPlaceholder("Add an objective");
    this.createButton = page.getByRole("button", { name: "Create" });
  }

  async fillName(value: string) {
    await this.nameInput.fill(value);
  }

  async selectConnector(name: string) {
    await this.connectorSelect.click();
    await this.page.getByRole("option", { name }).click();
  }

  async fillInitialPrompt(value: string) {
    await this.initialPromptInput.fill(value);
  }

  async addObjective(value: string) {
    await this.objectiveInput.fill(value);
    await this.objectiveInput.press("Enter");
  }

  async submit() {
    await this.createButton.click();
  }
}
