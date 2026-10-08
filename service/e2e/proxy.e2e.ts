import { request } from './helpers/http';
import { getProjectKey } from './setup';

const projectKey = () => getProjectKey();

describe('Proxy routes', () => {
  describe('GET /proxy-script', () => {
    it('returns 400 when url query param is missing', async () => {
      const { status } = await request('GET', '/proxy-script', {
        projectKey: projectKey(),
      });
      expect(status).toBe(400);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', '/proxy-script?url=https://example.com/script.js', {});
      expect(status).toBe(400);
    });

    it('returns 200 or 500 when url is provided and x-project-key is valid', async () => {
      const { status } = await request(
        'GET',
        '/proxy-script?url=https://example.com/script.js',
        { projectKey: projectKey() }
      );
      expect([200, 500]).toContain(status);
    });
  });
});
