/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
// Verifies an assembled package directory (default .publish) the way real consumers use it:
// publint, are-the-types-wrong, tarball contents, CJS/ESM smoke tests and a TypeScript
// consumer check with both ends of the peer ranges. Needs network access to the npm registry.
// Exit codes: 0 ok, 1 a check failed, 2 registry/network failure.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dirFlag = argv.indexOf('--dir');
const dir = path.resolve(root, dirFlag >= 0 ? argv[dirFlag + 1] : '.publish');
const bin = (n) => path.join(root, 'node_modules', '.bin', n);

class NetworkError extends Error {}

function run(cmd, args, opts = {}) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|ECONNREFUSED|network|E503|E502/i.test(out) && cmd === 'npm') {
      throw new NetworkError(out.slice(-600));
    }
    e.message = `${cmd} ${args.join(' ')} failed:\n${out.slice(-3000)}`;
    throw e;
  }
}

function step(name) {
  console.log(`\n== ${name} ==`);
}

function fail(msg) {
  throw new Error(msg);
}

// ---------------------------------------------------------------------------------------------
const SETS = {
  A: ['ai@6', '@langchain/core@0.3', 'zod@3.25.76', '@modelcontextprotocol/sdk@1.27.1'],
  B: ['ai@7', '@langchain/core@1', 'zod@4', '@modelcontextprotocol/sdk@1.32.1'],
};

const SMOKE_BODY = `
const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url: String(url), auth: init && init.headers && (init.headers.Authorization || init.headers.authorization) });
  return new Response(JSON.stringify({ key: 'k' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const opts = { baseUrl: 'http://svc.test/service', token: 'tok', fetch: fakeFetch };
const expected = 'http://svc.test/service/default/puck-pages/k';
function assert(c, m) { if (!c) { console.error('SMOKE FAIL: ' + m); process.exit(1); } }
`;

const SMOKE_CJS = `${SMOKE_BODY}
(async () => {
  const core = require('@commercetools-labs/contentools-mcp');
  const ai = require('@commercetools-labs/contentools-mcp/ai-sdk');
  const lc = require('@commercetools-labs/contentools-mcp/langchain');
  const mcp = require('@commercetools-labs/contentools-mcp/mcp');
  assert(core.ALL_TOOLS.length === 44, 'core catalog is 44 tools');
  const tools = ai.createAiSdkTools(opts);
  assert(Object.keys(tools).length === 24, 'ai-sdk default is 24 read tools');
  await tools.get_puck_page.execute({ key: 'k' }, { toolCallId: '1', messages: [] });
  assert(calls.pop().url === expected, 'ai-sdk url');
  const lct = lc.createLangChainTools(opts);
  await lct.find((t) => t.name === 'get_puck_page').invoke({ key: 'k' });
  assert(calls.pop().url === expected, 'langchain url');
  const server = mcp.createContentoolsMcpServer({
    tools: core.selectTools({ groups: 'all', enableWrites: false }),
    client: new core.ContentoolsClient({ baseUrl: opts.baseUrl, token: 'tok', timeoutMs: 1000, fetchImpl: fakeFetch }),
    ctx: { defaultBusinessUnitKey: 'default' },
  });
  assert(typeof server.connect === 'function', 'mcp server has connect()');
  console.log('cjs ok');
})().catch((e) => { console.error(e); process.exit(1); });
`;

const SMOKE_MJS = `${SMOKE_BODY}
const core = await import('@commercetools-labs/contentools-mcp');
const ai = await import('@commercetools-labs/contentools-mcp/ai-sdk');
const lc = await import('@commercetools-labs/contentools-mcp/langchain');
const mcp = await import('@commercetools-labs/contentools-mcp/mcp');
assert(core.ALL_TOOLS.length === 44, 'core catalog is 44 tools');
const tools = ai.createAiSdkTools(opts);
assert(Object.keys(tools).length === 24, 'ai-sdk default is 24 read tools');
await tools.get_puck_page.execute({ key: 'k' }, { toolCallId: '1', messages: [] });
assert(calls.pop().url === expected, 'ai-sdk url');
const lct = lc.createLangChainTools(opts);
await lct.find((t) => t.name === 'get_puck_page').invoke({ key: 'k' });
assert(calls.pop().url === expected, 'langchain url');
const server = mcp.createContentoolsMcpServer({
  tools: core.selectTools({ groups: 'all', enableWrites: false }),
  client: new core.ContentoolsClient({ baseUrl: opts.baseUrl, token: 'tok', timeoutMs: 1000, fetchImpl: fakeFetch }),
  ctx: { defaultBusinessUnitKey: 'default' },
});
assert(typeof server.connect === 'function', 'mcp server has connect()');
console.log('esm ok');
`;

