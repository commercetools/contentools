#!/usr/bin/env node
// Builds admin-app the way Connect does: a clean environment holding only what connect.yaml declares
// plus APPLICATION_URL, then inspects the generated public/ output.
//
//   node tools/admin-app-simulate-connect-build.mjs [--service-url <https url>] [--skip-install]
//
// --skip-install reuses the existing node_modules (use it with `node tools/admin-app-use-local-puck.mjs`
// while the puck pre-release is not on npm; the frozen install needs the registry packages).

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = join(root, 'admin-app');
const args = process.argv.slice(2);
const argAfter = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const serviceUrl = argAfter('--service-url') ?? '';
const skipInstall = args.includes('--skip-install');
const CANARY = 'canary-secret-value';

/** The environment Connect gives an MC application: nothing inherited from a developer .env. */
export const buildEnv = (serviceUrlValue = 'https://pending.invalid/service') => ({
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  ENTRY_POINT_URI_PATH: 'contentools',
  CLOUD_IDENTIFIER: 'gcp-eu',
  CUSTOM_APPLICATION_ID: 'canary-application-id',
  APPLICATION_URL: 'https://admin-app-canary.example.com',
  // Connect inherits shared secrets into every application; none may reach the bundle.
  CTP_CLIENT_SECRET: CANARY,
  CONTENTOOLS_SERVICE_URL: serviceUrlValue,
});

// Hosts the Application Shell adds to the default policy (feature flags, error reporting, fonts, the MC API)
// plus the application's own origin. Anything else in the CSP is a leak and fails the build check.
const ALLOWED_CSP_HOSTS = [
  /^(\*|[a-z0-9-]+)\.launchdarkly\.com$/,
  /^app\.getsentry\.com$/,
  /^\*\.sentry\.io$/,
  /^mc-api\.[a-z0-9.-]+\.commercetools\.com$/,
  /^fonts\.(googleapis|gstatic)\.com$/,
  /^admin-app-canary\.example\.com$/,
];
const KEYWORDS = new Set(["'self'", "'none'", "'unsafe-inline'", '*', 'data:', 'blob:']);
/** Hosts named in a CSP string that are not allowed (hash sources and keywords are skipped). */
export const unexpectedCspHosts = (csp) =>
  csp
    .split(';')
    .flatMap((directive) => directive.trim().split(/\s+/).slice(1))
    .filter((v) => v && !KEYWORDS.has(v) && !v.startsWith("'sha") && v !== 'upgrade-insecure-requests')
    .map((v) => v.replace(/^https:\/\//, '').replace(/\/$/, ''))
    .filter((host) => !ALLOWED_CSP_HOSTS.some((re) => re.test(host)));
const TEXT = new Set(['.html', '.js', '.css', '.json', '.txt', '.map', '.svg', '.mjs']);
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** Pure assertions on the built output; returns [{name, ok, detail}]. */
export function inspectBuild(publicDir, expectedServiceUrl = '') {
  const results = [];
  const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });
  const indexPath = join(publicDir, 'index.html');
  const html = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  let appConfig;
  const m = html.match(/window\.app = (\{.*?\});<\/script>/s);
  try {
    appConfig = m ? JSON.parse(m[1]) : undefined;
  } catch {
    appConfig = undefined;
  }
  check('index.html defines window.app', appConfig);
  const a = appConfig ?? {};
  check('entryPointUriPath, location and mcApiUrl come from the environment',
    a.entryPointUriPath === 'contentools' && a.location === 'gcp-eu' && String(a.mcApiUrl).startsWith('https://mc-api.'),
    `entryPointUriPath=${a.entryPointUriPath} location=${a.location} mcApiUrl=${a.mcApiUrl}`);
  check('serviceUrl is the given value (or empty when none given)',
    expectedServiceUrl ? a.serviceUrl === expectedServiceUrl : a.serviceUrl === undefined || a.serviceUrl === '',
    `serviceUrl=${JSON.stringify(a.serviceUrl)}`);
  const files = existsSync(publicDir) ? walk(publicDir).filter((f) => TEXT.has(extname(f))) : [];
  const leaking = files.filter((f) => readFileSync(f, 'utf8').includes(CANARY));
  check('no file under public/ contains the secret canary', leaking.length === 0, leaking.join(', '));
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1] ?? '';
  const badCsp = [...unexpectedCspHosts(csp), ...(csp.includes("'unsafe-eval'") ? ["'unsafe-eval'"] : [])];
  check('CSP names only shell-default hosts and the application origin, no unsafe-eval', csp && badCsp.length === 0, badCsp.join(', '));
  results.csp = csp;
  return results;
}

const run = () => {
  const env = buildEnv(serviceUrl);
  rmSync(join(app, 'public'), { recursive: true, force: true });
  if (!skipInstall) execFileSync('yarn', ['install', '--frozen-lockfile'], { cwd: app, env, stdio: 'inherit' });
  execFileSync('yarn', ['build'], { cwd: app, env, stdio: 'inherit' });
  const results = inspectBuild(join(app, 'public'), serviceUrl);
  for (const r of results) console.log(`${r.ok ? 'ok' : 'FAIL'}: ${r.name}${r.ok || !r.detail ? '' : ` (${r.detail})`}`);
  console.log(`CSP (review by a human): ${results.csp || '(none found)'}`);
  if (results.some((r) => !r.ok)) process.exit(1);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
