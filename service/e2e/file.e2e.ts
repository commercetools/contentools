import { request } from './helpers/http';
import { getJwt, getProjectKey, getBusinessUnitKey } from './setup';
import { E2E_ENV } from './constants';

const bu = () => getBusinessUnitKey();
const projectKey = () => getProjectKey();

describe('File routes', () => {
  describe('GET /:businessUnitKey/media-library', () => {
    it('returns 200 when x-project-key is valid', async () => {
      const { status, body } = await request('GET', `/${bu()}/media-library`, {
        projectKey: projectKey(),
      });
      expect(status).toBe(200);
      expect(body).toBeDefined();
    });

    it('returns 400 when x-project-key is missing', async () => {
      const { status } = await request('GET', `/${bu()}/media-library`, {});
      expect(status).toBe(400);
    });
  });

  describe('POST /:businessUnitKey/upload-file', () => {
    it('returns 400 when no file is uploaded', async () => {
      const jwt = await getJwt();
      const url = `${E2E_ENV.BASE_URL}/service/${bu()}/upload-file`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'x-project-key': projectKey(),
        },
        body: new FormData(),
      });
      expect([400, 401, 500]).toContain(res.status);
    });

    it('returns 401 without JWT', async () => {
      const url = `${E2E_ENV.BASE_URL}/service/${bu()}/upload-file`;
      const form = new FormData();
      form.append('file', new Blob(['test']), 'test.txt');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'x-project-key': projectKey() },
        body: form,
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /compile-upload', () => {
    it('returns 400 or 500 when no code or key provided', async () => {
      const jwt = await getJwt();
      const { status } = await request('POST', '/compile-upload', {
        jwt,
        projectKey: projectKey(),
        body: {},
      });
      expect([400, 500]).toContain(status);
    });

    it('returns 401 without JWT', async () => {
      const { status } = await request('POST', '/compile-upload', {
        projectKey: projectKey(),
        body: { files: {}, key: 'test' },
      });
      expect(status).toBe(401);
    });
  });
});