const CHECK_TS = `
import { ALL_TOOLS, selectTools, ContentoolsClient, runTool, defineTool } from '@commercetools-labs/contentools-mcp';
import type { AnyToolDefinition, ToolGroup } from '@commercetools-labs/contentools-mcp';
import { createAiSdkTools } from '@commercetools-labs/contentools-mcp/ai-sdk';
import type { AdapterOptions } from '@commercetools-labs/contentools-mcp/ai-sdk';
import { createLangChainTools } from '@commercetools-labs/contentools-mcp/langchain';
import { createContentoolsMcpServer } from '@commercetools-labs/contentools-mcp/mcp';

const opts: AdapterOptions = { baseUrl: 'http://svc.test/service', token: 't', groups: ['pages'] as ToolGroup[] };
export const a: Record<string, unknown> = createAiSdkTools(opts);
export const b: { name: string }[] = createLangChainTools(opts);
export const c: AnyToolDefinition[] = selectTools({ groups: 'all', enableWrites: false });
export const d = [ALL_TOOLS.length, ContentoolsClient, runTool, defineTool, createContentoolsMcpServer];
`;

// ---------------------------------------------------------------------------------------------
function checkPublint() {
  step('publint');
  const out = run(bin('publint'), [dir, '--pack', 'npm']);
  console.log(out.trim());
  if (/Errors:|Warnings:/.test(out)) fail('publint reported errors or warnings');
}

function checkAttw() {
  step('are-the-types-wrong');
  let out;
  try {
    out = run(bin('attw'), ['--pack', dir]);
  } catch (e) {
    console.log(String(e.message));
    throw new Error('attw failed');
  }
  console.log(out.trim());
  if (!/No problems found/.test(out)) fail('attw did not report "No problems found"');
}

function packTarball(tmp) {
  step('tarball contents');
  const out = run('npm', ['pack', dir, '--pack-destination', tmp, '--json']);
  const info = JSON.parse(out)[0];
  const tgz = path.join(tmp, info.filename);
  const files = run('tar', ['-tzf', tgz]).split('\n').filter(Boolean);
  const bad = files.filter((f) => !/^package\/(dist\/|README\.md$|LICENSE$|package\.json$)/.test(f));
  files.forEach((f) => console.log(f));
  if (bad.length) fail(`unexpected files in tarball:\n${bad.join('\n')}`);
  if (!files.includes('package/dist/stdio/index.js')) fail('bin target missing from tarball');
  console.log(`${files.length} files, all under dist/, README.md, LICENSE, package.json`);
  return tgz;
}

function matrix(tgz, tmp) {
  for (const [label, set] of Object.entries(SETS)) {
    step(`consumer matrix ${label}: ${set.join(' ')}`);
    const proj = fs.mkdtempSync(path.join(tmp, `consumer-${label}-`));
    fs.writeFileSync(path.join(proj, 'package.json'), JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }));
    run('npm', ['install', '--no-audit', '--no-fund', tgz, ...set, 'typescript@5', '@types/node@22', '@types/json-schema'], { cwd: proj });
    fs.writeFileSync(path.join(proj, 'smoke.cjs'), SMOKE_CJS);
    fs.writeFileSync(path.join(proj, 'smoke.mjs'), SMOKE_MJS);
    console.log(run(process.execPath, ['smoke.cjs'], { cwd: proj }).trim());
    console.log(run(process.execPath, ['smoke.mjs'], { cwd: proj }).trim());

    // The bin must fail fast and name what is missing.
    const binPath = path.join(proj, 'node_modules', '.bin', 'contentools-mcp');
    try {
      run(process.execPath, [binPath], { cwd: proj, env: { PATH: process.env.PATH } });
      fail('bin without configuration should exit 1');
    } catch (e) {
      if (e.status !== 1 || !/SERVICE_API_TOKEN|CONTENT_SERVICE_URL/.test(String(e.message))) {
        throw e.status === undefined ? e : new Error(`unexpected bin failure: ${e.message}`);
      }
      console.log('bin without env: exit 1 and names the missing variable');
    }

    // TypeScript consumers: nodenext (CJS + ESM files) and bundler resolution. node10 is covered by attw
    // (the peer 'ai' itself does not type-check under node10).
    fs.writeFileSync(path.join(proj, 'check.ts'), CHECK_TS);
    fs.writeFileSync(path.join(proj, 'check.mts'), CHECK_TS);
    const tsc = path.join(proj, 'node_modules', '.bin', 'tsc');
    const common = ['--noEmit', '--strict', '--target', 'es2022', '--types', 'node'];
    run(tsc, [...common, '--module', 'nodenext', '--moduleResolution', 'nodenext', 'check.ts', 'check.mts'], { cwd: proj });
    console.log('tsc nodenext (check.ts + check.mts): ok');
    run(tsc, [...common, '--module', 'esnext', '--moduleResolution', 'bundler', 'check.ts'], { cwd: proj });
    console.log('tsc bundler: ok');
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ctmcp-'));
try {
  if (!fs.existsSync(path.join(dir, 'package.json'))) fail(`${dir} has no package.json (run publish.mjs first)`);
  checkPublint();
  checkAttw();
  const tgz = packTarball(tmp);
  matrix(tgz, tmp);
  console.log('\nALL CHECKS PASSED');
} catch (e) {
  if (e instanceof NetworkError) {
    console.error(`\nRegistry or network failure (exit 2), not a package defect:\n${e.message}`);
    process.exitCode = 2;
  } else {
    console.error(`\nFAILED: ${e.message}`);
    process.exitCode = 1;
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
