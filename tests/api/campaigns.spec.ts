import { expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { z } from 'zod';

import { test } from '../fixtures/test-fixtures';
import type { CampaignCreateRequest } from '../fixtures/test-fixtures';

const RESPONSE_BUDGET_MS = 400;

const campaignResponseSchema = z
  .object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string().min(1),
    providers: z.array(z.string().min(1)),
    conversation_objectives: z.array(z.string().min(1)),
    sut_connector_id: z.string().uuid().nullable().optional(),
    status: z.string().min(1),
  })
  .passthrough();

const campaignListSchema = z.array(campaignResponseSchema);

const connectorsResponseSchema = z
  .object({
    connectors: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().min(1),
            provider_type: z.string().min(1),
            is_default: z.boolean().optional(),
          })
          .passthrough()
      )
      .min(1),
  })
  .passthrough();

const errorResponseSchema = z
  .object({
    detail: z.string().min(1),
  })
  .passthrough();

type CampaignCreatePayload = CampaignCreateRequest & {
  sut_connector_id?: string;
};

function buildCampaignPayload(
  overrides: Partial<CampaignCreatePayload> = {}
): CampaignCreatePayload {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    name: `api-campaign-${timestamp}`,
    description: 'Campaign seeded by Playwright API tests.',
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
    initial_prompt: 'You are assisting an integration test verifying campaign flows.',
    conversation_objectives: ['Respond deterministically to campaign automation checks'],
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

test.describe('Campaigns API', () => {
  test('GET /campaigns lists campaigns for the current tenant', async ({ apiContext, adminTenantId }) => {
    const start = performance.now();
    const response = await apiContext.get('campaigns');
    const elapsedMs = performance.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

    const body = await response.json();
    const campaigns = campaignListSchema.parse(body);

    expect(campaigns.length).toBeGreaterThan(0);
    expect(campaigns[0].providers.length).toBeGreaterThan(0);
    expect(campaigns.every((campaign) => campaign.tenant_id === adminTenantId)).toBe(true);
  });

  test('POST /campaigns creates a campaign when sut_connector_id is provided', async ({ apiContext, adminTenantId, cleanupCampaign }) => {
    const connectorsStart = performance.now();
    const connectorsResponse = await apiContext.get('campaigns/wizard/connectors');
    const connectorsElapsed = performance.now() - connectorsStart;

    expect(connectorsResponse.status()).toBe(200);
    expect(connectorsElapsed).toBeLessThan(RESPONSE_BUDGET_MS);

    const connectorsJson = await connectorsResponse.json();
    const connectors = connectorsResponseSchema.parse(connectorsJson).connectors;
    const connector = connectors[0];

    let createdCampaignId: string | undefined;

    try {
      const payload = buildCampaignPayload({ sut_connector_id: connector.id });

      const start = performance.now();
      const response = await apiContext.post('campaigns', { data: payload });
      const elapsedMs = performance.now() - start;

      expect(response.status()).toBe(201);
      expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

      const json = await response.json();
      const createdCampaign = campaignResponseSchema.parse(json);
      createdCampaignId = createdCampaign.id;

      expect(createdCampaign.name).toBe(payload.name);
      expect(createdCampaign.sut_connector_id).toBe(connector.id);
      expect(createdCampaign.tenant_id).toBe(adminTenantId);
    } finally {
      if (createdCampaignId) {
        await cleanupCampaign(createdCampaignId);
      }
    }
  });

  test('POST /campaigns returns 400 when required connector data is missing', async ({ apiContext }) => {
    const payload = buildCampaignPayload({
      sut_connector_id: randomUUID(),
    });

    const start = performance.now();
    const response = await apiContext.post('campaigns', { data: payload });
    const elapsedMs = performance.now() - start;

    expect(response.status()).toBe(400);
    expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

    const body = await response.json();
    const parsed = errorResponseSchema.parse(body);
    expect(parsed.detail.toLowerCase()).toContain('connector');
  });

  test('DELETE /campaigns/{id} removes campaigns and returns 404 for unknown ids', async ({ apiContext, cleanupCampaign }) => {
    let campaignId: string | undefined;

    try {
      const createPayload = buildCampaignPayload();
      const createStart = performance.now();
      const createResponse = await apiContext.post('campaigns', { data: createPayload });
      const createElapsed = performance.now() - createStart;

      expect(createResponse.status()).toBe(201);
      expect(createElapsed).toBeLessThan(RESPONSE_BUDGET_MS);

      const createdJson = await createResponse.json();
      const createdCampaign = campaignResponseSchema.parse(createdJson);
      campaignId = createdCampaign.id;

      const deleteStart = performance.now();
      const deleteResponse = await apiContext.delete(`campaigns/${campaignId}`);
      const deleteElapsed = performance.now() - deleteStart;

      expect(deleteResponse.status()).toBe(204);
      expect(deleteElapsed).toBeLessThan(RESPONSE_BUDGET_MS);

      campaignId = undefined;
    } finally {
      if (campaignId) {
        await cleanupCampaign(campaignId);
      }
    }

    const randomId = randomUUID();
    const start = performance.now();
    const response = await apiContext.delete(`campaigns/${randomId}`);
    const elapsedMs = performance.now() - start;

    expect(response.status()).toBe(404);
    expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

    const body = await response.json();
    const parsed = errorResponseSchema.parse(body);
    expect(parsed.detail.toLowerCase()).toContain('not found');
  });
});
