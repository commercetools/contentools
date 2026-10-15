// Own file on purpose: the verifier caches the key set per issuer for the process lifetime, so the
// outage must be the first thing this module registry sees (a cached key would still verify).
import request from 'supertest';
import { server } from '../support/msw-setup';
import { createMcKit, type McKit } from '../support/mc';
import { createProbeApp } from '../support/probe-app';

let kit: McKit;

beforeAll(async () => {
  kit = await createMcKit();
});

describe.each([
  ['http-500', 'http-500'],
  ['network-error', 'network-error'],
] as const)('identity provider unreachable (%s)', (_name, mode) => {
  it.each(['get', 'post'] as const)(
    'answers 503 with Retry-After on %s',
    async (method) => {
      server.use(...kit.handlers);
      kit.setJwksMode(mode);
      const token = await kit.sign();
      const agent = request(createProbeApp());
      const res = await agent[method]('/service/protected-probe')
        .set({ authorization: `Bearer ${token}`, ...kit.headers() })
        .send({});
      expect(res.status).toBe(503);
      expect(res.body.message).toBe('Authentication service unavailable');
      expect(res.headers['retry-after']).toBe('5');
      expect(JSON.stringify(res.body)).not.toContain(token);
    }
  );
});
