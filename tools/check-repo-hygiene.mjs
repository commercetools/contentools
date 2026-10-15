#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles } from './lib/files.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** [rule, regex, options?] - checked against every file path. */
export const PATH_RULES = [
  // strictOnly rules run only with --strict (release): work-in-progress folders must be gone by then.
  ['no _pending folder at release', /(^|\/)_pending(\/|$)/, { strictOnly: true }],
  ['no CI files (Connect builds and deploys)', /(^|\/)(\.github|\.circleci)\/|(^|\/)(\.gitlab-ci\.yml|Jenkinsfile|azure-pipelines\.yml|bitbucket-pipelines\.yml|cloudbuild\.ya?ml)$/],
  ['no container packaging (Connect builds from source)', /(^|\/)(Dockerfile[^/]*|docker-compose[^/]*\.ya?ml)$/],
  ['no env files (only *.example)', /(^|\/)\.env(\..+)?$/],
  ['no key material', /\.(pem|key)$|service-account[^/]*\.json$/i],
  ['no package-lock.json (Yarn only)', /(^|\/)package-lock\.json$/],
  ['no .npmrc', /(^|\/)\.npmrc$/],
  ['no tarballs', /\.tgz$/],
  ['no .DS_Store', /(^|\/)\.DS_Store$/],
  ['no tracked node_modules', /(^|\/)node_modules\//],
  ['only the root LICENSE', /(^|\/)LICENSE[^/]*$/],
];
const ENV_OK = /\.example$/;

const SECRET_PATTERNS = [
  ['github token', /\b(ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}\b|github_pat_[A-Za-z0-9_]{30,}/],
  ['api key (sk-)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['google api key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['secret assignment', /\b[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*['"]?(?!import\.|process\.|env\.)[A-Za-z0-9+/_=.-]{16,}/],
];
const SKIP_CONTENT = /(^|\/)(tests?|__tests__|e2e|fixtures)\/|\.test\.|\.spec\.|\.example$|^openspec\/|^plans\/|^tools\/test\/|^tools\/check-repo-hygiene\.mjs$|(^|\/)(package-lock\.json|yarn\.lock)$/;

export const LOCKFILE_DIRS = ['service', 'admin-app', 'mcp', 'puck'];

/** strict only: each app that has a package.json must also have a committed yarn.lock. `exists(path)` is injected for tests. */
export function lockfileFindings(files, exists = (p) => files.includes(p)) {
  return LOCKFILE_DIRS.filter((d) => exists(`${d}/package.json`) && !exists(`${d}/yarn.lock`)).map((d) => ({ path: `${d}/yarn.lock`, rule: 'missing yarn.lock (commit the Yarn lockfile)' }));
}

export function pathFindings(files, { strict = false } = {}) {
  const out = [];
  for (const f of files) {
    for (const [rule, re, opt] of PATH_RULES) {
      if (opt?.strictOnly && !strict) continue;
      if (rule === 'no env files (only *.example)' && ENV_OK.test(f)) continue;
      if (rule === 'only the root LICENSE' && f === 'LICENSE') continue;
      if (re.test(f)) out.push({ path: f, rule });
    }
  }
  return out;
}

/** The matched text is deliberately NOT returned (it may be a real secret). */
export function secretFindings(path, text) {
  if (SKIP_CONTENT.test(path)) return [];
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (line.includes('hygiene-ok')) return;
    for (const [rule, re] of SECRET_PATTERNS) if (re.test(line)) out.push({ path, line: i + 1, rule: `secret pattern: ${rule}` });
  });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    console.log('check-repo-hygiene: fast pre-check (CI files, env/key files, secret patterns). It is not a replacement for gate.mjs (labs gate, spec R), which also scans customer/internal names.');
    process.exit(0);
  }
  const files = listFiles(ROOT).filter((f) => !f.startsWith('openspec/') && !f.startsWith('plans/'));
  const strict = process.argv.includes('--strict');
  const findings = [...pathFindings(files, { strict }), ...(strict ? lockfileFindings(listFiles(ROOT)) : [])];
  for (const f of files) {
    if (/\.(png|jpe?g|gif|ico|woff2?|ttf|pdf|zip)$/i.test(f)) continue;
    findings.push(...secretFindings(f, readFileSync(join(ROOT, f), 'utf8')));
  }
  if (findings.length) {
    for (const x of findings) console.error(`${x.path}${x.line ? ':' + x.line : ''}: ${x.rule}`);
    console.error(`hygiene: FAILED (${findings.length})`);
    process.exit(1);
  }
  console.log(`hygiene: OK (${files.length} files)`);
}
