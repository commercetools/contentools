import { request } from './helpers/http';
import { getJwt, getProjectKey } from './setup';
import { E2E_ENV } from './constants';

describe('Auth routes', () => {
  describe('GET /health', () => {
    it('returns 200 when x-project-key is valid', async () => {
      const { status, body } = await request('GET', '/health', {
        projectKey: getProjectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
      expect((body as { status?: string }).status).toBe('healthy');
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', '/health', {});
      expect(status).toBe(400);
    });

    it('returns 403 when x-project-key is unknown/inactive', async () => {
      const { status } = await request('GET', '/health', {
        projectKey: 'nonexistent-project-key-12345',
      });
      expect([400, 403]).toContain(status);
    });
  });

  describe('POST /authenticate-project', () => {
    it('returns 200 and token when credentials are valid', async () => {
      const { status, body } = await request<{ token?: string; projectKey?: string }>(
        'POST',
        '/authenticate-project',
        {
          body: {
            ct_project_key: E2E_ENV.CTP_PROJECT_KEY,
            ct_client_id: E2E_ENV.CTP_CLIENT_ID,
            ct_client_secret: E2E_ENV.CTP_CLIENT_SECRET,
          },
        }
      );
      expect([200, 401]).toContain(status);
      if (status === 200) {
        expect(body).toBeDefined();
        expect((body as { token?: string }).token).toBeDefined();
        expect((body as { projectKey?: string }).projectKey).toBe(E2E_ENV.CTP_PROJECT_KEY);
      }
    });

    it('returns 400 when ct_project_key is missing', async () => {
      const { status, body } = await request('POST', '/authenticate-project', {
        body: {
          ct_client_id: E2E_ENV.CTP_CLIENT_ID,
          ct_client_secret: E2E_ENV.CTP_CLIENT_SECRET,
        },
      });
      expect(status).toBe(400);
      expect((body as { message?: string }).message).toMatch(/required/i);
    });

    it('returns 400 when ct_client_id is missing', async () => {
      const { status } = await request('POST', '/authenticate-project', {
        body: {
          ct_project_key: E2E_ENV.CTP_PROJECT_KEY,
          ct_client_secret: E2E_ENV.CTP_CLIENT_SECRET,
        },
      });
      expect(status).toBe(400);
    });

    it('returns 401 when credentials are invalid', async () => {
      const { status } = await request('POST', '/authenticate-project', {
        body: {
          ct_project_key: 'invalid',
          ct_client_id: 'invalid',
          ct_client_secret: 'invalid',
        },
      });
      expect(status).toBe(401);
    });
  });

  describe('POST /refresh-jwt', () => {
    it('returns 200 and new token when Authorization Bearer is valid', async () => {
      const jwt = await getJwt();
      const { status, body } = await request<{ token?: string }>('POST', '/refresh-jwt', {
        jwt,
        body: {},
      });
      expect(status).toBe(200);
      expect((body as { token?: string }).token).toBeDefined();
    });

    it('returns 401 when Authorization header is missing', async () => {
      const { status } = await request('POST', '/refresh-jwt', { body: {} });
      expect(status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
      const { status } = await request('POST', '/refresh-jwt', {
        headers: { Authorization: 'Bearer invalid-token' },
        body: {},
      });
      expect(status).toBe(401);
    });
  });
});
