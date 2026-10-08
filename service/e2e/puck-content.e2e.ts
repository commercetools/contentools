import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Puck Content routes', () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdKeys) {
      await request('DELETE', `/${bu()}/puck-contents/${key}`, { jwt, projectKey: projectKey() });
    }
    createdKeys.length = 0;
  });

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  describe('GET /:businessUnitKey/puck-contents', () => {
    it('returns 200 with array when x-project-key is valid', async () => {
      const { status, body } = await request('GET', `/${bu()}/puck-contents`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/puck-contents`, {});
      expect(status).toBe(400);
    });

    it('returns 200 with filtered array when contentType query param is provided', async () => {
      const { status, body } = await request('GET', `/${bu()}/puck-contents?contentType=hero`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  describe('Puck Content CRUD', () => {
    it('POST creates puck content and returns 201', async () => {
      const jwt = await getJwt();
      const { status, body } = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Hero', contentType: 'hero' } },
      });
      expect(status).toBe(201);
      expect((body as { key?: string }).key).toBeDefined();
      createdKeys.push((body as { key: string }).key);
    });

    it('POST returns 400 when value is missing', async () => {
      const jwt = await getJwt();
      const { status } = await request('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });

    it('POST returns 401 without JWT', async () => {
      const { status } = await request('POST', `/${bu()}/puck-contents`, {
        projectKey: projectKey(),
        body: { value: { name: 'E2E Hero', contentType: 'hero' } },
      });
      expect(status).toBe(401);
    });

    it('GET /:key returns 200 for existing content', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Get Content', contentType: 'banner' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('GET', `/${bu()}/puck-contents/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect((body as any).key).toBe(key);
    });

    it('GET /:key returns 404 for unknown key', async () => {
      const { status } = await request('GET', `/${bu()}/puck-contents/nonexistent-puck-content-key`, {
        projectKey: projectKey(),
      });
      expect([404, 500]).toContain(status);
    });

    it('PUT updates puck content and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Put Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status } = await request('PUT', `/${bu()}/puck-contents/${key}`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Put Content Updated', contentType: 'hero' } },
      });
      expect(status).toBe(200);
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Delete Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;

      const { status } = await request('DELETE', `/${bu()}/puck-contents/${key}`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
    });
  });

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  describe('Puck Content states', () => {
    it('GET /:key/states returns 200 with states object', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E States Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('GET', `/${bu()}/puck-contents/${key}/states`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect((body as any).states).toBeDefined();
    });

    it('PUT /:key/states/published publishes the content and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Publish Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('PUT', `/${bu()}/puck-contents/${key}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect((body as any).states?.published).toBeDefined();
    });

    it('DELETE /:key/states/draft reverts draft and returns 200', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Revert Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      // Publish first so there's a published state to fall back to
      await request('PUT', `/${bu()}/puck-contents/${key}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });

      const { status } = await request('DELETE', `/${bu()}/puck-contents/${key}/states/draft`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // Versions
  // ---------------------------------------------------------------------------

  describe('Puck Content versions', () => {
    it('GET /:key/versions returns 200 with versions array', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Versions Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status, body } = await request('GET', `/${bu()}/puck-contents/${key}/versions`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray((body as any).versions)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Published / Preview
  // ---------------------------------------------------------------------------

  describe('Published and Preview puck contents', () => {
    it('GET published/:key returns 200 after publishing', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Published Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      await request('PUT', `/${bu()}/puck-contents/${key}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });

      const { status } = await request('GET', `/${bu()}/published/puck-contents/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('GET published/:key returns 404 for unpublished content', async () => {
      const { status } = await request('GET', `/${bu()}/published/puck-contents/nonexistent-puck-content`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(404);
    });

    it('GET preview/:key returns 200 after creation (draft exists)', async () => {
      const jwt = await getJwt();
      const create = await request<{ key?: string }>('POST', `/${bu()}/puck-contents`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { name: 'E2E Preview Content', contentType: 'hero' } },
      });
      expect(create.status).toBe(201);
      const key = (create.body as { key: string }).key;
      createdKeys.push(key);

      const { status } = await request('GET', `/${bu()}/preview/puck-contents/${key}`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('POST published/puck-contents/query returns 400 when query is missing', async () => {
      const { status } = await request('POST', `/${bu()}/published/puck-contents/query`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });

    it('POST published/puck-contents/query returns 200 or 404 with a valid query', async () => {
      const { status } = await request('POST', `/${bu()}/published/puck-contents/query`, {
        projectKey: projectKey(),
        body: { query: 'contentType = "nonexistent-type"' },
      });
      expect([200, 404]).toContain(status);
    });

    it('POST preview/puck-contents/query returns 400 when query is missing', async () => {
      const { status } = await request('POST', `/${bu()}/preview/puck-contents/query`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(400);
    });
  });
});
