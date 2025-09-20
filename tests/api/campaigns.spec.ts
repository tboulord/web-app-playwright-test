import { expect, test } from '../fixtures/test-fixtures';

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
