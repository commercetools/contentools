import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Puck Page routes', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdKeys) {
      await request('DELETE', `/${bu()}/puck-pages/${key}`, { jwt, projectKey: projectKey() });
    }
    createdKeys.length = 0;
  });

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  describe('GET /:businessUnitKey/puck-pages', () => {
    it('returns 200 with array when x-project-key is valid', async () => {
      const { status, body } = await request('GET', `/${bu()}/puck-pages`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/puck-pages`, {});
      expect(status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  describe('Puck Page CRUD', () => {
    it('POST creates puck page and returns 201', async () => {
      const jwt = await getJwt();
      const { status, body } = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Page', slug: '/e2e-puck-page' } },
      });
      expect(status).toBe(201);
      expect((body as { key?: string }).key).toBeDefined();
      createdKeys.push((body as { key: string }).key);
    });

    it('POST returns 400 when value is missing', async () => {
      const jwt = await getJwt();
      const { status } = await request('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });

    it('POST returns 401 without JWT', async () => {
      const { status } = await request('POST', `/${bu()}/puck-pages`, {
        projectKey: projectKey(),
        body: { value: { name: 'E2E Page', slug: '/e2e-puck-page' } },
      });
      expect(status).toBe(401);
    });

    it('GET /:key returns 200 for existing page', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Get Page', slug: '/e2e-puck-get' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('GET', `/${bu()}/puck-pages/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect((body as any).key).toBe(key);
    });

    it('GET /:key returns 404 for unknown key', async () => {
      const { status } = await request('GET', `/${bu()}/puck-pages/nonexistent-puck-page-key`, {
        projectKey: projectKey(),
      });
      expect([404, 500]).toContain(status);
    });

    it('PUT updates puck page and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Put Page', slug: '/e2e-puck-put' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status } = await request('PUT', `/${bu()}/puck-pages/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Put Page Updated', slug: '/e2e-puck-put' } },
      });
      expect(status).toBe(200);
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Delete Page', slug: '/e2e-puck-del' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;

      const { status } = await request('DELETE', `/${bu()}/puck-pages/${key}`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
    });
  });

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  describe('Puck Page states', () => {
    it('GET /:key/states returns 200 with states object', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E States Page', slug: '/e2e-puck-states' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('GET', `/${bu()}/puck-pages/${key}/states`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect((body as any).states).toBeDefined();
    });

    it('PUT /:key/states/published publishes the page and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Publish Page', slug: '/e2e-puck-publish' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('PUT', `/${bu()}/puck-pages/${key}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect((body as any).states?.published).toBeDefined();
    });

    it('DELETE /:key/states/draft reverts draft and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Revert Page', slug: '/e2e-puck-revert' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      // Publish first so there's a published state to fall back to
      await request('PUT', `/${bu()}/puck-pages/${key}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });

      const { status } = await request('DELETE', `/${bu()}/puck-pages/${key}/states/draft`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Versions
  // ---------------------------------------------------------------------------

  describe('Puck Page versions', () => {
    it('GET /:key/versions returns 200 with versions array', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Versions Page', slug: '/e2e-puck-versions' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('GET', `/${bu()}/puck-pages/${key}/versions`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray((body as any).versions)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Published / Preview
  // ---------------------------------------------------------------------------

  describe('Published and Preview puck pages', () => {
    it('GET published/:key returns 200 after publishing', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Published Page', slug: '/e2e-puck-published' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      await request('PUT', `/${bu()}/puck-pages/${key}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });

      const { status } = await request('GET', `/${bu()}/published/puck-pages/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('GET published/:key returns 404 for unpublished page', async () => {
      const { status } = await request('GET', `/${bu()}/published/puck-pages/nonexistent-puck-key`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(404);
    });

    it('GET preview/:key returns 200 after creation (draft exists)', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-pages`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Preview Page', slug: '/e2e-puck-preview' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status } = await request('GET', `/${bu()}/preview/puck-pages/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('POST published/puck-pages/query returns 400 when query is missing', async () => {
      const { status } = await request('POST', `/${bu()}/published/puck-pages/query`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });

    it('POST published/puck-pages/query returns 200 or 404 with a valid query', async () => {
      const { status } = await request('POST', `/${bu()}/published/puck-pages/query`, {
        projectKey: projectKey(),
        body: { query: 'slug = "/nonexistent-slug"' },
      });
      expect([200, 404]).toContain(status);
    });

    it('POST preview/puck-pages/query returns 400 when query is missing', async () => {
      const { status } = await request('POST', `/${bu()}/preview/puck-pages/query`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });
  });
});
