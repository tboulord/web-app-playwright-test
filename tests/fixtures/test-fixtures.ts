import { expect, test as base } from '@playwright/test';
import type { AdminCredentials } from '../data/admin-credentials';
import { getAdminCredentials } from '../data/admin-credentials';

type TestFixtures = {
  adminCredentials: AdminCredentials;
};

export const test = base.extend<TestFixtures>({
  adminCredentials: async ({}, use) => {
    await use(getAdminCredentials());
  },
});

export { expect };
export type { AdminCredentials };
