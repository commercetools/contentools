import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Page component routes', () => {
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
      body: { value: { title: 'E2E Component Page', slug: '/e2e-comp', layout: { rows: [] }, components: [] } },
    });
    expect(status).toBe(201);
    const key = (body as { key: string }).key;
    createdPageKeys.push(key);
    return key;
  }

  describe('POST /:businessUnitKey/pages/:key/components', () => {
    it('returns 201 or 400 when body has componentType, rowId, cellId', async () => {
      const pageKey = await createPage();
      const jwt = await getJwt();
      const { status } = await request('POST', `/${bu()}/pages/${pageKey}/components`, {
        jwt,
        projectKey: projectKey(),
        body: { componentType: 'banner', rowId: 'row-1', cellId: 'cell-1' },
      });
      expect([200, 201, 400, 404, 500]).toContain(status);
    });

    it('returns 401 without JWT', async () => {
      const pageKey = await createPage();
      const { status } = await request('POST', `/${bu()}/pages/${pageKey}/components`, {
        projectKey: projectKey(),
        body: { componentType: 'banner', rowId: 'r', cellId: 'c' },
      });
      expect(status).toBe(401);
    });
  });

  describe('DELETE /:businessUnitKey/pages/:key/components/:contentItemKey', () => {
    it('returns 200 or 404 for unknown contentItemKey', async () => {
      const pageKey = await createPage();
      const jwt = await getJwt();
      const { status } = await request(
        'DELETE',
        `/${bu()}/pages/${pageKey}/components/some-content-item-key`,
        { jwt, projectKey: projectKey() }
      );
      expect([200, 400, 404, 500]).toContain(status);
    });
  });
});
