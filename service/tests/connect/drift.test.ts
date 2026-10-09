/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  listTsFiles,
  readManifest,
  SERVICE_DIR,
  serviceBlock,
} from './support';

const SRC = path.join(SERVICE_DIR, 'src');

/** Set by Connect or the runtime, never declared in the manifest. */
const INJECTED = [
  'NODE_ENV',
  'PORT',
  'CONNECT_SERVICE_URL',
  'CTP_API_URL',
  'CTP_AUTH_URL',
  'CTP_PROJECT_KEY',
  'CTP_CLIENT_ID',
  'CTP_CLIENT_SECRET',
  'CTP_SCOPE',
];

/**
 * Read by the service but declared once for all applications under
 * `inheritAs.configuration` (by the admin-app change) instead of in the service block.
 */
const SHARED = ['CLOUD_IDENTIFIER'];

const PATTERNS: RegExp[] = [
  /process\.env\.([A-Z][A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g,
  /\benv(?:\.|\[['"])([A-Z][A-Z0-9_]+)/g,
  /^\s+([A-Z][A-Z0-9_]+):\s*z\./gm,
  /\b(?:get|value)\(\s*['"]([A-Z][A-Z0-9_]+)['"]/g,
  // Quoted key names (error codes such as MEDIA_NOT_CONFIGURED are not configuration keys).
  /['"](MEDIA_(?:GCP|AWS|CLOUDINARY)_[A-Z0-9_]+|MEDIA_(?:STORAGE_PROVIDER|PATH_PREFIX|MAX_UPLOAD_BYTES|ALLOWED_MIME_TYPES|PUBLIC_BASE_URL))['"]/g,
];

const sources = listTsFiles(SRC).map((f) => fs.readFileSync(f, 'utf8'));

function namesRead(): Set<string> {
  const names = new Set<string>();
  for (const text of sources) {
    for (const pattern of PATTERNS) {
      for (const m of text.matchAll(pattern)) {
        if (m[1]) names.add(m[1]);
      }
    }
  }
  return names;
}

describe('manifest and source stay in sync', () => {
  const manifest = readManifest();
  const { standard, secured } = serviceBlock(manifest);
  const declared = new Set([
    ...standard.map((e) => e.key),
    ...secured.map((e) => e.key),
  ]);
  const shared = new Set([
    ...(manifest.inheritAs?.configuration?.standardConfiguration ?? []).map(
      (e) => e.key
    ),
    ...(manifest.inheritAs?.configuration?.securedConfiguration ?? []).map(
      (e) => e.key
    ),
    ...SHARED,
  ]);

  it('declares every environment variable the service reads', () => {
    const undeclared = [...namesRead()].filter(
      (n) => !declared.has(n) && !shared.has(n) && !INJECTED.includes(n)
    );
    expect(undeclared).toEqual([]);
  });

  it('reads every key the service block declares', () => {
    const joined = sources.join('\n');
    const unused = [...declared].filter(
      (k) => !new RegExp(`\\b${k}\\b`).test(joined)
    );
    expect(unused).toEqual([]);
  });

  it('has the expected keys from the auth, core and media specs', () => {
    for (const key of [
      'CONTAINER_PREFIX',
      'CORS_ALLOWED_ORIGINS',
      'MC_REQUIRED_PERMISSION',
      'PUBLIC_DATASOURCE_RESOLVE',
      'PUBLIC_RESOLVE_MAX_PER_MINUTE',
      'SERVICE_API_TOKEN',
      'LOG_LEVEL',
      'MAX_VERSIONS',
    ]) {
      expect(declared.has(key)).toBe(true);
    }
    expect([...declared].filter((k) => k.startsWith('MEDIA_'))).toHaveLength(
      15
    );
  });
});

describe('scope audit', () => {
  const joined = sources.join('\n');

  it('uses Custom Objects and Product Search', () => {
    expect(joined).toContain('.customObjects(');
    expect(joined).toContain('.search(');
  });

  it.each([
    '.extensions(',
    '.subscriptions(',
    '.orders(',
    '.customers(',
    '.businessUnits(',
    '.stores(',
    '.productTypes(',
    '.carts(',
  ])('never calls %s', (call) => {
    expect(joined).not.toContain(call);
  });

  it('only searches products, never reads or writes them', () => {
    expect(joined).not.toMatch(/\.products\(\)\s*\.(?!search\()/);
  });
});
