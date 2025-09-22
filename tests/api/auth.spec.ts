import { expect, request as playwrightRequest, test } from '@playwright/test';
import { performance } from 'perf_hooks';
import { z } from 'zod';

import { getAdminCredentials } from '../data/admin-credentials';

const loginResponseSchema = z
  .object({
    access_token: z.string().min(1),
    token_type: z.literal('bearer'),
    expires_in: z.number().positive(),
    user: z
      .object({
        id: z.string().uuid(),
        email: z.string().email(),
        username: z.string().min(1),
        full_name: z.string().nullable().optional(),
        role: z.string().min(1),
        is_active: z.boolean(),
        is_verified: z.boolean(),
        oauth_provider: z.string().nullable().optional(),
        avatar_url: z.string().nullable().optional(),
        tenant_id: z.string().uuid(),
        created_at: z.string().datetime(),
        updated_at: z.string().datetime(),
      })
      .passthrough(),
    redirect_to: z.string().url().nullable().optional(),
  })
  .passthrough();

const userResponseSchema = loginResponseSchema.shape.user;

const errorResponseSchema = z
  .object({
    detail: z.string().min(1),
  })
  .passthrough();

const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`);

const API_BASE_URL = ensureTrailingSlash(process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:8000/api/v1');
const RESPONSE_BUDGET_MS = 400;

test.describe('Auth API', () => {
  test('POST /auth/login returns tokens for the seeded admin', async ({ request }) => {
    const credentials = getAdminCredentials();

    const start = performance.now();
    const response = await request.post('auth/login', {
      data: {
        username: credentials.username,
        password: credentials.password,
      },
    });
    const elapsedMs = performance.now() - start;

    expect(response.status()).toBe(200);
    expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

    const body = await response.json();
    const parsed = loginResponseSchema.parse(body);

    expect(parsed.user.username).toBe(credentials.username);
    expect(parsed.access_token).not.toHaveLength(0);
  });

  test('POST /auth/login rejects incorrect passwords with 401', async ({ request }) => {
    const credentials = getAdminCredentials();

    const start = performance.now();
    const response = await request.post('auth/login', {
      data: {
        username: credentials.username,
        password: 'definitely-not-the-right-password',
      },
    });
    const elapsedMs = performance.now() - start;

    expect(response.status()).toBe(401);
    expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

    const body = await response.json();
    const parsed = errorResponseSchema.parse(body);
    expect(parsed.detail.toLowerCase()).toContain('incorrect');
  });

  test('GET /auth/me requires a bearer token and succeeds with the stored access_token', async ({ request }) => {
    const unauthorizedStart = performance.now();
    const unauthorizedResponse = await request.get('auth/me');
    const unauthorizedElapsed = performance.now() - unauthorizedStart;

    expect(unauthorizedResponse.status()).toBe(401);
    expect(unauthorizedElapsed).toBeLessThan(RESPONSE_BUDGET_MS);

    const credentials = getAdminCredentials();
    const loginStart = performance.now();
    const loginResponse = await request.post('auth/login', {
      data: {
        username: credentials.username,
        password: credentials.password,
      },
    });
    const loginElapsed = performance.now() - loginStart;

    expect(loginResponse.status()).toBe(200);
    expect(loginElapsed).toBeLessThan(RESPONSE_BUDGET_MS);

    const loginJson = await loginResponse.json();
    const { access_token: accessToken } = loginResponseSchema.parse(loginJson);

    const authedContext = await playwrightRequest.newContext({
      baseURL: API_BASE_URL,
      extraHTTPHeaders: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    try {
      const start = performance.now();
      const authedResponse = await authedContext.get('auth/me');
      const elapsedMs = performance.now() - start;

      expect(authedResponse.status()).toBe(200);
      expect(elapsedMs).toBeLessThan(RESPONSE_BUDGET_MS);

      const body = await authedResponse.json();
      const parsed = userResponseSchema.parse(body);
      expect(parsed.username).toBe(credentials.username);
    } finally {
      await authedContext.dispose();
    }
  });
});
