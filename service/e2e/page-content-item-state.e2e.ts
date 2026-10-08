import { request } from './helpers/http';
import { getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Page content-item state routes', () => {
  describe('GET /:businessUnitKey/page-items/:key/states', () => {
    it('returns 200 with states object or empty states', async () => {
      const { status, body } = await request('GET', `/${bu()}/page-items/some-item-key/states`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/page-items/some-key/states`, {});
      expect(status).toBe(400);
    });
  });
});
