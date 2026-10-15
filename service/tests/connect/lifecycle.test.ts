import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { SERVICE_DIR } from './support';

jest.setTimeout(120_000);

// msw cannot intercept a child process, so the scripts talk to a real local mock server.
interface Mock {
  token: { status: number; scope: string };
  search: { status: number; body: unknown };
  customObjects: { status: number };
}

const SENTINELS = [
  'sentinel-secret-1',
  'sentinel-client-id-1',
  'sentinel-token-1',
  'sentinel-aws-id-1',
];
const PROJECT = 'lc-project';
const GOOD_SCOPE = `manage_key_value_documents:${PROJECT} view_products:${PROJECT}`;

let bundleDir: string;
let server: http.Server;
let baseUrl: string;
let requests: string[] = [];
let mock: Mock;

const freshMock = (): Mock => ({
  token: { status: 200, scope: GOOD_SCOPE },
  search: { status: 200, body: { results: [], total: 0 } },
  customObjects: { status: 200 },
});

function run(
  file: string,
  extra: Record<string, string> = {},
  clear: string[] = []
): Promise<{ code: number | null; out: string; err: string }> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    CTP_API_URL: `${baseUrl}/api/`,
    CTP_AUTH_URL: baseUrl,
    CTP_PROJECT_KEY: PROJECT,
    CTP_CLIENT_ID: 'sentinel-client-id-1',
    CTP_CLIENT_SECRET: ['sentinel', 'secret', '1'].join('-'),
    ...extra,
  };
  for (const name of clear) delete env[name];
  return new Promise((resolve) => {
    const child = spawn('node', [path.join(bundleDir, file)], {
      cwd: bundleDir,
      env,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += String(d)));
    child.stderr.on('data', (d) => (err += String(d)));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

const lines = (text: string): Record<string, unknown>[] =>
  text
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>);

const expectNoSentinel = (text: string): void => {
  for (const s of SENTINELS) expect(text).not.toContain(s);
};

beforeAll(async () => {
  bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contentools-lifecycle-'));
  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', ['scripts/bundle-lifecycle.mjs', bundleDir], {
      cwd: SERVICE_DIR,
      stdio: 'ignore',
    });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`bundling failed (${code})`))
    );
  });
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    requests.push(`${req.method} ${url.pathname}`);
    const json = (status: number, body: unknown): void => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    req.resume();
    if (url.pathname === '/oauth/token') {
      if (mock.token.status !== 200) return json(mock.token.status, {});
      return json(200, {
        access_token: 'sentinel-token-1',
        scope: mock.token.scope,
        token_type: 'Bearer',
      });
    }
    if (url.pathname.startsWith(`/api/${PROJECT}/custom-objects/`)) {
      return json(mock.customObjects.status, { results: [] });
    }
    if (url.pathname === `/api/${PROJECT}/products/search`) {
      return json(mock.search.status, mock.search.body);
    }
    return json(404, {});
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(bundleDir, { recursive: true, force: true });
});

beforeEach(() => {
  mock = freshMock();
  requests = [];
});

