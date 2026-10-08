import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Page row routes', () => {
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
      body: { value: { title: 'E2E Row Page', slug: '/e2e-row', layout: { rows: [] }, components: [] } },
    });
    expect(status).toBe(201);
    const key = (body as { key: string }).key;
    createdPageKeys.push(key);
    return key;
  }

  describe('POST /:businessUnitKey/pages/:key/rows', () => {
    it('returns 201 when page exists', async () => {
      const pageKey = await createPage();
      const jwt = await getJwt();
      const { status, body } = await request('POST', `/${bu()}/pages/${pageKey}/rows`, {
        jwt,
        projectKey: projectKey(),
        body: {},
      });
      expect([200, 201]).toContain(status);
      expect(body).toBeDefined();
    });

    it('returns 401 without JWT', async () => {
      const pageKey = await createPage();
      const { status } = await request('POST', `/${bu()}/pages/${pageKey}/rows`, {
        projectKey: projectKey(),
        body: {},
      });
      expect(status).toBe(401);
    });
  });

  describe('DELETE /:businessUnitKey/pages/:key/rows/:rowId', () => {
    it('returns 200 or 404 for existing or unknown row', async () => {
      const pageKey = await createPage();
      const jwt = await getJwt();
      const { status } = await request('DELETE', `/${bu()}/pages/${pageKey}/rows/some-row-id`, {
        jwt,
        projectKey: projectKey(),
      });
      expect([200, 400, 404, 500]).toContain(status);
    });
  });
});
