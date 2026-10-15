import type { Express } from 'express';
import request, { type Response } from 'supertest';
import { server } from '../support/msw-setup';
import {
  AUDIENCE_ORIGIN,
  MC_LEGACY_ISSUER,
  createMcKit,
  type McKit,
} from '../support/mc';
import { captureLogs, createProbeApp } from '../support/probe-app';
import { expectErrorShape, expectNoStackLeak } from '../support/assertions';

const SERVICE_TOKEN = process.env.SERVICE_API_TOKEN ?? '';
const REALM = 'Bearer realm="contentools"';
const GENERIC_401 = 'Invalid or expired credentials';

let kit: McKit;
let app: Express;
const sent: string[] = [];

beforeAll(async () => {
  kit = await createMcKit();
});
beforeEach(() => {
  server.use(...kit.handlers);
  app = createProbeApp();
});

type Call = (headers: Record<string, string>) => Promise<Response>;
const calls: Array<[string, (a: Express) => Call]> = [
  ['GET', (a) => (h) => request(a).get('/service/protected-probe').set(h)],
  [
    'POST',
    (a) => (h) => request(a).post('/service/protected-probe').set(h).send({}),
  ],
];

interface Row {
  id: string;
  status: number;
  message: string;
  headers: () => Promise<Record<string, string>>;
  wwwAuthenticate?: string;
}

const bearer = async (
  token: string,
  version: 'v1' | 'v2' = 'v2'
): Promise<Record<string, string>> => {
  sent.push(token);
  return { authorization: `Bearer ${token}`, ...kit.headers(version) };
};
const now = (): number => Math.floor(Date.now() / 1000);

const rows: Row[] = [
  {
    id: 'no-header',
    status: 401,
    message: 'Authentication required',
    headers: async () => kit.headers(),
    wwwAuthenticate: REALM,
  },
  {
    id: 'basic',
    status: 401,
    message: GENERIC_401,
    headers: async () => ({ authorization: 'Basic dXNlcjpwYXNz' }),
  },
  {
    id: 'empty-bearer',
    status: 401,
    message: GENERIC_401,
    headers: async () => ({ authorization: 'Bearer ' }),
  },
  {
    id: 'garbage-jwt',
    status: 401,
    message: GENERIC_401,
    headers: () => bearer('abc.def.ghi'),
  },
  {
    id: 'alg-none',
    status: 401,
    message: GENERIC_401,
    headers: () => bearer(kit.unsigned()),
  },
  {
    id: 'hs256',
    status: 401,
    message: GENERIC_401,
    headers: async () => bearer(await kit.sign({ alg: 'HS256' })),
  },
  {
    id: 'wrong-key',
    status: 401,
    message: GENERIC_401,
    headers: async () => bearer(await kit.sign({ key: await kit.otherKey() })),
  },
  {
    id: 'expired',
    status: 401,
    message: GENERIC_401,
    headers: async () => bearer(await kit.sign({ expiresIn: now() - 30 })),
  },
  {
    id: 'not-yet-valid',
    status: 401,
    message: GENERIC_401,
    headers: async () =>
      bearer(await kit.sign({ notBefore: now() + 3600, expiresIn: '2h' })),
  },
  {
    id: 'wrong-issuer',
    status: 401,
    message: GENERIC_401,
    headers: async () =>
      bearer(await kit.sign({ issuer: 'https://evil.example' })),
  },
  {
    id: 'wrong-audience',
    status: 401,
    message: GENERIC_401,
    headers: async () =>
      bearer(await kit.sign({ audience: 'https://other.test.local' })),
  },
  {
    id: 'unknown-kid',
    status: 401,
    message: GENERIC_401,
    headers: async () => bearer(await kit.sign({ kid: 'rotated' })),
  },
  {
    id: 'missing-gateway-headers',
    status: 401,
    message: GENERIC_401,
    headers: async () => ({ authorization: `Bearer ${await kit.sign()}` }),
  },
  {
    id: 'opaque-wrong',
    status: 401,
    message: GENERIC_401,
    headers: () => bearer('not-the-service-token-xxxxxxxxxxxxxxxxxxxxxx'),
  },
  {
    id: 'other-project',
    status: 403,
    message: 'Forbidden',
    headers: async () => bearer(await kit.sign({ projectKey: 'someone-else' })),
  },
  {
    id: 'no-project-claim',
    status: 403,
    message: 'Forbidden',
    headers: async () => bearer(await kit.sign({ projectKey: null })),
  },
];

