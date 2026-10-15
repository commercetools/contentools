import request from 'supertest';
import { createProbeApp } from '../support/probe-app';

const ORIGIN = 'http://localhost:5173';
const saved = process.env.CORS_ALLOWED_ORIGINS;

afterEach(() => {
  if (saved === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
  else process.env.CORS_ALLOWED_ORIGINS = saved;
});

describe('allowlist', () => {
  beforeEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = ORIGIN;
  });

  it('grants an allowed origin', async () => {
    const res = await request(createProbeApp())
      .get('/service/public-probe')
      .set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers.vary).toMatch(/origin/i);
    expect(res.headers['access-control-expose-headers']).toContain(
      'X-Correlation-ID'
    );
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('denies another origin without failing the request', async () => {
    const res = await request(createProbeApp())
      .get('/service/public-probe')
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('is unaffected when there is no Origin header', async () => {
    const res = await request(createProbeApp()).get('/service/public-probe');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers a preflight for a protected route without credentials', async () => {
    const res = await request(createProbeApp())
      .options('/service/protected-probe')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-methods']).toBe(
      'GET,POST,PUT,DELETE,OPTIONS'
    );
    const allowed = String(res.headers['access-control-allow-headers']);
    expect(allowed).toContain('Authorization');
    expect(allowed.toLowerCase()).not.toContain(
      ['x', 'project', 'key'].join('-')
    );
    expect(res.headers['access-control-max-age']).toBe('600');
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});

describe('configuration', () => {
  it('grants nothing when the variable is unset', async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    const res = await request(createProbeApp())
      .get('/service/public-probe')
      .set('Origin', ORIGIN);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('echoes any origin for the wildcard, still without credentials', async () => {
    process.env.CORS_ALLOWED_ORIGINS = '*';
    const res = await request(createProbeApp())
      .get('/service/public-probe')
      .set('Origin', 'https://any.example');
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://any.example'
    );
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
