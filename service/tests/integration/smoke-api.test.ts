import { setupApiTest } from '../support/api';

it('serves the health route through the shared harness', async () => {
  const t = setupApiTest();
  const res = await t.http.get('/service/health');
  expect(res.status).toBe(200);
});
