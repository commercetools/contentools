import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, scanPath, scanText } from '../check-forbidden-terms.mjs';

// Words are assembled so this test never trips the guard on itself.
const store = 'Fire' + 'store';
const cmsUp = 'C' + 'MS';
const cmsLow = 'c' + 'ms';

test('scanText finds the store term on the right line', () => {
  const hits = scanText('a.ts', `one\ntwo\nimport { ${store} } from 'x';`);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
  assert.equal(hits[0].term, 'firestore');
});

test('scanPath reports folder names with line 0', () => {
  for (const p of [`puck/packages/x/src/components/${cmsLow}/A.tsx`, `service/src/samples/${cmsUp}/a.ts`]) {
    const hits = scanPath(p);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].term, 'cms');
    assert.equal(hits[0].line, 0);
  }
});

test('package.json description is a hit; "Content Tools" with a space is not', () => {
  assert.equal(scanText('package.json', `"description": "... Puck ${cmsUp} integration"`)[0].term, 'cms');
  assert.equal(scanText('a.md', 'Content Tools').length, 0);
  assert.equal(scanText('a.md', 'pocket').length, 0);
});

test('evaluate: unlisted hit fails, listed hit tolerated, stale entry fails, allow honoured', () => {
  const hit = { path: 'a.ts', line: 1, term: 'firestore', text: 'x' };
  assert.equal(evaluate([hit], [], [], new Set(['a.ts'])).failures.length, 1);
  const tol = evaluate([hit], ['a.ts'], [], new Set(['a.ts']));
  assert.equal(tol.failures.length, 0);
  assert.equal(tol.tolerated, 1);
  const stale = evaluate([], ['b.ts'], [], new Set());
  assert.match(stale.failures[0], /stale pending entry: b\.ts/);
  assert.equal(evaluate([hit], [], ['a.ts firestore'], new Set(['a.ts'])).failures.length, 0);
  const dir = evaluate([{ ...hit, path: 'puck/x.ts' }], ['puck/'], [], new Set());
  assert.equal(dir.failures.length, 0);
});
