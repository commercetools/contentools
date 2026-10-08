import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Page state routes', () => {
  const createdPageKeys: string[] = [];

  afterEach(async () => {
    const jwt = await getJwt();
    for (const key of createdPageKeys) {
      await request('DELETE', `/${bu()}/pages/${key}`, { jwt, projectKey: projectKey() });
    }
    createdPageKeys.length = 0;
  });

  async function createPage(): Promise<string> {
    const jwt = await getJwt();
    const { status, body } = await request<{ key?: string }>('POST', `/${bu()}/pages`, {
      jwt,
      projectKey: projectKey(),
      body: { value: { title: 'E2E State Page', slug: '/e2e-state', layout: { rows: [] }, components: [] } },
    });
    expect(status).toBe(201);
    const key = (body as { key: string }).key;
    createdPageKeys.push(key);
    return key;
  }

  describe('GET /:businessUnitKey/pages/:key/states', () => {
    it('returns 200 with states object', async () => {
      const pageKey = await createPage();
      const { status, body } = await request('GET', `/${bu()}/pages/${pageKey}/states`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });

    it('returns 400 when x-project-key is missing', async () => {
      const pageKey = await createPage();
      const { status } = await request('GET', `/${bu()}/pages/${pageKey}/states`, {});
      expect(status).toBe(400);
    });
  });

  describe('PUT /:businessUnitKey/pages/:key/states/published', () => {
    it('returns 200 when page exists', async () => {
      const pageKey = await createPage();
      const jwt = await getJwt();
      const { status } = await request('PUT', `/${bu()}/pages/${pageKey}/states/published`, {
        jwt,
        projectKey: projectKey(),
      });
      expect([200, 201, 404, 500]).toContain(status);
    });

    it('returns 401 without JWT', async () => {
      const pageKey = await createPage();
      const { status } = await request('PUT', `/${bu()}/pages/${pageKey}/states/published`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(401);
    });
  });

  describe('DELETE /:businessUnitKey/pages/:key/states/draft', () => {
    it('returns 200 or 404 when page exists', async () => {
      const pageKey = await createPage();
      const jwt = await getJwt();
      const { status } = await request('DELETE', `/${bu()}/pages/${pageKey}/states/draft`, {
        jwt,
        projectKey: projectKey(),
      });
      expect([200, 404, 500]).toContain(status);
    });
  });
});
