import { expect, test } from '../fixtures/test-fixtures';

test.describe('Credential login flow', () => {
  test('displays dashboard after signing in', async ({ page, adminCredentials }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to PeithoTest' })).toBeVisible();

    await page.getByLabel('Username').fill(adminCredentials.username);
    await page.getByLabel('Password').fill(adminCredentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
