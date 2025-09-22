import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usernameField: Locator;
  readonly passwordField: Locator;
  readonly submitButton: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Sign in to PeithoTest" });
    this.usernameField = page.getByLabel("Username");
    this.passwordField = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.form = page.locator("form");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async fillUsername(value: string) {
    await this.usernameField.fill(value);
  }

  async fillPassword(value: string) {
    await this.passwordField.fill(value);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  get incorrectCredentialsAlert(): Locator {
    return this.page.getByText("Incorrect username or password");
  }
}
