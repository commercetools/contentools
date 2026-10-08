## 0. How to read this file

Vocabulary:

* **Merchant Center (MC)** - commercetools' admin UI. Our editor runs inside it as a *custom application*.
* **MC API Gateway / `forward-to` proxy** - when the custom application needs to call our own server, the browser calls the gateway endpoint `/proxy/forward-to`; the gateway checks the logged-in user may use the project, then calls our server and adds `Authorization: Bearer <exchange token>`. The exchange token is a short-lived (60 s) signed JWT ("JSON Web Token").
* **JWKS** - the gateway's public keys, published at `<gateway>/.well-known/jwks.json`; we use them to check the token signature.
* **Audience / issuer** - JWT claims: `aud` = who the token is for (our service), `iss` = who issued it (the gateway for the project's region).
* **Principal** - our name for "who is calling" after authentication.
* **Connect `CONNECT_SERVICE_URL`** - env var the platform gives a service app: its public URL ending in `/service`.
* **msw / supertest / jose** - as in spec D: msw fakes outgoing HTTP, supertest calls the Express app in memory, jose creates test tokens.

`<root>` = `/Users/behnam/code/commercetools-labs/contentools`. Commands run in `<root>/service` unless stated. Every new `.ts` file starts with the SPDX header:

```ts
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```

No `console.*`, no `any`, no commented-out code, never the word "cms". The contract this change implements is `design.md` sections 1 and 4: read them first.

---

## 1. Preflight

**Context.** E builds on D's core. We check D really is in place before editing it.

**Pre-conditions.** Spec D archived. `yarn test` in `service/` is green.

- [ ] 1.1 Run `cd <root>/service && yarn test && ls src/config src/middleware src/observability src/routes tests/support`.
  Expected: tests pass; listing shows `env.ts`, `observability/request-context.ts`, `error.middleware.ts`, `service.route.ts`, `health.route.ts`, `fake-ct.ts`, `env.ts`. If `src/_pending` still contains `jwt.middleware.ts` equivalents, ignore them (they are not compiled).
  Done when: all green and files present.
- [ ] 1.2 `grep -rn "createSessionAuthVerifier" node_modules/@commercetools-backend/express/dist/declarations/src/index.d.ts` prints a line (the package is installed by D). If missing: `yarn add @commercetools-backend/express@^27.13.0 cors@^2.8.5` and `yarn add -D jose@^5.10.0 msw@2.10.5 @types/cors`.
  Done when: grep prints the export.

---

## 2. Configuration: the auth section

**Context.** All auth settings come from environment variables validated at startup together with D's. Connect gives us `CONNECT_SERVICE_URL`; the operator may add the rest.

**Pre-conditions.** Group 1.

- [ ] 2.1 Create `src/auth/cloud-identifier.ts`:

```ts
export const CLOUD_IDENTIFIERS = ['gcp-au', 'gcp-eu', 'gcp-us', 'aws-eu', 'aws-us'] as const;
export type CloudIdentifier = (typeof CLOUD_IDENTIFIERS)[number];

const BY_API_HOST: Record<string, CloudIdentifier> = {
  'api.australia-southeast1.gcp.commercetools.com': 'gcp-au',
  'api.europe-west1.gcp.commercetools.com': 'gcp-eu',
  'api.us-central1.gcp.commercetools.com': 'gcp-us',
  'api.eu-central-1.aws.commercetools.com': 'aws-eu',
  'api.us-east-2.aws.commercetools.com': 'aws-us',
};

/** Connect injects CTP_API_URL but no region; the Merchant Center cloud identifier is derivable from its host. */
export function deriveCloudIdentifier(apiUrl: string): CloudIdentifier | undefined {
  try { return BY_API_HOST[new URL(apiUrl).hostname]; } catch { return undefined; }
}
```
  Source of the table: docs "merchant-center-api" cloud identifiers (`gcp-au` -> `mc-api.australia-southeast1.gcp...`, etc.). Unit test `tests/unit/cloud-identifier.test.ts`: the 5 hosts map correctly; `https://api.test.local` -> `undefined`; garbage -> `undefined`.
- [ ] 2.2 Extend `src/config/env.ts` (D). Add to the zod `schema` object:

```ts
CONNECT_SERVICE_URL: z.string().url().optional(),
CLOUD_IDENTIFIER: z.enum(CLOUD_IDENTIFIERS, { message: 'must be one of gcp-au|gcp-eu|gcp-us|aws-eu|aws-us' }).optional(),
SERVICE_API_TOKEN: z.string().min(32, 'must be at least 32 characters')
  .refine((v) => !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(v), 'must not look like a JWT (three dot-separated parts)').optional(),
CORS_ALLOWED_ORIGINS: z.string().optional(),
MC_REQUIRED_PERMISSION: z.string().regex(/^can[A-Za-z0-9]+$/, 'must look like canManageSomething').optional(),
PUBLIC_DATASOURCE_RESOLVE: z.enum(['true', 'false']).default('false'),
PUBLIC_RESOLVE_MAX_PER_MINUTE: z.coerce.number().int().min(1).max(100000).default(120),
```
  and to the `Configuration` interface:

```ts
auth: {
  /** undefined when Merchant Center tokens cannot be verified (no CONNECT_SERVICE_URL or unknown region) */
  mc?: { issuer: CloudIdentifier; audienceOrigin: string; requiredPermission?: string };
  serviceToken?: string;
  corsOrigins: string[] | 'all';
  publicResolve: { enabled: boolean; maxPerMinute: number };   // opt-in public built-in datasource resolve (design D-E10)
};
```
  Mapping rules in `readConfiguration`: `audienceOrigin = new URL(CONNECT_SERVICE_URL).origin`; `issuer = CLOUD_IDENTIFIER ?? deriveCloudIdentifier(CTP_API_URL)`; `mc` is set only when both exist. `CORS_ALLOWED_ORIGINS`: `undefined|''` -> `[]`; exactly `*` -> `'all'`; else split on `,`, trim, each entry must satisfy `new URL(entry).origin === entry` (rejects `localhost:5173`, trailing slash, paths) else push a problem `CORS_ALLOWED_ORIGINS: "<entry>" is not an origin (scheme://host[:port], no trailing slash)`. Note: echoing the entry is fine (origins are not secrets); never echo `SERVICE_API_TOKEN`.
  Empty-string env vars are already treated as unset by D's filter.
- [ ] 2.3 Extend `tests/support/env.ts` (D) with (these match the msw handlers of the test kit):

```ts
process.env.CONNECT_SERVICE_URL = 'https://service.test.local/service';
process.env.CLOUD_IDENTIFIER = 'gcp-eu';
process.env.SERVICE_API_TOKEN = 'test-service-token-0123456789-abcdefghij';
```
- [ ] 2.4 Add `tests/unit/auth-config.test.ts`: (a) valid -> `auth.mc = {issuer:'gcp-eu', audienceOrigin:'https://service.test.local'}`; (b) no `CONNECT_SERVICE_URL` -> `auth.mc` undefined; (c) no `CLOUD_IDENTIFIER` but `CTP_API_URL=https://api.europe-west1.gcp.commercetools.com` -> issuer `gcp-eu`; (d) `SERVICE_API_TOKEN='short'` and `'aaa.bbb.ccc'` -> `ConfigurationError` mentioning `SERVICE_API_TOKEN` and NOT containing the value; (e) CORS list parse: `'http://localhost:5173, https://shop.example'` -> two origins; `'*'` -> `'all'`; `'localhost:5173'` and `'https://a.example/'` rejected; (f) `MC_REQUIRED_PERMISSION='manage'` rejected, `'canManageContentools'` accepted.
  Run `yarn jest tests/unit/auth-config.test.ts tests/unit/cloud-identifier.test.ts tests/unit/config.test.ts` -> all pass.

**Pitfalls.** zod 4 `z.enum(values, { message })` is the 4.x signature; if the installed zod complains use `{ error: ... }`. Do not default `CORS_ALLOWED_ORIGINS` to anything.

**Rollback.** `git checkout`/restore `src/config/env.ts` and `tests/support/env.ts`; delete `src/auth/cloud-identifier.ts`.

---

## 3. Error contract additions and principal types

**Context.** Auth failures need response headers (`WWW-Authenticate`, `Retry-After`), which D's error contract does not carry yet.

**Pre-conditions.** Group 2.

- [ ] 3.1 `src/errors/custom.error.ts`: add an optional 4th constructor parameter `extra?: { headers?: Record<string, string>; code?: string }` stored as `headers` and `code` properties. Result:

```ts
constructor(statusCode: number | string, message: string, errors?: ErrorItem[], extra?: { headers?: Record<string, string>; code?: string }) {
  super(message);
  this.statusCode = statusCode; this.message = message;
  if (errors) this.errors = errors;
  if (extra?.headers) this.headers = extra.headers;
  if (extra?.code) this.code = extra.code;
}
```
  (`code` is the stable machine-readable identifier of the error contract; spec G uses it for `MEDIA_NOT_CONFIGURED` and spec J keys on the HTTP status first and `code` best-effort.) All `new CustomError(..., undefined, { 'WWW-Authenticate': ... })` calls in group 4 therefore read `new CustomError(401, 'msg', undefined, { headers: { 'WWW-Authenticate': REALM } })`: use that form.
- [ ] 3.2 `src/middleware/error.middleware.ts`: in `errorMiddleware`, before `res.status(...)`, apply `if (error instanceof CustomError && error.headers) for (const [k, v] of Object.entries(error.headers)) res.setHeader(k, v);` and include `...(error instanceof CustomError && error.code ? { code: error.code } : {})` in the JSON body. Unit test (new `tests/unit/error-headers.test.ts`, 3-line express app): a thrown `new CustomError(401,'x',undefined,{headers:{'WWW-Authenticate':'Bearer realm="contentools"'},code:'SOME_CODE'})` returns that header and body `code: 'SOME_CODE'`.
- [ ] 3.3 `src/auth/principal.ts`:

```ts
export type Principal =
  | { kind: 'merchant-center'; userId: string; projectKey: string; permissions: string[] }
  | { kind: 'service-token' };
```
  and create `src/types/express.d.ts` (D does not create one):

```ts
import type { Principal } from '../auth/principal';
declare global { namespace Express { interface Request { principal?: Principal } } }
export {};
```
  Done when: `yarn typecheck` passes.

**Rollback.** Revert the three files.

---

## 4. Verification core

**Context.** Three small pieces: constant-time static-token check, the MC verifier wrapper (classifies library errors), and `authenticate` which turns a request into a principal or an error.

**Pre-conditions.** Groups 2-3.

- [ ] 4.1 `src/auth/service-token.ts`:

```ts
import { createHash, timingSafeEqual } from 'node:crypto';
const digest = (v: string) => createHash('sha256').update(v, 'utf8').digest();
export const matchesServiceToken = (presented: string, expected: string): boolean =>
  timingSafeEqual(digest(presented), digest(expected));
```
  (Equal-length digests make `timingSafeEqual` safe for any input length.) Unit test: equal -> true; different -> false; different length -> false (no throw); empty -> false.
- [ ] 4.2 `src/auth/mc-verifier.ts`:

```ts
import { createSessionAuthVerifier } from '@commercetools-backend/express';
import type { CloudIdentifier } from './cloud-identifier';

export interface McSession { userId: string; projectKey: string; userPermissions?: string[] }
interface VerifiableRequest {
  headers: Record<string, string | string[] | undefined>;
  originalUrl: string;
  session?: McSession;
}
export class McAuthError extends Error {
  constructor(public readonly reason: 'invalid' | 'unavailable', public readonly code: string) { super(code); }
}
const UNAVAILABLE = new Set(['ERR_JOSE_GENERIC', 'ERR_JWKS_TIMEOUT', 'NETWORK']);
const codeOf = (e: unknown): string => {
  const c = (e as { code?: unknown } | null)?.code;
  if (typeof c === 'string') return c;
  return e instanceof TypeError ? 'NETWORK' : 'MISSING_INPUT';   // library throws plain Error for missing headers
};

export function createMcVerifier(opts: { issuer: CloudIdentifier; audienceOrigin: string }) {
  const verifiers = (['forward-url-full-path', 'forward-url-origin'] as const).map((audiencePolicy) =>
    createSessionAuthVerifier<VerifiableRequest>({
      audience: opts.audienceOrigin, issuer: opts.issuer, audiencePolicy, getRequestUrl: (r) => r.originalUrl,
    }));
  return async (input: { headers: VerifiableRequest['headers']; originalUrl: string }): Promise<McSession> => {
    let code = 'UNKNOWN'; let unavailable = false;
    for (const verify of verifiers) {
      const req: VerifiableRequest = { headers: input.headers, originalUrl: input.originalUrl };
      try { await verify(req); if (req.session) return req.session; code = 'NO_SESSION'; }
      catch (e) { code = codeOf(e); if (UNAVAILABLE.has(code)) unavailable = true; }
    }
    throw new McAuthError(unavailable ? 'unavailable' : 'invalid', code);
  };
}
```
  Note: the library mutates the object you pass (writes `.session`), so a fresh object per attempt. `originalUrl` includes the query string; the library drops it when computing the audience (verified in explore).
  Done when: `yarn typecheck` passes.
- [ ] 4.3 `src/auth/authenticate.ts`:

```ts
import type { Request } from 'express';
import { getLogger } from '../utils/logger.utils';
import CustomError from '../errors/custom.error';
import type { Configuration } from '../config/env';
import { createMcVerifier, McAuthError } from './mc-verifier';
import { matchesServiceToken } from './service-token';
import type { Principal } from './principal';

const JWT_SHAPE = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const REALM = 'Bearer realm="contentools"';
const missing = () => new CustomError(401, 'Authentication required', undefined, { headers: { 'WWW-Authenticate': REALM } });
const invalid = () => new CustomError(401, 'Invalid or expired credentials', undefined, { headers: { 'WWW-Authenticate': `${REALM}, error="invalid_token"` } });

export function createAuthenticator(config: Configuration) {
  const { auth, ctp } = config;
  const verifyMc = auth.mc ? createMcVerifier(auth.mc) : undefined;
  return async function authenticate(req: Request): Promise<Principal> {
    const header = req.headers.authorization;
    if (!header) throw missing();
    const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
    if (!match?.[1]) { getLogger().warn('authentication failed', { reason: 'malformed-header' }); throw invalid(); }
    const credential = match[1];

    if (JWT_SHAPE.test(credential)) {
      if (!verifyMc) { getLogger().warn('authentication failed', { reason: 'mc-verification-not-configured' }); throw invalid(); }
      let session;
      try { session = await verifyMc({ headers: req.headers, originalUrl: req.originalUrl }); }
      catch (e) {
        const reason = e instanceof McAuthError ? e : new McAuthError('invalid', 'UNKNOWN');
        getLogger().warn('authentication failed', { reason: reason.code });
        if (reason.reason === 'unavailable') throw new CustomError(503, 'Authentication service unavailable', undefined, { headers: { 'Retry-After': '5' } });
        throw invalid();
      }
      if (session.projectKey !== ctp.projectKey) { getLogger().warn('forbidden', { reason: 'other-project' }); throw new CustomError(403, 'Forbidden'); }
      const permissions = session.userPermissions ?? [];
      const required = auth.mc?.requiredPermission;
      if (required && !permissions.includes(required)) { getLogger().warn('forbidden', { reason: 'missing-permission' }); throw new CustomError(403, 'Forbidden'); }
      return { kind: 'merchant-center', userId: session.userId, projectKey: session.projectKey, permissions };
    }

    if (auth.serviceToken && matchesServiceToken(credential, auth.serviceToken)) return { kind: 'service-token' };
    getLogger().warn('authentication failed', { reason: 'unknown-credential' });
    throw invalid();
  };
}
```
  `MC_REQUIRED_PERMISSION` lives inside `auth.mc` in the config (D design), so it only applies to MC principals; the static token is not subject to it.
  Done when: typecheck passes.
- [ ] 4.4 `src/middleware/auth.middleware.ts`:

```ts
import type { RequestHandler } from 'express';
import { getConfiguration } from '../config/env';
import { createAuthenticator } from '../auth/authenticate';

let authenticate: ReturnType<typeof createAuthenticator> | undefined;
export const resetAuthenticatorForTests = (): void => { authenticate = undefined; };

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    authenticate ??= createAuthenticator(getConfiguration());
    req.principal = await authenticate(req);
    next();
  } catch (error) { next(error); }
};
```
  Express 4 does not catch rejected promises: the `try/catch` + `next(error)` is mandatory.
- [ ] 4.5 Startup diagnostics in `src/index.ts` (D): after the logger is created log `logger.info('authentication', { merchantCenter: Boolean(config.auth.mc), serviceToken: Boolean(config.auth.serviceToken), requiredPermission: config.auth.mc?.requiredPermission ?? null })`; if `!config.auth.mc` log `logger.warn('Merchant Center token verification is disabled: set CONNECT_SERVICE_URL (provided by Connect) and make CLOUD_IDENTIFIER resolvable')`; if neither mc nor serviceToken: `logger.warn('No credential kind is enabled: every protected route will answer 401')`. Put this in a function `logAuthDiagnostics(logger, config)` exported from `src/auth/diagnostics.ts` and unit test it with a fake logger object (`{info: jest.fn(), warn: jest.fn()}`) for the 3 cases.

**Pitfalls.** (1) `req.headers.authorization` can only be `string | undefined` in Node. (2) Never log the credential, headers or `req.originalUrl` with query (it can contain secrets) at this level: only reason codes. (3) The library needs `x-mc-api-cloud-identifier`: in tests add it (kit does).

**Rollback.** Delete `src/auth/{service-token,mc-verifier,authenticate,diagnostics}.ts` and `src/middleware/auth.middleware.ts`, revert `index.ts`.

---

## 5. CORS and the router gate

**Context.** CORS for direct browser callers; then the deny-by-default router layout that F and G fill in.

**Pre-conditions.** Group 4.

- [ ] 5.1 `src/middleware/cors.middleware.ts`:

```ts
import cors from 'cors';
import type { RequestHandler } from 'express';
import type { Configuration } from '../config/env';

export function createCorsMiddleware(origins: Configuration['auth']['corsOrigins']): RequestHandler {
  const allowed = origins === 'all' ? undefined : new Set(origins);
  return cors({
    origin: (origin, callback) => callback(null, !origin || allowed === undefined || allowed.has(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Source'],
    exposedHeaders: ['X-Correlation-ID'],
    maxAge: 600,
    credentials: false,
  });
}
```
  Experiment result to expect (explore section 3): allowed origin -> `Access-Control-Allow-Origin` + `Vary: Origin`; denied -> no CORS headers, no error.
  With `'all'` the value echoed is the request origin (cors does that for `true`), not `*`; acceptable because credentials are off.
- [ ] 5.2 `src/app.ts` (D): add `app.use(createCorsMiddleware(getConfiguration().auth.corsOrigins));` after `accessLog` and before `express.json`. This is the first place `createApp()` reads configuration: change the signature to `createApp(config: Configuration = getConfiguration())` and use `config` everywhere. `index.ts` passes the config it already read.
- [ ] 5.3 `src/routes/service.route.ts` (D) becomes the single place where the policy is visible:

```ts
const serviceRouter = Router();

// 1. PUBLIC: no credentials needed, Authorization ignored. Only routes of the table in design.md section 4 marked PUBLIC.
serviceRouter.use(healthRouter);
// (F inserts here: publishedPagesRouter, publishedContentsRouter, configurationReadRouter)

// 2. THE GATE: everything registered below requires a valid credential.
serviceRouter.use(requireAuth);

// 3. PROTECTED: (F and G mount their routers here)

export default serviceRouter;
```
  The comment lines above are the only comments allowed (they are documentation of the access policy, not dead code); keep them short. Export also `export { requireAuth }`? Not needed.
  Done when: typecheck passes.

- [ ] 5.4 `src/middleware/public-resolve.middleware.ts` (used by spec F's public datasource router; E builds and tests it with a probe route):

```ts
import type { RequestHandler } from 'express';
import CustomError from '../errors/custom.error';
import { getConfiguration } from '../config/env';

export const BUILT_IN_DATASOURCE_KEYS = ['product-by-sku', 'products-by-sku'] as const;

let windowStart = 0; let count = 0;
export const resetPublicResolveForTests = (): void => { windowStart = 0; count = 0; };

/** Place BEFORE the auth gate on POST /datasource/:key/test. Falls through (next()) when the request is not eligible. */
export const publicResolveGuard: RequestHandler = (req, res, next) => {
  const { enabled, maxPerMinute } = getConfiguration().auth.publicResolve;
  const key = req.params.key ?? '';
  if (!enabled || !(BUILT_IN_DATASOURCE_KEYS as readonly string[]).includes(key)) { next('route'); return; }
  const now = Date.now();
  if (now - windowStart >= 60_000) { windowStart = now; count = 0; }
  if (++count > maxPerMinute) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((windowStart + 60_000 - now) / 1000))));
    next(new CustomError(429, 'Too many requests'));
    return;
  }
  next();
};
```
  How F mounts it: `router.post('/datasource/:key/test', publicResolveGuard, resolveHandler)` in a router placed BEFORE `requireAuth`; `next('route')` skips that route so processing continues to the gate and then to the protected router that has the same path. Map `429` in D's `toCustomError`/error middleware: `CustomError` already carries its status. Unit/integration tests `tests/integration/public-resolve.test.ts` with a probe app mirroring the 4 spec scenarios (flag off, flag on built-in anonymous (also with garbage `Authorization`), other key / other routes 401, limit 2 -> third 429 with `retry-after`).
  Run `yarn jest tests/integration/public-resolve.test.ts` -> pass.

**Pitfalls.** `app.use(cors(...))` must come before the router so preflight `OPTIONS` never reaches `requireAuth`. Order matters: public routers must be mounted BEFORE `requireAuth`, otherwise they are protected (safe failure direction).

**Rollback.** Revert `app.ts`, `service.route.ts`; delete `cors.middleware.ts`.

---

## 6. Test kit

**Context.** We simulate the Merchant Center gateway: our own key pair, a fake JWKS endpoint at the real issuer URL, and a token signer.

**Pre-conditions.** Groups 2-5; `jose` and `msw@2.10.5` installed.

- [ ] 6.1 `tests/support/mc.ts`:

```ts
import { http, HttpResponse, type RequestHandler } from 'msw';
import { SignJWT, exportJWK, generateKeyPair, type KeyLike, type JWK } from 'jose';

export const MC_ISSUER = 'https://mc-api.europe-west1.gcp.commercetools.com';
export const MC_LEGACY_ISSUER = 'https://mc-api.commercetools.com';
export const AUDIENCE_ORIGIN = 'https://service.test.local';

export interface SignOptions {
  projectKey?: string | null;        // null = omit the claim
  issuer?: string; audience?: string; expiresIn?: string | number; notBefore?: number;
  permissions?: string[]; key?: KeyLike; kid?: string; alg?: 'RS256' | 'HS256';
  subject?: string;
}
export type JwksMode = 'ok' | 'http-500' | 'network-error';

export async function createMcKit() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  let mode: JwksMode = 'ok';
  const jwks = (issuer: string): RequestHandler =>
    http.get(`${issuer}/.well-known/jwks.json`, () =>
      mode === 'ok' ? HttpResponse.json({ keys: [jwk] }) : mode === 'http-500' ? new HttpResponse('boom', { status: 500 }) : HttpResponse.error());

  async function sign(opts: SignOptions = {}): Promise<string> {
    const issuer = opts.issuer ?? MC_ISSUER;
    const claims: Record<string, unknown> = { type: 'exchange' };
    if (opts.projectKey !== null) claims[`${issuer}/claims/project_key`] = opts.projectKey ?? 'test-project';
    if (opts.permissions) claims[`${issuer}/claims/user_permissions`] = opts.permissions;
    let jwt = new SignJWT(claims).setProtectedHeader({ alg: opts.alg ?? 'RS256', kid: opts.kid ?? 'test-key' })
      .setSubject(opts.subject ?? 'user-1').setIssuer(issuer).setAudience(opts.audience ?? AUDIENCE_ORIGIN)
      .setIssuedAt().setExpirationTime(opts.expiresIn ?? '60s');
    if (opts.notBefore) jwt = jwt.setNotBefore(opts.notBefore);
    return jwt.sign(opts.alg === 'HS256' ? new TextEncoder().encode('x'.repeat(48)) : opts.key ?? privateKey);
  }
  return {
    handlers: [jwks(MC_ISSUER), jwks(MC_LEGACY_ISSUER)],
    setJwksMode: (m: JwksMode) => { mode = m; },
    sign,
    otherKey: async () => (await generateKeyPair('RS256')).privateKey,
    headers: (version: 'v1' | 'v2' = 'v2') => ({ 'x-mc-api-cloud-identifier': 'gcp-eu', 'x-mc-api-forward-to-version': version }),
  };
}
```
  (Complete the unsigned `alg: none` case in the test file with `new UnsecuredJWT({}).setIssuer(...)...encode()` from `jose`.)
  Done when: it compiles.
- [ ] 6.2 `tests/support/probe-app.ts`: builds the minimal app used by the auth tests:

```ts
export function createProbeApp() {
  resetConfigurationForTests(); resetAuthenticatorForTests();
  const config = getConfiguration();
  const app = express();
  app.use(requestContext, accessLog, createCorsMiddleware(config.auth.corsOrigins), express.json());
  const router = Router();
  router.use(healthRouter);
  router.get('/public-probe', (_q, r) => r.json({ access: 'public' }));
  router.use(requireAuth);
  router.get('/protected-probe', (q, r) => r.json({ principal: q.principal }));
  router.post('/protected-probe', (q, r) => r.status(201).json({ principal: q.principal }));
  app.use('/service', router);
  app.use(notFoundMiddleware, errorMiddleware);
  return app;
}
```

---

## 7. Tests: the auth matrix and friends

**Context.** The Connect checklist demands a parameterised rejection matrix; this is where "the endpoint is secure" is proven.

**Pre-conditions.** Group 6.

- [ ] 7.1 `tests/integration/auth-matrix.test.ts`. Structure:

```ts
const server = setupServer(); let kit: Awaited<ReturnType<typeof createMcKit>>; let app: Express;
beforeAll(async () => { kit = await createMcKit(); server.use(...kit.handlers); listenQuietly(server); });
afterAll(() => server.close()); afterEach(() => { kit.setJwksMode('ok'); });
beforeEach(() => { app = createProbeApp(); });
```
  Rejection table (each row is run against `GET /service/protected-probe` AND `POST /service/protected-probe`; `expected` is the status; all `401` rows must have the SAME `message` `Invalid or expired credentials` and header `www-authenticate` containing `error="invalid_token"`):

| id | Authorization / headers | expected |
| --- | --- | --- |
| no-header | none | 401 `Authentication required` (+ `www-authenticate: Bearer realm="contentools"` without `error=`) |
| basic | `Basic dXNlcjpwYXNz` | 401 |
| empty-bearer | `Bearer ` | 401 |
| garbage-jwt | `Bearer abc.def.ghi` | 401 |
| alg-none | unsecured JWT with correct iss/aud | 401 |
| hs256 | `sign({alg:'HS256'})` | 401 |
| wrong-key | `sign({key: await kit.otherKey()})` | 401 |
| expired | `sign({expiresIn: Math.floor(Date.now()/1000) - 30})` | 401 |
| not-yet-valid | `sign({notBefore: now+3600, expiresIn: '2h'})` | 401 |
| wrong-issuer | `sign({issuer:'https://evil.example'})` | 401 |
| wrong-audience | `sign({audience:'https://other.test.local'})` | 401 |
| unknown-kid | `sign({kid:'rotated'})` | 401 |
| missing-gateway-headers | valid token, no `x-mc-*` headers | 401 |
| opaque-wrong | `Bearer not-the-service-token-xxxxxxxxxxxxxxxxxxxxxx` | 401 |
| other-project | valid token, `projectKey:'someone-else'` | 403 `Forbidden` |
| no-project-claim | valid token, `projectKey: null` | 403 |
| jwks-500 | valid token, `setJwksMode('http-500')` | 503 `Authentication service unavailable`, header `retry-after: 5` |
| jwks-network | valid token, `setJwksMode('network-error')` | 503 |

  Acceptance rows: valid v2 token -> 200/201 and body `principal` = `{kind:'merchant-center', userId:'user-1', projectKey:'test-project', permissions:[]}`; valid token with `x-mc-api-forward-to-version: v1` and `issuer: MC_LEGACY_ISSUER` -> 200; valid token with query string `?x=1` -> 200; valid token for audience `${AUDIENCE_ORIGIN}/service/protected-probe` (full-path policy) -> 200; correct `SERVICE_API_TOKEN` -> 200 with `{kind:'service-token'}`.
  Extra assertions: (a) for every 401 row collect `res.body` minus `correlationId`: all deep-equal (no oracle); (b) spy on `process.stdout.write` and assert the token string is never present in the captured output; (c) a log line with `"reason"` exists for at least `expired`.
  Run: `yarn jest tests/integration/auth-matrix.test.ts` -> expected about 40 tests passing (18 rows x 2 methods + acceptance).
- [ ] 7.2 `tests/integration/auth-policy.test.ts`:
  * public route ignores a garbage credential: `GET /service/public-probe` with `Authorization: Bearer garbage` -> 200 `{access:'public'}`; `GET /service/health` same.
  * gate default: a route registered after `requireAuth` (the probe) without credentials -> 401 (scenario "New route is protected by default").
  * `MC_REQUIRED_PERMISSION`: set `process.env.MC_REQUIRED_PERMISSION='canManageContentools'` before `createProbeApp()`; token without claim -> 403; with `['canViewContentools']` -> 403; with `['canManageContentools']` -> 200; the service token is unaffected (200). Delete the env var in `afterEach`.
  * `SERVICE_API_TOKEN` unset (delete env, rebuild app): opaque bearer -> 401; MC token still 200.
  * MC disabled (delete `CONNECT_SERVICE_URL`): MC token -> 401, service token -> 200.
  Run `yarn jest tests/integration/auth-policy.test.ts` -> pass.
- [ ] 7.3 `tests/integration/cors.test.ts`: with `process.env.CORS_ALLOWED_ORIGINS='http://localhost:5173'`: allowed simple request has ACAO, `vary: origin`, `access-control-expose-headers` contains `X-Correlation-ID`; denied origin -> status 200 from the public probe and `access-control-allow-origin` undefined; preflight allowed `OPTIONS /service/protected-probe` with `Access-Control-Request-Method: PUT` and `Access-Control-Request-Headers: authorization,content-type` -> 204, `access-control-allow-methods` `GET,POST,PUT,DELETE,OPTIONS`, `access-control-allow-headers` lists `Authorization` and NOT `x-project-key`, `access-control-max-age` `600`, no `access-control-allow-credentials`, and NO 401 despite no credentials; unset variable -> no CORS headers even for `Origin: http://localhost:5173`; `'*'` -> ACAO echoed for any origin; no `Origin` header -> normal response.
  Run `yarn jest tests/integration/cors.test.ts` -> pass.
- [ ] 7.4 `tests/unit/service-token.test.ts` (4.1) and `tests/unit/diagnostics.test.ts` (4.5) written/passing.
- [ ] 7.5 Whole suite: `yarn test && yarn lint && yarn typecheck && yarn build` -> all green.

**Pitfalls.** (1) Each test file that uses msw must call `listenQuietly(server)` (ignores `127.0.0.1`). (2) `jose` token `expiresIn` as a number is an absolute epoch second in `setExpirationTime`; for "expired" pass a past epoch. (3) The library caches JWKS clients per issuer URL for the process lifetime: in the JWKS-failure rows use a fresh `kid`-less flow; if a previous test cached the key, the failure row would still pass verification. If you see `jwks-500` returning 200, put the failure rows in their own test file (separate jest module registry = fresh cache). (4) Reset env mutations in `afterEach`.

**Rollback.** Delete `tests/integration/auth-*.test.ts`, `cors.test.ts`, `tests/support/mc.ts`, `probe-app.ts`.

---

## 8. Manual and live verification

- [ ] 8.1 Static-token smoke (no MC needed). Create `service/.env` from `.env.example`, add `SERVICE_API_TOKEN=$(openssl rand -hex 24)` (48 hex chars) and `CORS_ALLOWED_ORIGINS=http://localhost:5173`; run `yarn build && node --env-file=.env build/index.js`. Expected log lines: `authentication {"merchantCenter":false,"serviceToken":true,...}` and a `warn` that MC verification is disabled.
  `curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/service/health` -> `200`;
  `curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/service/anything-protected` -> `404` (no route yet: F adds them; before F this only proves unknown paths stay 404 and the gate does not crash);
  `curl -si -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: PUT" localhost:8080/service/x | head -12` -> `204` with the allow headers. Then `rm .env`.
  (After F lands, the same `curl` with and without `-H "Authorization: Bearer $SERVICE_API_TOKEN"` against `GET /service/default/puck-pages` must give `200` / `401`; F's verification repeats it.)
- [ ] 8.2 Real Merchant Center check (owner-assisted, manual step M-04): deferred to spec K/Q because it needs the deployed or tunnelled service URL and a logged-in MC session. Record in `manual.md`; nothing to do here.

---

## 9. Rollback / recovery

Revert in reverse order of groups 7 to 2; D's core is untouched except `custom.error.ts`, `error.middleware.ts`, `app.ts`, `service.route.ts`, `env.ts`, `index.ts` and `tests/support/env.ts` (all edits are additive).

---

## 10. Definition of Done (mapped to spec scenarios)

| Spec scenario | Test |
| --- | --- |
| Credential format: header missing / wrong scheme | matrix rows `no-header`, `basic` |
| Valid token / v1 gateway version / rejection matrix / identity provider unreachable | matrix acceptance rows and all rejection rows, `jwks-500`, `jwks-network` |
| Project and permission authorisation | rows `other-project`, `no-project-claim`; `auth-policy` permission cases |
| Static token: correct/wrong, not configured, weak token refused | matrix `opaque-wrong` + acceptance; `auth-policy` unset case; `auth-config` (d) |
| Public route with garbage credentials; new route protected by default | `auth-policy` first two cases |
| Draft-exposing reads protected | F's inventory test (spec F) - E provides the gate; E's probe covers the mechanism |
| Opt-in public datasource resolution (flag off / on built-in / other key or route / limit) | `public-resolve.test.ts` (5.4) |
| Startup diagnostics | `diagnostics.test.ts` |
| CORS: allowed / disallowed / invalid configuration / preflight / no credentials | `cors.test.ts`, `auth-config` (e) |

Also: `yarn test && yarn lint && yarn typecheck && yarn build` green; no occurrence of `x-project-key` in `service/src` (`grep -rni x-project-key src --exclude-dir=_pending` prints nothing); `questions.md` / `manual.md` handed to the coordinator.
