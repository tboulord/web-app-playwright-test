import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env when present.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const baseUiUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const baseApiUrl = ensureTrailingSlash(process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1');
const expectTimeout = process.env.PLAYWRIGHT_EXPECT_TIMEOUT
  ? Number(process.env.PLAYWRIGHT_EXPECT_TIMEOUT)
  : undefined;
const e2eTestDir = path.resolve(__dirname, 'tests/e2e');
const apiTestDir = path.resolve(__dirname, 'tests/api');
const projectOutputDir = (name: string) => path.resolve(__dirname, 'test-results', name);

export default defineConfig({
  globalSetup: path.resolve(__dirname, 'tests/fixtures/global-setup.ts'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'on',
    ignoreHTTPSErrors: true,
  },
  expect: {
    timeout: expectTimeout
  },
  projects: [
    {
      name: 'chromium',
      testDir: e2eTestDir,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: baseUiUrl,
      },
      outputDir: projectOutputDir('ui-chromium'),
    },
    {
      name: 'firefox',
      testDir: e2eTestDir,
      use: {
        ...devices['Desktop Firefox'],
        baseURL: baseUiUrl,
      },
      outputDir: projectOutputDir('ui-firefox'),
    },
    {
      name: 'api',
      testDir: apiTestDir,
      use: {
        baseURL: baseApiUrl,
      },
      outputDir: projectOutputDir('api'),
    }
  ]
});
