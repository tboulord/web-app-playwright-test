import { expect, test } from '@playwright/test';

const credentials = {
  username: process.env.PLAYWRIGHT_ADMIN_USERNAME ?? 'admin',
  password: process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'admin',
};

test.describe('Credential login flow', () => {
  test('displays dashboard after signing in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in to PeithoTest' })).toBeVisible();

    await page.getByLabel('Username').fill(credentials.username);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
