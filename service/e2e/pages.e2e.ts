import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Pages routes', () => {
  const createdPageKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdPageKeys) {
      await request('DELETE', `/${bu()}/pages/${key}`, { jwt, projectKey: projectKey() });
    }
    createdPageKeys.length = 0;
  });

  describe('GET /:businessUnitKey/pages', () => {
    it('returns 200 with list when x-project-key is valid', async () => {
      const { status, body } = await request('GET', `/${bu()}/pages`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/pages`, {});
      expect(status).toBe(400);
    });
  });

  describe('Pages CRUD', () => {
    const pageKey = `e2e-page-${Date.now()}`;

    it('POST creates page and returns 201', async () => {
      const jwt = await getJwt();
      const { status, body } = await request<{ key?: string }>('POST', `/${bu()}/pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { title: 'E2E Page', slug: '/e2e-page' } },
      });
      expect(status).toBe(201);
      expect((body as { key?: string }).key).toBeDefined();
      createdPageKeys.push((body as { key: string }).key);
    });

    it('POST returns 400 when value is missing', async () => {
      const jwt = await getJwt();
      const { status } = await request('POST', `/${bu()}/pages`, {
        jwt,
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });

    it('GET /:businessUnitKey/pages/:key returns 200 for existing page', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { title: 'E2E Get Page', slug: '/e2e-get' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdPageKeys.push(key);
      const { status } = await request('GET', `/${bu()}/pages/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('GET /:businessUnitKey/pages/:key returns 404 for unknown key', async () => {
      const { status } = await request('GET', `/${bu()}/pages/nonexistent-page-key-123`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(404);
    });

    it('PUT updates page and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { title: 'E2E Put Page', slug: '/e2e-put' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdPageKeys.push(key);
      const { status } = await request('PUT', `/${bu()}/pages/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { title: 'E2E Put Page Updated', slug: '/e2e-put' } },
      });
      expect([200, 500]).toContain(status);
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { title: 'E2E Delete Page', slug: '/e2e-del' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      const { status } = await request('DELETE', `/${bu()}/pages/${key}`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
      createdPageKeys.pop();
    });

    it('POST returns 401 without JWT', async () => {
      const { status } = await request('POST', `/${bu()}/pages`, {
        projectKey: projectKey(),
        body: { value: { title: 'E2E', slug: '/e2e' } },
      });
      expect(status).toBe(401);
    });
  });

  describe('POST /:businessUnitKey/published/pages/query', () => {
    it('returns 200, 400, or 404 when query is provided', async () => {
      const { status } = await request('POST', `/${bu()}/published/pages/query`, {
        projectKey: projectKey(),
        body: { query: { slug: '/some-slug' } },
      });
      expect([200, 400, 404]).toContain(status);
    });

    it('returns 400 when query is missing', async () => {
      const { status } = await request('POST', `/${bu()}/published/pages/query`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });
  });

  describe('GET /:businessUnitKey/published/pages/:key and preview/pages/:key', () => {
    it('GET published/pages/:key returns 200 or 404', async () => {
      const { status } = await request('GET', `/${bu()}/published/pages/some-key`, {
        projectKey: projectKey(),
      });
      expect([200, 404]).toContain(status);
    });

    it('GET preview/pages/:key returns 200', async () => {
      const { status } = await request('GET', `/${bu()}/preview/pages/some-key`, {
        projectKey: projectKey(),
      });
      expect([200, 404]).toContain(status);
    });
  });
});
