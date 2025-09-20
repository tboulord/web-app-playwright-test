import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test } from '../fixtures/test-fixtures';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitForBackendReadiness = async (
  requestContext: APIRequestContext,
  baseUrl: string,
  {
    timeoutMs = 15_000,
    pollIntervalMs = 500,
  }: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<void> => {
  const healthUrl = new URL('/health', baseUrl).toString();
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await requestContext.get(healthUrl);
      if (response.ok()) {
        return;
      }

      lastError = new Error(`Received status ${response.status()} from ${healthUrl}`);
    } catch (error) {
      lastError = error;
    }

    await wait(pollIntervalMs);
  }

  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown error');

  throw new Error(
    `Backend at "${baseUrl}" did not become ready within ${timeoutMs}ms. Last error: ${errorMessage}`
  );
};

test.describe('Campaign management API', () => {
  test('allows admin to create and delete a campaign', async ({
    request,
    adminCredentials,
    campaignPayload,
  }) => {
    let loginResponse: APIResponse;
    try {
      loginResponse = await request.post('auth/login', {
        data: adminCredentials,
      });
    } catch (error) {
      const apiBaseUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1';
      const errorMessage = error instanceof Error ? error.message : String(error);
      test.skip(
        `Skipping campaign API test because the backend at "${apiBaseUrl}" is unreachable (${errorMessage}).`
      );
      return;
    }

    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    expect.soft(loginBody).toMatchObject({ access_token: expect.any(String) });

    const accessToken: string = loginBody.access_token;
    const createResponse = await request.post('campaigns', {
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

    const deleteResponse = await request.delete(`campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(deleteResponse.status(), 'campaign deletion should return 204').toBe(204);

    const fetchResponse = await request.get(`campaigns/${campaignId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(fetchResponse.status(), 'campaign should not exist after deletion').toBe(404);
  });
});
