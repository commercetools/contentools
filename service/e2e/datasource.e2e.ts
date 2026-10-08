import { request } from './helpers/http';
import { getJwt, getProjectKey } from './setup';

const projectKey = () => getProjectKey();

describe('Datasource routes', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdKeys) {
      await request('DELETE', `/datasource/${key}`, { jwt, projectKey: projectKey() });
    }
    createdKeys.length = 0;
  });

  describe('GET /datasource', () => {
    it('returns 200 with list when x-project-key is valid', async () => {
      const { status, body } = await request('GET', '/datasource', {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', '/datasource', {});
      expect(status).toBe(400);
    });
  });

  describe('Datasource CRUD', () => {
    const uniqueKey = () => `e2e-ds-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    it('POST /datasource/:key creates and returns 201', async () => {
      const key = uniqueKey();
      const jwt = await getJwt();
      const { status, body } = await request('POST', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { url: 'https://api.example.com/data' } },
      });
      expect(status).toBe(201);
      expect(body).toBeDefined();
      createdKeys.push(key);
    });

    it('POST /datasource/:key returns 400 when key already exists', async () => {
      const key = uniqueKey();
      const jwt = await getJwt();
      await request('POST', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { url: 'https://api.example.com/1' } },
      });
      createdKeys.push(key);
      const { status } = await request('POST', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { url: 'https://api.example.com/2' } },
      });
      expect(status).toBe(400);
    });

    it('GET /datasource/:key returns 200 for existing key', async () => {
      const key = uniqueKey();
      const jwt = await getJwt();
      await request('POST', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { url: 'https://api.example.com' } },
      });
      createdKeys.push(key);
      const { status } = await request('GET', `/datasource/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('GET /datasource/:key returns 404 or error for unknown key', async () => {
      const { status } = await request('GET', '/datasource/nonexistent-datasource-key', {
        projectKey: projectKey(),
      });
      expect([404, 500]).toContain(status);
    });

    it('PUT updates datasource and returns 200', async () => {
      const key = uniqueKey();
      const jwt = await getJwt();
      await request('POST', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { url: 'https://old.example.com' } },
      });
      createdKeys.push(key);
      const { status } = await request('PUT', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { url: 'https://new.example.com' } },
      });
      expect(status).toBe(200);
    });

    it('DELETE returns 204', async () => {
      const key = uniqueKey();
      const jwt = await getJwt();
      await request('POST', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: {} },
      });
      createdKeys.push(key);
      const { status } = await request('DELETE', `/datasource/${key}`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
      createdKeys.pop();
    });

    it('POST /datasource/:key returns 401 without JWT', async () => {
      const { status } = await request('POST', `/datasource/e2e-no-auth-${Date.now()}`, {
        projectKey: projectKey(),
        body: { value: {} },
      });
      expect(status).toBe(401);
    });
  });
});
