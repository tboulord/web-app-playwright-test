import { expect, test } from '@playwright/test';

const credentials = {
  username: process.env.PLAYWRIGHT_ADMIN_USERNAME ?? 'admin',
  password: process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'admin',
};

test.describe('Campaign management API', () => {
  test('allows admin to create and delete a campaign', async ({ request }) => {
    const loginResponse = await request.post('/auth/login', {
      data: {
        username: credentials.username,
        password: credentials.password,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    expect.soft(loginBody).toMatchObject({ access_token: expect.any(String) });

    const accessToken: string = loginBody.access_token;
    const campaignPayload = {
      name: `Playwright API Campaign ${Date.now()}`,
      description: 'Automated test campaign created by Playwright',
      max_conversations: 1,
      evaluation_modes: ['standard'],
      providers: ['openai'],
      priority_settings: {},
      approval_required: false,
      tags: [],
      parallel_conversations: 1,
      conversations_per_campaign: 1,
      max_parallelism: 1,
      timeout_seconds: 30,
      retry_failed: true,
      max_retries: 1,
      safety_mode: 'standard',
      content_filters: [],
      pii_protection: true,
      initial_prompt: 'Hello from Playwright!',
      conversation_objectives: ['Validate campaign lifecycle'],
      required_topics: [],
      min_turns: 3,
      max_turns: 5,
      turn_timeout_seconds: 30,
      conversation_flow: {},
      success_criteria: {},
      auto_archive_days: 30,
      notification_settings: {},
      config: {},
      priorities: [],
    };

    const createResponse = await request.post('/campaigns', {
      data: campaignPayload,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(createResponse.status(), 'campaign creation should succeed').toBe(201);
    const createdCampaign = await createResponse.json();
    expect(createdCampaign).toMatchObject({
      name: campaignPayload.name,
      description: campaignPayload.description,
      max_conversations: campaignPayload.max_conversations,
    });

    const campaignId: string = createdCampaign.id;
    expect(campaignId).toBeTruthy();

    const deleteResponse = await request.delete(`/campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(deleteResponse.status(), 'campaign deletion should return 204').toBe(204);

    const fetchResponse = await request.get(`/campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(fetchResponse.status(), 'campaign should not exist after deletion').toBe(404);
  });
});
