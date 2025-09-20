import { expect, test as base } from '@playwright/test';
import type { AdminCredentials } from '../data/admin-credentials';
import { getAdminCredentials } from '../data/admin-credentials';
import type { CampaignPayload } from '../data/campaign-template';
import { buildCampaignPayload } from '../data/campaign-template';

type TestFixtures = {
  adminCredentials: AdminCredentials;
  campaignPayload: CampaignPayload;
};

export const test = base.extend<TestFixtures>({
  adminCredentials: async ({}, use) => {
    await use(getAdminCredentials());
  },
  campaignPayload: async ({}, use) => {
    await use(buildCampaignPayload());
  },
});

export { expect };
export type { AdminCredentials, CampaignPayload };