describe.each(calls)('rejection matrix on %s', (_method, make) => {
  it.each(rows)('$id', async (row) => {
    const res = await make(app)(await row.headers());
    expectErrorShape(res, row.status);
    expectNoStackLeak(res);
    expect(res.body.message).toBe(row.message);
    expect(res.body.statusCode).toBe(row.status);
    expect(res.body.correlationId).toEqual(expect.any(String));
    if (row.status === 401) {
      const challenge = String(res.headers['www-authenticate']);
      if (row.wwwAuthenticate) {
        expect(challenge).toBe(row.wwwAuthenticate);
      } else {
        expect(challenge).toBe(`${REALM}, error="invalid_token"`);
      }
    }
  });
});

describe('no oracle', () => {
  it('returns identical 401 bodies (except correlationId) for every credential failure', async () => {
    const bodies: unknown[] = [];
    for (const row of rows.filter(
      (r) => r.status === 401 && r.id !== 'no-header'
    )) {
      const res = await make('GET')(await row.headers());
      const { correlationId, ...rest } = res.body as Record<string, unknown>;
      expect(correlationId).toEqual(expect.any(String));
      bodies.push(rest);
    }
    expect(bodies.length).toBeGreaterThan(5);
    for (const body of bodies) expect(body).toEqual(bodies[0]);
  });

  const make =
    (method: 'GET'): Call =>
    (h) =>
      method === 'GET'
        ? request(app).get('/service/protected-probe').set(h)
        : request(app).post('/service/protected-probe').set(h);
});

describe.each(calls)('acceptance on %s', (method, make) => {
  const ok = method === 'GET' ? 200 : 201;

  it('accepts a valid v2 token', async () => {
    const res = await make(app)(await bearer(await kit.sign()));
    expect(res.status).toBe(ok);
    expect(res.body.principal).toEqual({
      kind: 'merchant-center',
      userId: 'user-1',
      projectKey: 'test-project',
      permissions: [],
    });
  });

  it('accepts the v1 gateway version with the legacy issuer', async () => {
    const token = await kit.sign({ issuer: MC_LEGACY_ISSUER });
    const res = await make(app)(await bearer(token, 'v1'));
    expect(res.status).toBe(ok);
    expect(res.body.principal.kind).toBe('merchant-center');
  });

  it('accepts a token for the full-path audience policy', async () => {
    const token = await kit.sign({
      audience: `${AUDIENCE_ORIGIN}/service/protected-probe`,
    });
    const res = await make(app)(await bearer(token));
    expect(res.status).toBe(ok);
  });

  it('carries permissions into the principal', async () => {
    const res = await make(app)(
      await bearer(await kit.sign({ permissions: ['canManageContentools'] }))
    );
    expect(res.body.principal.permissions).toEqual(['canManageContentools']);
  });

  it('accepts the correct SERVICE_API_TOKEN', async () => {
    const res = await make(app)({ authorization: `Bearer ${SERVICE_TOKEN}` });
    expect(res.status).toBe(ok);
    expect(res.body.principal).toEqual({ kind: 'service-token' });
  });
});

it('accepts a valid token when the URL has a query string', async () => {
  const res = await request(app)
    .get('/service/protected-probe?x=1')
    .set(await bearer(await kit.sign({ audience: AUDIENCE_ORIGIN })));
  expect(res.status).toBe(200);
});

describe('logging', () => {
  const originalLevel = process.env.LOG_LEVEL;
  afterEach(() => {
    process.env.LOG_LEVEL = originalLevel;
  });

  it('logs only a reason code, never a credential', async () => {
    process.env.LOG_LEVEL = 'warn';
    app = createProbeApp();
    const logs = captureLogs();
    try {
      const res = await request(app)
        .get('/service/protected-probe')
        .set(await bearer(await kit.sign({ expiresIn: now() - 30 })));
      expect(res.status).toBe(401);
      await request(app)
        .get('/service/protected-probe')
        .set({ authorization: `Bearer ${SERVICE_TOKEN}x` });
    } finally {
      logs.stop();
    }
    const text = logs.text();
    expect(text).toContain('"reason"');
    expect(text).toContain('authentication failed');
    for (const token of [...sent, SERVICE_TOKEN])
      expect(text).not.toContain(token);
  });
});
