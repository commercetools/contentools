import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertSandbox, hostsFor, isTestObject, REQUIRED, sweep } from '../sandbox-sweep.mjs';

const env = Object.fromEntries(REQUIRED.map((k) => [k, `v-${k}`]));
env.E2E_ALLOW_PROJECT_KEY = env.E2E_CTP_PROJECT_KEY;
env.E2E_CTP_REGION = 'europe-west1.gcp';

test('guard: passes only when allow key equals project key', () => {
  assert.doesNotThrow(() => assertSandbox(env));
  assert.throws(() => assertSandbox({ ...env, E2E_ALLOW_PROJECT_KEY: 'other' }), /refusing to run/);
});

test('guard: reports missing variables by name, never values', () => {
  const { E2E_CTP_CLIENT_SECRET, ...rest } = env;
  assert.throws(() => assertSandbox(rest), (e) => /E2E_CTP_CLIENT_SECRET/.test(e.message) && !e.message.includes(E2E_CTP_CLIENT_SECRET));
});

test('prefix filter: only contentools-test- containers', () => {
  assert.equal(isTestObject({ container: 'contentools-test-abc-puck-page' }), true);
  assert.equal(isTestObject({ container: 'puck-page' }), false);
  assert.equal(isTestObject({}), false);
});

test('hosts derive from the region unless overridden', () => {
  assert.deepEqual(hostsFor(env), { auth: 'https://auth.europe-west1.gcp.commercetools.com', api: 'https://api.europe-west1.gcp.commercetools.com' });
  assert.equal(hostsFor({ ...env, E2E_CTP_API_URL: 'http://x' }).api, 'http://x');
});

test('sweep deletes only prefixed objects (fake fetch)', async () => {
  const deleted = [];
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    const json = (b) => ({ ok: true, status: 200, json: async () => b });
    if (u.endsWith('/oauth/token')) return json({ access_token: 't' });
    if (init.method === 'DELETE') { deleted.push(decodeURIComponent(u.split('/custom-objects/')[1])); return json({}); }
    return json({ total: 2, results: [{ container: 'contentools-test-r1-puck-page', key: 'a' }, { container: 'puck-page', key: 'keep' }] });
  };
  assert.equal(await sweep(env, fetchImpl), 1);
  assert.deepEqual(deleted, ['contentools-test-r1-puck-page/a']);
});

test('sweep refuses before any network call when the guard fails', async () => {
  let called = false;
  await assert.rejects(sweep({ ...env, E2E_ALLOW_PROJECT_KEY: 'x' }, async () => { called = true; }), /refusing/);
  assert.equal(called, false);
});
