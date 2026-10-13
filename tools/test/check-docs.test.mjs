/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { check, manifestKeys, tableKeys } from '../check-docs-config.mjs';
import { featurePaths, forbiddenHits, lint, readmePeers, relativeLinks } from '../check-docs-lint.mjs';
import { collectionRoutes, diff, referenceRoutes } from '../check-docs-postman.mjs';

const text = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('the repository documentation passes the lint', () => {
  assert.deepEqual(lint().problems, []);
});

test('forbidden wording is reported with file and line, and the allow list is honoured', () => {
  const bad = ['fine', ['multi', 'tenant'].join('-') + ' setup'].join('\n');
  assert.deepEqual(forbiddenHits('docs/x.md', bad), ['docs/x.md:2: forbidden wording [tenancy]']);
  assert.deepEqual(forbiddenHits('docs/x.md', bad, [{ file: 'docs/x.md', pattern: 'setup' }]), []);
  assert.deepEqual(forbiddenHits('docs/x.md', 'a reference implementation'), []);
});

test('links: relative ones are returned, urls, anchors and code blocks are not', () => {
  const md = '[a](docs/a.md#x) [b](https://example.com) [c](#top)\n```\n[d](nope.md)\n```\n[e](../x.md)';
  assert.deepEqual(relativeLinks(md).map((l) => l.target), ['docs/a.md', '../x.md']);
});

test('FEATURES paths: only repository paths are checked', () => {
  assert.deepEqual(featurePaths('`service/src/a.ts` `/states/draft` `POST /x` `mcp/` `puck/packages/*/x`'), ['service/src/a.ts', 'mcp/']);
});

test('peer list parsing', () => {
  assert.deepEqual(readmePeers('## Peer dependencies\n\n- `react` `>=19`\n- `a-b` `^1`\n\nPart of x'), ['a-b', 'react']);
  assert.deepEqual(readmePeers('## Peer dependencies\n\nNone.\n\nPart of x'), []);
  assert.equal(readmePeers('nothing'), null);
});

test('config check: undocumented and unknown keys are reported', () => {
  const manifest = manifestKeys('  - key: A_KEY\n  - key: "B_KEY"\n');
  assert.deepEqual([...manifest].sort(), ['A_KEY', 'B_KEY']);
  const ok = { 'x.md': tableKeys('| `A_KEY` | x |\n| `B_KEY` | y |\n| `PORT` | z |') };
  assert.deepEqual(check(manifest, ok), []);
  const bad = { 'x.md': tableKeys('| `A_KEY` | x |\n| `C_KEY` | y |') };
  assert.deepEqual(check(manifest, bad), [
    'connect.yaml key B_KEY is in no documentation table',
    'x.md:2: C_KEY is neither in connect.yaml nor an injected variable',
  ]);
});

test('the real connect.yaml keys are all documented', () => {
  const manifest = manifestKeys(text('connect.yaml'));
  assert.ok(manifest.size >= 30);
  const tables = Object.fromEntries(['INSTALL.md', 'service/README.md', 'admin-app/README.md', 'mcp/README.md'].map((f) => [f, tableKeys(text(f))]));
  assert.deepEqual(check(manifest, tables), []);
});

test('postman and api-reference agree, and a missing request is reported', () => {
  const collection = JSON.parse(text('service/postman/contentools-api.postman_collection.json'));
  const fromReference = referenceRoutes(text('docs/api-reference.md'));
  const fromCollection = collectionRoutes(collection);
  assert.deepEqual(diff(fromCollection, fromReference), { onlyInCollection: [], onlyInReference: [] });
  const removed = fromCollection.slice(1);
  assert.deepEqual(diff(removed, fromReference).onlyInReference, [fromCollection[0]]);
});
