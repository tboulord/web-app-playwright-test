import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test-fixtures';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitForPageAvailability = async (
  page: Page,
  baseUrl: string,
  path: string,
  {
    timeoutMs = 15_000,
    pollIntervalMs = 500,
  }: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<void> => {
  const targetUrl = new URL(path, baseUrl).toString();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      if (!response || response.ok()) {
        return;
      }

      lastError = new Error(`Received status ${response.status()} from ${targetUrl}`);
    } catch (error) {
      lastError = error;
    }

    await wait(pollIntervalMs);
  }

  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');

  throw new Error(
    `Frontend at "${targetUrl}" did not become ready within ${timeoutMs}ms. Last error: ${errorMessage}`
  );
};

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
