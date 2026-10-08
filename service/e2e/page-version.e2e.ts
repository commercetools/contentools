import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Page version routes', () => {
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
      body: { value: { title: 'E2E Version Page', slug: '/e2e-ver', layout: { rows: [] }, components: [] } },
    });
    expect(status).toBe(201);
    const key = (body as { key: string }).key;
    createdPageKeys.push(key);
    return key;
  }

  describe('GET /:businessUnitKey/pages/:key/versions', () => {
    it('returns 200 with versions for existing page', async () => {
      const pageKey = await createPage();
      const { status, body } = await request('GET', `/${bu()}/pages/${pageKey}/versions`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });

    it('returns 400 when x-project-key is missing', async () => {
      const pageKey = await createPage();
      const { status } = await request('GET', `/${bu()}/pages/${pageKey}/versions`, {});
      expect(status).toBe(400);
    });
  });
});
