import request from 'supertest';
import { setupApiTest } from '../support/api';

describe('router mount', () => {
  it.each(['/service/health', '/service/status'])(
    'answers %s with UP and sends no outbound request',
    async (path) => {
      const { http, fake } = setupApiTest();
      const res = await http.get(path);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(fake.requests).toHaveLength(0);
    }
  );

  it('does not serve health without the /service prefix', async () => {
    const { app } = setupApiTest();
    expect((await request(app).get('/health')).status).toBe(404);
    expect((await request(app).get('/status')).status).toBe(404);
  });
});
