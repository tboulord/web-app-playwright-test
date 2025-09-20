import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env when present.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const baseUiUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const expectTimeout = process.env.PLAYWRIGHT_EXPECT_TIMEOUT
  ? Number(process.env.PLAYWRIGHT_EXPECT_TIMEOUT)
  : undefined;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    trace: 'retain-on-failure',
    video: 'on',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    baseURL: baseUiUrl,
  },
  expect: {
    timeout: expectTimeout
  },
  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
      }
    }
  ]
});
