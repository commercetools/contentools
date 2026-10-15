import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SERVER = join(dirname(fileURLToPath(import.meta.url)), '..', 'fake-ct', 'server.mjs');

const freePort = () =>
  new Promise((resolve) => {
    const s = createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

test('fake-ct server: token and custom-object round trip over HTTP', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', SERVER], {
    env: { ...process.env, FAKE_CT_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  try {
    await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', (code) => reject(new Error(`server exited early (${code})`)));
      child.stdout.on('data', (d) => String(d).includes('listening') && resolve());
    });
    const base = `http://localhost:${port}`;

    const tok = await fetch(`${base}/oauth/token`, { method: 'POST', body: 'grant_type=client_credentials', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
    assert.equal(tok.status, 200);
    assert.ok((await tok.json()).access_token);

    const put = await fetch(`${base}/test-project/custom-objects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ container: 'c', key: 'k', value: { a: 1 } }),
    });
    assert.equal(put.status, 201);
    const got = await (await fetch(`${base}/test-project/custom-objects/c/k`)).json();
    assert.deepEqual(got.value, { a: 1 });
  } finally {
    child.removeAllListeners('exit');
    child.kill();
  }
});
