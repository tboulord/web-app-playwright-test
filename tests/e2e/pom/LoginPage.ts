import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly usernameField: Locator;
  readonly passwordField: Locator;
  readonly submitButton: Locator;
  readonly form: Locator;

  // Sets up the login page model and locators for reuse in tests.
  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Sign in to PeithoTest" });
    this.usernameField = page.getByLabel("Username");
    this.passwordField = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
    this.form = page.locator("form");
  }

  // Navigates the browser to the login route.
  async goto() {
    await this.page.goto("/login");
  }

  // Types the supplied username into the form field.
  async fillUsername(value: string) {
    await this.usernameField.fill(value);
  }

  // Types the supplied password into the form field.
  async fillPassword(value: string) {
    await this.passwordField.fill(value);
  }

  // Submits the login form by clicking the button.
  async submit() {
    await this.submitButton.click();
  }

  // Performs the complete login interaction for the given credentials.
  async login(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  // Exposes the locator for the incorrect credentials alert banner.
  get incorrectCredentialsAlert(): Locator {
    return this.page.getByText("Incorrect username or password");
  }
}
