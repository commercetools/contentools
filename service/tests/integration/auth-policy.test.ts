import request from 'supertest';
import { server } from '../support/msw-setup';
import { createMcKit, type McKit } from '../support/mc';
import { createProbeApp } from '../support/probe-app';

const SERVICE_TOKEN = process.env.SERVICE_API_TOKEN ?? '';
const saved = {
  MC_REQUIRED_PERMISSION: process.env.MC_REQUIRED_PERMISSION,
  SERVICE_API_TOKEN: process.env.SERVICE_API_TOKEN,
  CONNECT_SERVICE_URL: process.env.CONNECT_SERVICE_URL,
};
let kit: McKit;

beforeAll(async () => {
  kit = await createMcKit();
});
beforeEach(() => {
  server.use(...kit.handlers);
});
afterEach(() => {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const mcHeaders = async (
  permissions?: string[]
): Promise<Record<string, string>> => ({
  authorization: `Bearer ${await kit.sign({ permissions })}`,
  ...kit.headers(),
});

describe('route access policy', () => {
  it('ignores a garbage credential on public routes', async () => {
    const app = createProbeApp();
    const probe = await request(app)
      .get('/service/public-probe')
      .set('Authorization', 'Bearer garbage');
    expect(probe.status).toBe(200);
    expect(probe.body).toEqual({ access: 'public' });
    const health = await request(app)
      .get('/service/health')
      .set('Authorization', 'Bearer garbage');
    expect(health.status).toBe(200);
  });

  it('protects any route registered after the gate', async () => {
    const res = await request(createProbeApp()).get('/service/protected-probe');
    expect(res.status).toBe(401);
  });

  it('does not read a project-scoping header, cookies or query tokens as credentials', async () => {
    const res = await request(createProbeApp())
      .get(
        `/service/protected-probe?access_token=${SERVICE_TOKEN}&token=${SERVICE_TOKEN}`
      )
      .set(['x', 'project', 'key'].join('-'), 'test-project')
      .set('Cookie', `token=${SERVICE_TOKEN}`);
    expect(res.status).toBe(401);
  });
});

describe('MC_REQUIRED_PERMISSION', () => {
  beforeEach(() => {
    process.env.MC_REQUIRED_PERMISSION = 'canManageContentools';
  });

  it('rejects a token without the permission claim', async () => {
    const res = await request(createProbeApp())
      .get('/service/protected-probe')
      .set(await mcHeaders());
    expect(res.status).toBe(403);
  });

  it('rejects a token with another permission', async () => {
    const res = await request(createProbeApp())
      .get('/service/protected-probe')
      .set(await mcHeaders(['canViewContentools']));
    expect(res.status).toBe(403);
  });

  it('accepts a token with the permission', async () => {
    const res = await request(createProbeApp())
      .get('/service/protected-probe')
      .set(await mcHeaders(['canManageContentools']));
    expect(res.status).toBe(200);
  });

  it('does not apply to the static token', async () => {
    const res = await request(createProbeApp())
      .get('/service/protected-probe')
      .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
    expect(res.status).toBe(200);
  });
});

describe('credential kinds', () => {
  it('rejects every opaque credential when SERVICE_API_TOKEN is unset, still accepting MC tokens', async () => {
    delete process.env.SERVICE_API_TOKEN;
    const app = createProbeApp();
    const opaque = await request(app)
      .get('/service/protected-probe')
      .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
    expect(opaque.status).toBe(401);
    const mc = await request(app)
      .get('/service/protected-probe')
      .set(await mcHeaders());
    expect(mc.status).toBe(200);
  });

  it('rejects MC tokens when CONNECT_SERVICE_URL is unset, still accepting the service token', async () => {
    delete process.env.CONNECT_SERVICE_URL;
    const app = createProbeApp();
    const mc = await request(app)
      .get('/service/protected-probe')
      .set(await mcHeaders());
    expect(mc.status).toBe(401);
    const opaque = await request(app)
      .get('/service/protected-probe')
      .set('Authorization', `Bearer ${SERVICE_TOKEN}`);
    expect(opaque.status).toBe(200);
  });
});
