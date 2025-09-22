import { APIRequestContext, request as playwrightRequest, type FullConfig } from '@playwright/test';
import { getAdminCredentials } from '../data/admin-credentials';

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const HEALTHCHECK_URL = process.env.PLAYWRIGHT_HEALTHCHECK_URL ?? 'http://localhost:8000/health';
const API_BASE_URL = ensureTrailingSlash(process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1');
const DEFAULT_CONNECTOR_NAME = 'playwright-default-connector';
const DEFAULT_CAMPAIGN_NAME = 'Playwright Default Campaign';

async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureApiHealthy(context: APIRequestContext): Promise<void> {
  const maxAttempts = Number(process.env.PLAYWRIGHT_HEALTH_MAX_ATTEMPTS ?? 20);
  const intervalMs = Number(process.env.PLAYWRIGHT_HEALTH_INTERVAL_MS ?? 1_000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await context.get(HEALTHCHECK_URL, { timeout: intervalMs });
      if (response.ok()) {
        return;
      }
    } catch (error) {
      // Ignore errors until the final attempt.
      if (attempt === maxAttempts) {
        throw error;
      }
    }

    await wait(intervalMs);
  }

  throw new Error(`API health check at ${HEALTHCHECK_URL} did not succeed within ${maxAttempts} attempts.`);
}

async function authenticateAdminContext(): Promise<APIRequestContext | null> {
  const adminCredentials = getAdminCredentials();
  const bootstrapContext = await playwrightRequest.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  try {
    const response = await bootstrapContext.post('auth/login', {
      data: {
        username: adminCredentials.username,
        password: adminCredentials.password,
      },
    });

    if (!response.ok()) {
      const body = await response.text();
      console.warn(`Global setup login failed: ${response.status()} ${body}`);
      await bootstrapContext.dispose();
      return null;
    }

    const loginJson = await response.json();
    const accessToken: string | undefined = loginJson?.access_token;

    if (!accessToken) {
      console.warn('Global setup login response missing access_token.');
      await bootstrapContext.dispose();
      return null;
    }

    await bootstrapContext.dispose();

    return playwrightRequest.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.warn('Global setup encountered an error while authenticating admin context:', error);
    await bootstrapContext.dispose();
    return null;
  }
}

async function ensureConnectorSeed(context: APIRequestContext): Promise<void> {
  try {
    const listResponse = await context.get('connector/connectors');
    if (!listResponse.ok()) {
      const body = await listResponse.text();
      console.warn(`Failed to list connectors during global setup: ${listResponse.status()} ${body}`);
      return;
    }

    const connectors = (await listResponse.json()) as Array<{ name?: string }>;
    if (Array.isArray(connectors) && connectors.some((connector) => connector?.name === DEFAULT_CONNECTOR_NAME)) {
      return;
    }

    const payload = {
      name: DEFAULT_CONNECTOR_NAME,
      provider_type: 'custom',
      config: {
        base_url: process.env.PLAYWRIGHT_MOCKCHAT_URL ?? 'http://mockchat:8080',
        endpoint: '/chat',
      },
      is_default: true,
    };

    const createResponse = await context.post('connector/connectors', { data: payload });
    if (!createResponse.ok()) {
      const body = await createResponse.text();
      console.warn(`Failed to create default connector during global setup: ${createResponse.status()} ${body}`);
    }
  } catch (error) {
    console.warn('Global setup encountered an error while seeding connector data:', error);
  }
}

async function ensureCampaignSeed(context: APIRequestContext): Promise<void> {
  try {
    const listResponse = await context.get('campaigns');
    if (!listResponse.ok()) {
      const body = await listResponse.text();
      console.warn(`Failed to list campaigns during global setup: ${listResponse.status()} ${body}`);
      return;
    }

    const campaigns = (await listResponse.json()) as Array<{ name?: string }>;
    if (Array.isArray(campaigns) && campaigns.some((campaign) => campaign?.name === DEFAULT_CAMPAIGN_NAME)) {
      return;
    }

    const payload = {
      name: DEFAULT_CAMPAIGN_NAME,
      description: 'Seeded by Playwright global setup.',
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
      safety_mode: 'standard' as const,
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
    };

    const createResponse = await context.post('campaigns', { data: payload });
    if (!createResponse.ok()) {
      const body = await createResponse.text();
      console.warn(`Failed to create default campaign during global setup: ${createResponse.status()} ${body}`);
    }
  } catch (error) {
    console.warn('Global setup encountered an error while seeding campaign data:', error);
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  const healthContext = await playwrightRequest.newContext();
  try {
    await ensureApiHealthy(healthContext);
  } finally {
    await healthContext.dispose();
  }

  const adminContext = await authenticateAdminContext();
  if (!adminContext) {
    return;
  }

  try {
    await ensureConnectorSeed(adminContext);
    await ensureCampaignSeed(adminContext);
  } finally {
    await adminContext.dispose();
  }
}
