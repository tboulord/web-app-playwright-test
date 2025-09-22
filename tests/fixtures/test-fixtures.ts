import { APIRequestContext, expect, request as playwrightRequest, test as base } from '@playwright/test';
import { z } from 'zod';
import type { AdminCredentials } from '../data/admin-credentials';
import { getAdminCredentials } from '../data/admin-credentials';

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const API_BASE_URL = ensureTrailingSlash(process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1');
const DEFAULT_CAMPAIGN_PREFIX = 'playwright-campaign';

export type CampaignCreateRequest = {
  name: string;
  description?: string;
  max_conversations: number;
  evaluation_modes: string[];
  providers: string[];
  priority_settings: Record<string, unknown>;
  approval_required: boolean;
  tags: string[];
  parallel_conversations: number;
  conversations_per_campaign: number;
  max_parallelism: number;
  timeout_seconds: number;
  retry_failed: boolean;
  max_retries: number;
  safety_mode: 'strict' | 'standard' | 'relaxed';
  content_filters: string[];
  pii_protection: boolean;
  initial_prompt: string;
  conversation_objectives: string[];
  required_topics: string[];
  min_turns: number;
  max_turns: number;
  turn_timeout_seconds: number;
  conversation_flow: Record<string, unknown>;
  success_criteria: Record<string, unknown>;
  auto_archive_days: number;
  notification_settings: Record<string, unknown>;
  config: Record<string, unknown>;
  priorities: string[];
};

export type CampaignResponse = {
  id: string;
  name: string;
  description?: string | null;
};

type CreateCampaignFixture = (overrides?: Partial<CampaignCreateRequest>) => Promise<CampaignResponse>;
type CleanupCampaignFixture = (campaignId: string) => Promise<void>;

type AuthenticatedAdminContext = {
  context: APIRequestContext;
  accessToken: string;
  adminUserId: string;
  tenantId: string;
};

type TestFixtures = {
  adminCredentials: AdminCredentials;
  authenticatedAdmin: AuthenticatedAdminContext;
  apiContext: APIRequestContext;
  adminTenantId: string;
  adminUserId: string;
  createCampaignViaApi: CreateCampaignFixture;
  cleanupCampaign: CleanupCampaignFixture;
};

function buildCampaignPayload(overrides: Partial<CampaignCreateRequest> = {}): CampaignCreateRequest {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    name: `${DEFAULT_CAMPAIGN_PREFIX}-${timestamp}`,
    description: 'Playwright seeded campaign',
    max_conversations: 5,
    evaluation_modes: ['standard'],
    providers: ['openai'],
    priority_settings: {},
    approval_required: false,
    tags: [],
    parallel_conversations: 2,
    conversations_per_campaign: 1,
    max_parallelism: 2,
    timeout_seconds: 60,
    retry_failed: true,
    max_retries: 1,
    safety_mode: 'standard',
    content_filters: [],
    pii_protection: true,
    initial_prompt: 'You are a helpful assistant supporting Playwright smoke tests.',
    conversation_objectives: ['Provide deterministic responses for automation'],
    required_topics: [],
    min_turns: 3,
    max_turns: 6,
    turn_timeout_seconds: 30,
    conversation_flow: {},
    success_criteria: {},
    auto_archive_days: 30,
    notification_settings: {},
    config: {},
    priorities: [],
    ...overrides,
  };
}

async function authenticateApiContext(adminCredentials: AdminCredentials): Promise<AuthenticatedAdminContext> {
  const bootstrapContext = await playwrightRequest.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  try {
    const loginResponse = await bootstrapContext.post('auth/login', {
      data: {
        username: adminCredentials.username,
        password: adminCredentials.password,
      },
    });

    if (!loginResponse.ok()) {
      const body = await loginResponse.text();
      throw new Error(`Failed to authenticate via /auth/login: ${loginResponse.status()} ${body}`);
    }

    const loginJson = await loginResponse.json();
    const loginSchema = z
      .object({
        access_token: z.string().min(1),
        user: z
          .object({
            id: z.string().uuid(),
            tenant_id: z.string().uuid(),
          })
          .passthrough(),
      })
      .passthrough();

    const parsed = loginSchema.parse(loginJson);
    const { access_token: accessToken, user } = parsed;

    await bootstrapContext.dispose();

    const context = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      context,
      accessToken,
      adminUserId: user.id,
      tenantId: user.tenant_id,
    };
  } catch (error) {
    await bootstrapContext.dispose();
    throw error;
  }
}

export const test = base.extend<TestFixtures>({
  adminCredentials: async ({}, use) => {
    await use(getAdminCredentials());
  },
  authenticatedAdmin: async ({ adminCredentials }, use) => {
    const authenticated = await authenticateApiContext(adminCredentials);
    try {
      await use(authenticated);
    } finally {
      await authenticated.context.dispose();
    }
  },
  apiContext: async ({ authenticatedAdmin }, use) => {
    await use(authenticatedAdmin.context);
  },
  adminTenantId: async ({ authenticatedAdmin }, use) => {
    await use(authenticatedAdmin.tenantId);
  },
  adminUserId: async ({ authenticatedAdmin }, use) => {
    await use(authenticatedAdmin.adminUserId);
  },
  createCampaignViaApi: async ({ apiContext }, use) => {
    const createCampaign: CreateCampaignFixture = async (overrides = {}) => {
      const payload = buildCampaignPayload(overrides);
      const response = await apiContext.post('campaigns', { data: payload });

      if (!response.ok()) {
        const body = await response.text();
        throw new Error(`Failed to create campaign: ${response.status()} ${body}`);
      }

      return (await response.json()) as CampaignResponse;
    };

    await use(createCampaign);
  },
  cleanupCampaign: async ({ apiContext }, use) => {
    const cleanup: CleanupCampaignFixture = async (campaignId: string) => {
      if (!campaignId) return;

      const response = await apiContext.delete(`campaigns/${campaignId}`);

      if (!response.ok() && response.status() !== 404) {
        const body = await response.text();
        throw new Error(`Failed to cleanup campaign ${campaignId}: ${response.status()} ${body}`);
      }
    };

    await use(cleanup);
  },
});

export { expect };
export type { AdminCredentials };
