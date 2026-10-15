import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, extractPaths } from '../check-legacy-route-calls.mjs';

test('extractPaths finds baseURL / baseUrl template literals', () => {
  const text = 'fetch(`${baseURL}/${businessUnitKey}/puck-pages/${key}`); x(`${baseUrl}/health`); y(`${other}/z`)';
  assert.deepEqual(extractPaths(text), ['/${businessUnitKey}/puck-pages/${key}', '/health']);
});

test('classify flags legacy routes and accepts kept ones', () => {
  const r = classify(['/${businessUnitKey}/content-items', '/${businessUnitKey}/puck-pages/${key}', '/${businessUnitKey}/puck-templates${query}']);
  assert.deepEqual(r.map((x) => x.ok), [false, true, true]);
});