describe('post-deploy', () => {
  it('runs from an empty directory without node_modules', async () => {
    const { err } = await run('post-deploy.js');
    expect(err).not.toContain('Cannot find module');
    expect(fs.existsSync(path.join(bundleDir, 'node_modules'))).toBe(false);
  });

  it('prints one ok line per check and exits 0 for valid credentials', async () => {
    const { code, out, err } = await run('post-deploy.js');
    expect(code).toBe(0);
    expect(err).toBe('');
    const checks = lines(out);
    expect(checks.map((l) => [l.check, l.status])).toEqual([
      ['token', 'ok'],
      ['scopes', 'ok'],
      ['custom-objects', 'ok'],
      ['product-search', 'ok'],
      ['storage', 'skipped'],
    ]);
    expectNoSentinel(out);
  });

  it('fails with the HTTP status and no secret when the token is rejected', async () => {
    mock.token.status = 401;
    const { code, out, err } = await run('post-deploy.js');
    expect(code).toBe(1);
    expect(lines(err)[0]).toMatchObject({
      msg: 'post-deploy',
      check: 'token',
      status: 'failed',
    });
    expect(err).toContain('401');
    expectNoSentinel(out + err);
  });

  it('fails naming the missing scope', async () => {
    mock.token.scope = `manage_key_value_documents:${PROJECT}`;
    const { code, err } = await run('post-deploy.js');
    expect(code).toBe(1);
    expect(err).toContain('view_products');
    expectNoSentinel(err);
  });

  it('fails when Custom Objects are not readable', async () => {
    mock.customObjects.status = 403;
    const { code, err } = await run('post-deploy.js');
    expect(code).toBe(1);
    expect(lines(err)[0]).toMatchObject({ check: 'custom-objects' });
  });

  it('warns but exits 0 when Product Search is not activated', async () => {
    mock.search = {
      status: 400,
      body: { errors: [{ code: 'ObjectNotFound' }] },
    };
    const { code, out } = await run('post-deploy.js');
    expect(code).toBe(0);
    const search = lines(out).find((l) => l.check === 'product-search');
    expect(search).toMatchObject({ status: 'warn' });
    expect(String(search?.detail)).toContain('Storefront Search');
  });

  it('fails when Product Search is forbidden', async () => {
    mock.search = { status: 403, body: {} };
    const { code, err } = await run('post-deploy.js');
    expect(code).toBe(1);
    expect(lines(err)[0]).toMatchObject({ check: 'product-search' });
  });

  it('lists missing variable names and exits 1', async () => {
    const { code, err } = await run('post-deploy.js', {}, [
      'CTP_PROJECT_KEY',
      'CTP_CLIENT_SECRET',
    ]);
    expect(code).toBe(1);
    expect(err).toContain('CTP_PROJECT_KEY');
    expect(err).toContain('CTP_CLIENT_SECRET');
    expect(requests).toEqual([]);
  });

  it('fails naming the missing storage key and no other value', async () => {
    const { code, out, err } = await run('post-deploy.js', {
      MEDIA_STORAGE_PROVIDER: 'aws',
      MEDIA_AWS_BUCKET: 'a-bucket',
      MEDIA_AWS_ACCESS_KEY_ID: 'sentinel-aws-id-1',
      MEDIA_AWS_SECRET_ACCESS_KEY: '',
    });
    expect(code).toBe(1);
    expect(lines(err)[0]).toMatchObject({ check: 'storage' });
    expect(err).toContain('MEDIA_AWS_SECRET_ACCESS_KEY');
    expectNoSentinel(out + err);
  });

  it('is idempotent and only sends the token request, one read and one search', async () => {
    const first = await run('post-deploy.js');
    const firstRequests = [...requests];
    requests = [];
    const second = await run('post-deploy.js');
    expect(second.code).toBe(first.code);
    expect(requests).toEqual(firstRequests);
    expect(requests).toEqual([
      'POST /oauth/token',
      `GET /api/${PROJECT}/custom-objects/puck-page`,
      `POST /api/${PROJECT}/products/search`,
    ]);
  });

  it('honours CONTAINER_PREFIX in the Custom Objects read', async () => {
    await run('post-deploy.js', { CONTAINER_PREFIX: 'contentools-test-' });
    expect(requests).toContain(
      `GET /api/${PROJECT}/custom-objects/contentools-test-puck-page`
    );
  });
});

describe('pre-undeploy', () => {
  it('exits 0, sends no request and names what is retained', async () => {
    const { code, out } = await run('pre-undeploy.js');
    expect(code).toBe(0);
    expect(requests).toEqual([]);
    const line = lines(out)[0] as {
      retained: { customObjectContainers: string[]; mediaPrefix: string };
    };
    expect(line).toMatchObject({ msg: 'pre-undeploy', status: 'ok' });
    expect(line.retained.customObjectContainers).toEqual(
      expect.arrayContaining([
        'puck-page',
        'puck-page-state',
        'puck-page-version',
        'puck-content',
        'puck-content-state',
        'puck-content-version',
        'puck-template',
        'configuration',
        'content-type',
        'datasource',
      ])
    );
    expect(line.retained.mediaPrefix).toBe('contentools/media');
  });
});
