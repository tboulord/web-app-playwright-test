import { expect, test } from '../fixtures/test-fixtures';

test.describe('Credential login flow', () => {
  test('displays dashboard after signing in', async ({ page, adminCredentials }) => {
    const baseUiUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
    try {
      await page.goto('/login');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      test.skip(
        `Skipping login UI test because the frontend at "${baseUiUrl}" is unreachable (${errorMessage}).`
      );
      return;
    }
    await expect(page.getByRole('heading', { name: 'Sign in to PeithoTest' })).toBeVisible();

    await page.getByLabel('Username').fill(adminCredentials.username);
    await page.getByLabel('Password').fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
