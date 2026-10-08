import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('Configuration routes', () => {
  describe('GET /:businessUnitKey/configuration and /configurations', () => {
    it('returns 200 with list when x-project-key is valid', async () => {
      const { status, body } = await request('GET', `/${bu()}/configuration`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(Array.isArray(body) || typeof body === 'object').toBe(true);
    });

    it('returns 200 for /configurations when x-project-key is valid', async () => {
      const { status } = await request('GET', `/${bu()}/configurations`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/configuration`, {});
      expect(status).toBe(400);
    });
  });

  describe('Configuration theme (CRUD)', () => {
    afterEach(async () => {
      const jwt = await getJwt();
      await request('DELETE', `/${bu()}/configuration/theme`, { jwt, projectKey: projectKey() });
    });

    it('GET returns 200 (empty or existing theme)', async () => {
      const { status } = await request('GET', `/${bu()}/configuration/theme`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('POST creates theme and returns 201', async () => {
      const jwt = await getJwt();
      const { status, body } = await request('POST', `/${bu()}/configuration/theme`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { primary: '#000000' } },
      });
      expect(status).toBe(201);
      expect(body).toBeDefined();
    });

    it('POST returns 401 without JWT', async () => {
      const { status } = await request('POST', `/${bu()}/configuration/theme`, {
        projectKey: projectKey(),
        body: { value: { primary: '#000000' } },
      });
      expect(status).toBe(401);
    });

    it('PUT updates theme and returns 200', async () => {
      const jwt = await getJwt();
      await request('POST', `/${bu()}/configuration/theme`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { primary: '#111111' } },
      });
      const { status, body } = await request('PUT', `/${bu()}/configuration/theme`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { primary: '#222222' } },
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      await request('POST', `/${bu()}/configuration/theme`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { primary: '#333333' } },
      });
      const { status } = await request('DELETE', `/${bu()}/configuration/theme`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
    });
  });

  describe('Configuration header (CRUD)', () => {
    afterEach(async () => {
      const jwt = await getJwt();
      await request('DELETE', `/${bu()}/configuration/header`, { jwt, projectKey: projectKey() });
    });

    it('GET returns 200', async () => {
      const { status } = await request('GET', `/${bu()}/configuration/header`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
    });

    it('POST creates header and returns 201', async () => {
      const jwt = await getJwt();
      const { status } = await request('POST', `/${bu()}/configuration/header`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { logoUrl: 'https://example.com/logo.png' } },
      });
      expect(status).toBe(201);
    });

    it('PUT updates header and returns 200', async () => {
      const jwt = await getJwt();
      await request('POST', `/${bu()}/configuration/header`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { logoUrl: 'https://example.com/a.png' } },
      });
      const { status } = await request('PUT', `/${bu()}/configuration/header`, {
        jwt,
        projectKey: projectKey(),
        body: { value: { logoUrl: 'https://example.com/b.png' } },
      });
      expect(status).toBe(200);
    });

    it('DELETE returns 204', async () => {
      const jwt = await getJwt();
      await request('POST', `/${bu()}/configuration/header`, {
        jwt,
        projectKey: projectKey(),
        body: { value: {} },
      });
      const { status } = await request('DELETE', `/${bu()}/configuration/header`, {
        jwt,
        projectKey: projectKey(),
      });
      expect(status).toBe(204);
    });
  });
});
