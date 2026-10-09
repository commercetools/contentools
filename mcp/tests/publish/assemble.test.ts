/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// scripts/lib/manifest.mjs is a native ES module that jest (CommonJS) cannot import,
// so each case runs the real helper in a node child process.
const HELPER = path.resolve(__dirname, '../../scripts/lib/manifest.mjs');
const template = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../publish/package.template.json'), 'utf8')
);
const pkg = { version: '1.0.0-rc.0', private: true };

type Result = { ok: true; value: any } | { ok: false; message: string };

function call(fn: 'assembleManifest' | 'tagFor', ...args: unknown[]): Result {
  const code = `
    import(${JSON.stringify(HELPER)}).then((m) => {
      const args = JSON.parse(process.argv[1]);
      try { console.log(JSON.stringify({ ok: true, value: m[${JSON.stringify(fn)}](...args) })); }
      catch (e) { console.log(JSON.stringify({ ok: false, message: e.message })); }
    });`;
  return JSON.parse(execFileSync(process.execPath, ['-e', code, JSON.stringify(args)], { encoding: 'utf8' }));
}

const assemble = (t: unknown, p: unknown) => call('assembleManifest', t, p);

test('injects name and version', () => {
  const r = assemble(template, pkg);
  expect(r.ok).toBe(true);
  const m = (r as { value: Record<string, unknown> }).value;
  expect(m.name).toBe('@commercetools-labs/contentools-mcp');
  expect(m.version).toBe('1.0.0-rc.0');
  expect(m.private).toBeUndefined();
  expect(m.scripts).toBeUndefined();
  expect(m.dependencies).toBeUndefined();
});

test('rejects private, scripts and dependencies in the template', () => {
  expect(assemble({ ...template, private: true }, pkg)).toMatchObject({ ok: false, message: expect.stringMatching(/private/) });
  expect(assemble({ ...template, scripts: {} }, pkg)).toMatchObject({ ok: false, message: expect.stringMatching(/scripts/) });
  expect(assemble({ ...template, dependencies: {} }, pkg)).toMatchObject({ ok: false, message: expect.stringMatching(/dependencies/) });
});

test('rejects workspace/file/link values', () => {
  for (const v of ['workspace:*', 'file:../x', 'link:../x']) {
    expect(assemble({ ...template, peerDependencies: { zod: v } }, pkg)).toMatchObject({
      ok: false,
      message: expect.stringMatching(/forbidden protocol/),
    });
  }
});

test('rejects an invalid version', () => {
  expect(assemble(template, { ...pkg, version: 'one' })).toMatchObject({ ok: false, message: expect.stringMatching(/semver/) });
});

test('dist-tag selection', () => {
  expect(call('tagFor', '1.0.0-rc.0')).toEqual({ ok: true, value: 'next' });
  expect(call('tagFor', '1.0.0')).toEqual({ ok: true, value: 'latest' });
});
