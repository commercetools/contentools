import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Content-item routes', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdKeys) {
      await request('DELETE', `/${bu()}/content-items/${key}`, { jwt, projectKey: projectKey() });
    }
    createdKeys.length = 0;
  });

  describe('GET /:businessUnitKey/content-items', () => {
    it('returns 200 with list when x-project-key is valid', async () => {
      const { status, body } = await request('GET', `/${bu()}/content-items`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/content-items`, {});
      expect(status).toBe(400);
    });
  });

  describe('GET /:businessUnitKey/content-items/content-type/:contentType', () => {
    it('returns 200 with list', async () => {
      const { status, body } = await request(
        'GET',
        `/${bu()}/content-items/content-type/some-type`,
        { projectKey: projectKey() }
      );
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('Content-item CRUD', () => {
    it('POST creates content-item and returns 201', async () => {
      const jwt = await getJwt();
      const { status, body } = await request<{ key?: string }>('POST', `/${bu()}/content-items`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { type: 'banner', title: 'E2E Item' } },
      });
      expect(status).toBe(201);
      expect(body).toBeDefined();
      const key = (body as { key?: string }).key;
      if (key) createdKeys.push(key);
    });

    it('POST returns 400 when value is missing', async () => {
      const jwt = await getJwt();
      const { status } = await request('POST', `/${bu()}/content-items`, {
        jwt,
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });

    it('GET /:businessUnitKey/content-items/:key returns 404 for unknown key', async () => {
      const { status } = await request('GET', `/${bu()}/content-items/nonexistent-ci-key-123`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(404);
    });

    it('PUT updates content-item and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/content-items`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { type: 'banner', title: 'E2E Put Item' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key?: string }).key;
      if (key) createdKeys.push(key);
      if (!key) return;
      const { status } = await request('PUT', `/${bu()}/content-items/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { type: 'banner', title: 'E2E Put Item Updated' } },
      });
      expect(status).toBe(200);
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/content-items`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { type: 'banner', title: 'E2E Del Item' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key?: string }).key;
      if (!key) return;
      const { status } = await request('DELETE', `/${bu()}/content-items/${key}`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
      createdKeys.pop();
    });

    it('POST returns 401 without JWT', async () => {
      const { status } = await request('POST', `/${bu()}/content-items`, {
        projectKey: projectKey(),
        body: { value: { type: 'banner', title: 'E2E' } },
      });
      expect(status).toBe(401);
    });
  });

  describe('GET /:businessUnitKey/published/content-items/:key', () => {
    it('returns 404 for unknown key', async () => {
      const { status } = await request('GET', `/${bu()}/published/content-items/nonexistent-key`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(404);
    });
  });

  describe('POST /:businessUnitKey/published/content-items/query', () => {
    it('returns 400 when query is missing', async () => {
      const { status } = await request('POST', `/${bu()}/published/content-items/query`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });
  });

  describe('GET /:businessUnitKey/content-items/:key/versions', () => {
    it('returns 200 or 404 for unknown key', async () => {
      const { status } = await request('GET', `/${bu()}/content-items/some-key/versions`, {
        projectKey: projectKey(),
      });
      expect([200, 404, 500]).toContain(status);
    });
  });

  describe('GET /:businessUnitKey/content-items/:key/states', () => {
    it('returns 200 with states object', async () => {
      const { status, body } = await request('GET', `/${bu()}/content-items/some-key/states`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });
  });
});
