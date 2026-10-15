// Offline checks of the acceptance tooling (no network, no sandbox). Run: node --test tools/e2e/tools.test.mjs
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const run = (file, args, env) =>
  spawnSync(process.execPath, [join(here, file), ...args], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });

test('cleanup refuses when E2E_ALLOW_PROJECT_KEY differs from the project key', () => {
  const r = run('cleanup.mjs', ['--dry-run'], { CTP_PROJECT_KEY: 'a', E2E_ALLOW_PROJECT_KEY: 'b', CONTAINER_PREFIX: 'contentools-test-x-' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /refusing/);
});

test('cleanup refuses a prefix or container without the contentools-test- prefix', () => {
  const base = { CTP_PROJECT_KEY: 'a', E2E_ALLOW_PROJECT_KEY: 'a' };
  assert.equal(run('cleanup.mjs', [], { ...base, CONTAINER_PREFIX: 'puck-' }).status, 2);
  assert.equal(run('cleanup.mjs', [], { ...base, CONTAINERS: 'puck-page' }).status, 2);
  assert.equal(run('cleanup.mjs', [], { ...base }).status, 2);
});

test('forge-jwt prints three-part tokens, alg none has an empty signature', () => {
  const none = run('forge-jwt.mjs', ['none'], {}).stdout.trim().split('.');
  assert.equal(none.length, 3);
  assert.equal(none[2], '');
  for (const kind of ['unknown-key', 'expired', 'wrong-issuer', 'wrong-audience']) {
    const parts = run('forge-jwt.mjs', [kind], {}).stdout.trim().split('.');
    assert.equal(parts.length, 3);
    assert.ok(parts[2].length > 10);
  }
});

test('shell scripts parse', () => {
  for (const f of ['acceptance.sh', 'mcp-check.sh', 'local-env.sh']) {
    const r = spawnSync('bash', ['-n', join(here, f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});
