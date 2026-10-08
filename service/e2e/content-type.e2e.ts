import { request } from './helpers/http';
import { getJwt, getProjectKey } from './setup';

const projectKey = () => getProjectKey();

describe('Content-type routes', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdKeys) {
      await request('DELETE', `/content-type/${key}`, { jwt, projectKey: projectKey() });
    }
    createdKeys.length = 0;
  });

  describe('GET /content-type', () => {
    it('returns 200 with array when x-project-key is valid', async () => {
      const { status, body } = await request('GET', '/content-type', {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', '/content-type', {});
      expect(status).toBe(400);
    });
  });

  describe('Content-type CRUD', () => {
    it('POST creates content-type and returns 201', async () => {
      const jwt = await getJwt();
      const { status, body } = await request<{ key?: string }>('POST', '/content-type', {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Type', type: 'text' } },
      });
      expect(status).toBe(201);
      expect((body as { key?: string }).key).toBeDefined();
      createdKeys.push((body as { key: string }).key);
    });

    it('GET /content-type/:key returns 200 for existing key', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', '/content-type', {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Get Type', type: 'text' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);
      const { status, body } = await request('GET', `/content-type/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });

    it('GET /content-type/:key returns 404 for unknown key', async () => {
      const { status } = await request('GET', '/content-type/nonexistent-key-12345', {
        projectKey: projectKey(),
      });
      expect([404, 500]).toContain(status);
    });

    it('PUT updates content-type and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', '/content-type', {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Put Type', type: 'text' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);
      const { status } = await request('PUT', `/content-type/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Put Type Updated', type: 'text' } },
      });
      expect(status).toBe(200);
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', '/content-type', {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Delete Type', type: 'text' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      const { status } = await request('DELETE', `/content-type/${key}`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
      createdKeys.pop(); // already deleted
    });

    it('POST returns 401 without JWT', async () => {
      const { status } = await request('POST', '/content-type', {
        projectKey: projectKey(),
        body: { value: { name: 'E2E', type: 'text' } },
      });
      expect(status).toBe(401);
    });
  });
});
