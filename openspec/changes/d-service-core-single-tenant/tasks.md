## 0. How to read this file

Vocabulary used below (explained once):

* **Connect** - commercetools' hosting platform. `connect.yaml` at the repo root declares apps; our `service` app is an Express server
  Connect builds from `service/` and exposes at `https://<generated-host>/service`. Connect injects the commercetools API client as env vars.
* **Custom Object** - a JSON document stored inside a commercetools project, addressed by `container` + `key`. This is the only database the service uses.
* **Tenant** - in the old CMS service, one customer commercetools project registered in Firestore. In Contentools there is exactly one: the project
  whose API client Connect injects (`CTP_PROJECT_KEY`).
* **msw** - "Mock Service Worker", intercepts outgoing HTTP in tests so no real commercetools is called.
* **supertest** - lets a test call an Express app in memory.
* Paths are relative to the repo root `/Users/behnam/code/commercetools-labs/contentools` (written `<root>`) unless they start with `/Users/behnam/code/cms`
  (the read-only SOURCE repo; never edit it).

Global rules for every file you create under `service/src` or `service/tests`: first lines must be the SPDX header (exact text)

```ts
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```

No `console.log` (use the logger), no `any` (use `unknown` + narrowing), no commented-out code, never write the word "cms" (case-insensitive) in code, comments or names.

Conventions: `service/` is a self-contained Connect app (no workspaces) managed with **Yarn 1 classic** (`yarn install`, `yarn <script>`, `yarn add`); never run `npm install` there (it would create a `package-lock.json`). Run commands from `<root>/service` unless stated.

---

## 1. Preflight and safety net

**Context.** This change deletes a lot. Before touching anything we prove the pre-conditions and take a backup so any group can be rolled back.

**Pre-conditions.** Specs A (repo foundation) and C (legacy removal) are archived: `openspec list` must not show them as active, `service/` exists in `<root>`.
Node 22 (`node -v` prints `v22.x`), `yarn -v` prints `1.22.x`.

- [ ] 1.1 Confirm the starting state.
  Run: `cd <root>/service && ls src && ls src/routes src/controllers`.
  Expected: NO `content-item*.ts`, `page*.ts`, `proxy.route.ts`, `bundler.utils.ts` (spec C removed them). If any is still present, STOP and finish spec C first (do not delete them here).
  Done when: the listing contains `puck-page.route.ts`, `puck-content.route.ts`, `puck-template.route.ts`, `configuration.route.ts`, `datasource.route.ts`, `product.route.ts`, `file.route.ts`, `content-type.route.ts` and no legacy route file.
- [ ] 1.2 Back up the service folder to a directory outside the repo: `export SCRATCH=~/scratch-contentools && mkdir -p "$SCRATCH" && cp -R <root>/service "$SCRATCH/service-d-backup"`.
  Done when: `ls "$SCRATCH/service-d-backup/src/app.ts"` exists.
- [ ] 1.3 Record the baseline of forbidden words so you can see them disappear: `cd <root>/service && grep -rniE "firestore|jsonwebtoken|x-project-key|authenticate-project|refresh-jwt|validateProject|requireProjectKey|multitenant|sdk-client-v2|GCP_FIRESTORE|ct-poc|sellertools" src package.json | wc -l`.
  Write the number in the task checkbox comment of your PR/notes. Done when: you have a number (expected: > 100).

**Pitfalls.** Never copy `.env` files from `/Users/behnam/code/cms/service` (they may contain real secrets). `service/.env*` in `<root>` must not exist yet; if it does, delete it.

**Rollback.** Nothing changed yet.

---

## 2. Park the files that later specs port (`_pending/`)

**Context.** The kept route groups (specs F and G) are written against the tenant code D deletes (`validateJwt`, `requireProjectKey`, `AuthenticatedRequest`). Patching them now and again in F is wasted work. We move them, untouched, to `service/src/_pending/` and exclude that folder from the compiler and jest, so the tree compiles at the end of D. F and G move files back one by one.

**Pre-conditions.** Group 1 done.

- [ ] 2.1 Create the folder tree and move (use `mv`, do not edit content). From `<root>/service/src`:

```bash
mkdir -p _pending/routes _pending/controllers/file-controllers _pending/services _pending/utils
for f in puck-page puck-content puck-template configuration datasource product content-type file; do mv routes/$f.route.ts _pending/routes/; done
for f in puck-page.controller puck-content.controller puck-template.controller configuration.controller product.controller \
         content-state-controller content-version-controller datasource-resolution.route content-type-import.controller file-controller; do
  mv controllers/$f.ts _pending/controllers/
done
mv controllers/file-controllers/* _pending/controllers/file-controllers/ && rmdir controllers/file-controllers
mv services/products.ts _pending/services/
mv samples _pending/samples
mv utils/secure-transpiler.ts _pending/utils/
```

  Done when: `ls _pending/routes | wc -l` prints `8`, `ls _pending/controllers | wc -l` prints `11` (10 files + the `file-controllers` dir), and `ls controllers` shows only `custom-object.controller.ts` (deleted in group 3) and `auth.controller.ts` (deleted in group 3).
- [ ] 2.2 `controllers/custom-object.controller.ts` is NOT parked: it is replaced by `ct/custom-objects.ts` (group 7). Leave it for now.
- [ ] 2.3 Rename the samples folder now so "cms" never appears in the target, and delete the two dead seed files (nothing imports them: `grep -rn "samples/content-types'\|samples/datasource'" src` finds no importer outside `samples/`): `mv _pending/samples/CMS _pending/samples/content-types && rm -f _pending/samples/content-types.ts _pending/samples/datasource.ts` (do the `rm` BEFORE the `mv` is irrelevant, but a file `content-types.ts` next to a folder `content-types/` would make `import '../samples/content-types'` ambiguous, so they must go). In `_pending/controllers/content-type-import.controller.ts` change the import `'../samples/CMS'` to `'../samples/content-types'` (the only edit allowed in `_pending/` in this spec). Done when: `grep -rni "cms" _pending | wc -l` prints `0`. (If it prints more, list them with `grep -rni cms _pending`; each hit must be fixed by F/G: add a line to `explore.md` and leave it.)

**Pitfalls.** `rmdir controllers/file-controllers` fails if a hidden file remains: `ls -la` it.

**Rollback.** `rm -rf <root>/service && cp -R "$SCRATCH/service-d-backup" <root>/service`.

---

## 3. Delete the tenant layer

**Context.** Everything that exists only because the service was multi-tenant goes. Use the table in `explore.md` section 2 as the authority.

**Pre-conditions.** Group 2 done.

- [ ] 3.1 Delete files (from `<root>/service`):

```bash
rm -f src/utils/firestore.utils.ts \
      src/middleware/project.middleware.ts src/middleware/project-key.middleware.ts src/middleware/jwt.middleware.ts \
      src/middleware/auth.middleware.ts src/middleware/http.middleware.ts src/middleware/deprecation.middleware.ts \
      src/controllers/auth.controller.ts src/controllers/custom-object.controller.ts src/routes/auth.route.ts \
      src/utils/secrets.utils.ts src/utils/config.utils.ts src/utils/region.ts src/utils/domain.ts \
      src/types/service.types.ts src/types/index.types.ts src/types/sdkError.ts src/types/rollup-plugin-string.d.ts \
      src/interfaces/config.interface.ts src/interfaces/resource.interface.ts src/interfaces/response.interface.ts \
      src/api/success.api.ts src/constants.ts src/utils/constants.ts src/utils/assert.utils.ts src/utils/distance.ts \
      src/client/build.client.ts src/client/create.client.ts src/mappers/page.ts \
      src/validators/env.validators.ts src/validators/helpers.validators.ts
rm -rf src/utils/__mocks__ src/client src/interfaces src/api src/mappers src/validators src/types build e2e postman Dockerfile .dockerignore docker-compose.e2e.yml yarn.lock node_modules   # the stale yarn.lock is regenerated in 4.2
```

  (`src/types` is recreated in task 4.5; `node_modules` is reinstalled in group 4.) `src/utils/assert.utils.ts` and `distance.ts` are deleted because grep shows no importer (`grep -rn "assert.utils\|utils/distance" src` printed only themselves in the source repo).
  Done when: `find src -type f -not -path "src/_pending/*"` lists only: `index.ts`, `app.ts`, `errors/custom.error.ts`, `middleware/error.middleware.ts`, `routes/service.route.ts`, `utils/logger.utils.ts`.
- [ ] 3.2 Delete the old test leftovers: `rm -rf tests` (the source `tests/` held nothing used) and keep `jest.config.cjs` for rewriting in 4.4.
  Done when: `ls` shows `package.json jest.config.cjs LICENSE README.md src tsconfig.json` plus dotfiles.
- [ ] 3.3 Remove the old `.env*`: `rm -f .env .env.example`. (Rewritten in task 4.6.) `LICENSE` stays (A owns it).

**Pitfalls.** Do not delete `src/errors/custom.error.ts` (reused unchanged) or `middleware/error.middleware.ts` (rewritten in 6.2). The project will not compile until group 8; that is expected.

**Rollback.** Restore the backup (see 2.x rollback).

---

## 4. Package, tooling, dependencies

**Context.** The service is its own Yarn 1 project. We replace legacy/forbidden packages, add the new SDK, and set scripts that Connect and humans use.

**Pre-conditions.** Group 3 done.

- [ ] 4.1 Rewrite `service/package.json` completely:

```json
{
  "name": "@commercetools-labs/contentools-service",
  "version": "1.0.0",
  "private": true,
  "description": "Contentools service: content API on commercetools Custom Objects (Connect service application)",
  "license": "MIT",
  "packageManager": "yarn@1.22.22",
  "engines": { "node": ">=22" },
  "main": "build/index.js",
  "scripts": {
    "build": "rimraf build && tsc -p tsconfig.build.json",
    "gcp-build": "yarn build",
    "start": "node build/index.js",
    "start:dev": "concurrently -k \"tsc -p tsconfig.build.json --watch\" \"node --env-file=.env --watch build/index.js\"",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"{src,tests}/**/*.ts\"",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@commercetools-backend/express": "^27.13.0",
    "@commercetools-backend/loggers": "^27.13.0",
    "@commercetools/platform-sdk": "^8.27.0",
    "@commercetools/ts-client": "^4.10.0",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.13.0",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "concurrently": "^9.0.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "jose": "^5.10.0",
    "msw": "2.10.5",
    "prettier": "^3.3.0",
    "rimraf": "^6.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.8.3"
  }
}
```

  Notes: `msw` is pinned EXACTLY to `2.10.5` (>= 2.11 breaks under jest CJS, see explore section 4). `@commercetools-backend/express` and `cors` are installed now but used by spec E. The storage dependencies (`@aws-sdk/client-s3`, `@google-cloud/storage`, `cloudinary`, `multer`, `@types/multer`) are NOT added here; spec G adds them when it ports the media code. `gcp-build` exists because Connect's Node build calls it if present.
  Done when: `grep -E "firestore|jsonwebtoken|sdk-client-v2|validator|dotenv|uuid|body-parser|rollup|lit" package.json` prints nothing.
- [ ] 4.2 Install: `cd <root>/service && yarn install`. Expected: ends with `Done in N.NNs.`, creates `yarn.lock`, no `package-lock.json`, no unmet-peer error you cannot explain. Then `yarn list --pattern "@commercetools/(ts-client|platform-sdk)"` shows ONE `ts-client` (4.x) and one `platform-sdk` (8.x). If two ts-client versions appear, align the ranges.
  Done when: `node -e "console.log(require('@commercetools/ts-client/package.json').version)"` prints `4.x.y`.
- [ ] 4.3 Create `tsconfig.json` (used by editor, lint and jest) and `tsconfig.build.json` (used by `build`):

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022", "module": "commonjs", "moduleResolution": "node",
    "lib": ["ES2022"], "strict": true, "noUncheckedIndexedAccess": true,
    "esModuleInterop": true, "skipLibCheck": true, "resolveJsonModule": true,
    "declaration": false, "sourceMap": true, "outDir": "build", "rootDir": ".",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules", "build", "src/_pending"]
}
// tsconfig.build.json
{ "extends": "./tsconfig.json",
  "compilerOptions": { "rootDir": "src", "outDir": "build", "sourceMap": false, "types": ["node"] },
  "include": ["src/**/*.ts"], "exclude": ["node_modules", "build", "src/_pending", "tests"] }
```

  (JSON does not allow comments: omit the `// ...` lines when you create the two files.)
  Done when: `yarn tsc -p tsconfig.json --noEmit` is allowed to fail on missing modules only (until group 8); it must not report "cannot find tsconfig".
- [ ] 4.4 Create `jest.config.cjs` (overwrite):

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/src/_pending/'],
  setupFiles: ['<rootDir>/tests/support/env.ts'],
  clearMocks: true,
};
```
- [ ] 4.5 Create `.eslintrc.cjs` (copy from `/Users/behnam/code/cms/service/.eslintrc.cjs`; it already has `no-console: error`), add `ignorePatterns: ['build', 'src/_pending', 'node_modules']`; copy `.prettierrc` and `.nvmrc` (`22`) from the source; create `.gitignore` containing `node_modules`, `build`, `.env`, `.env.*`, `!.env.example`, `coverage`.
  Done when: `yarn eslint . --ext .ts` runs (it may report errors in files not yet written; no config error).
- [ ] 4.6 Create `.env.example` (placeholders only, no real values):

```dotenv
# Local development only. In Connect these CTP_* values are injected by the platform
# (inheritAs.apiClient); never declare them in connect.yaml.
CTP_API_URL=https://api.europe-west1.gcp.commercetools.com
CTP_AUTH_URL=https://auth.europe-west1.gcp.commercetools.com
CTP_PROJECT_KEY=your-project-key
CTP_CLIENT_ID=your-client-id
CTP_CLIENT_SECRET=your-client-secret
CTP_SCOPE=manage_key_value_documents:your-project-key view_products:your-project-key
PORT=8080
LOG_LEVEL=debug
MAX_VERSIONS=5
CONTAINER_PREFIX=
```
  Done when: `grep -c "=" .env.example` prints `11` and no variable named `GCP_FIRESTORE_*` or `JWT_*` exists in it.

**Pitfalls.** Do not run `npm install` here (creates `package-lock.json`). Do not commit `node_modules`. If `yarn install` warns about peer deps of `@commercetools-backend/express` (`express`), they are satisfied by `express@^4`.

**Rollback.** Restore `package.json` from backup; `rm -rf node_modules yarn.lock`.

---

## 5. Configuration module (env contract)

**Context.** One place reads and validates env vars and fails fast. Tests drive it with plain objects.

**Pre-conditions.** Group 4 done (zod installed).

- [ ] 5.1 Create `src/config/containers.ts`:

```ts
export const CONTAINER_NAMES = {
  puckPage: 'puck-page',
  puckPageState: 'puck-page-state',
  puckPageVersion: 'puck-page-version',
  puckContent: 'puck-content',
  puckContentState: 'puck-content-state',
  puckContentVersion: 'puck-content-version',
  puckTemplate: 'puck-template',
  configuration: 'configuration',
  contentType: 'content-type',
  datasource: 'datasource',
} as const;

export type ContainerKey = keyof typeof CONTAINER_NAMES;

export const containerName = (prefix: string, key: ContainerKey): string =>
  `${prefix}${CONTAINER_NAMES[key]}`;
```
  Source of names: `/Users/behnam/code/cms/service/src/constants.ts` lines 22-23, 93-112 (defaults) and `samples/datasource.ts` line 3 (`datasource`). `content-type` is line 19-20.
- [ ] 5.2 Create `src/config/env.ts`. Skeleton (complete it; keep exported names, E extends it):

```ts
import { z } from 'zod';

export class ConfigurationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid environment configuration: ${problems.join('; ')}`);
    this.name = 'ConfigurationError';
  }
}

const httpsUrl = z.string().url().refine((v) => v.startsWith('https://') || v.startsWith('http://localhost') , 'must be an https URL')
  .transform((v) => v.replace(/\/+$/, ''));

const schema = z.object({
  CTP_API_URL: httpsUrl,
  CTP_AUTH_URL: httpsUrl,
  CTP_PROJECT_KEY: z.string().min(1),
  CTP_CLIENT_ID: z.string().min(1),
  CTP_CLIENT_SECRET: z.string().min(1),
  CTP_SCOPE: z.string().optional().default(''),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MAX_VERSIONS: z.coerce.number().int().min(1).max(100).default(5),
  CONTAINER_PREFIX: z.string().regex(/^[A-Za-z0-9_~.-]{0,64}$/).default(''),
});

export interface Configuration {
  nodeEnv: string;
  port: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxVersions: number;
  containerPrefix: string;
  ctp: { apiUrl: string; authUrl: string; projectKey: string; clientId: string; clientSecret: string; scopes: string[] };
}

export function readConfiguration(env: NodeJS.ProcessEnv = process.env): Configuration {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    // report variable NAMES and rule, never the received values
    throw new ConfigurationError(parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`));
  }
  const v = parsed.data;
  return { /* map to Configuration; scopes: v.CTP_SCOPE.split(/\s+/).filter(Boolean) */ } as Configuration;
}

let cached: Configuration | undefined;
export const getConfiguration = (): Configuration => (cached ??= readConfiguration());
export const resetConfigurationForTests = (): void => { cached = undefined; };
```
  Notes: empty-string env vars (`CTP_PROJECT_KEY=`) must count as missing: add `const clean = Object.fromEntries(Object.entries(env).filter(([, x]) => x !== undefined && x !== ''))` before `safeParse`. `NODE_ENV` -> `nodeEnv` (default `production`). Allow `http://localhost` only so local msw/dev URLs work; real Connect URLs are https. Do NOT put `received` values into messages (zod's default messages may include them for enums: use the custom message `must be one of error|warn|info|debug`).
  Done when: the file compiles in isolation (`yarn tsc --noEmit src/config/env.ts --esModuleInterop --skipLibCheck --target ES2022 --module commonjs --moduleResolution node --strict` prints nothing).
- [ ] 5.3 Create `tests/support/env.ts` (jest `setupFiles`, runs before every test file) setting a valid default environment pointing at fake hosts:

```ts
process.env.CTP_API_URL = 'https://api.test.local';
process.env.CTP_AUTH_URL = 'https://auth.test.local';
process.env.CTP_PROJECT_KEY = 'test-project';
process.env.CTP_CLIENT_ID = 'test-client-id';
process.env.CTP_CLIENT_SECRET = 'test-client-secret';
process.env.CTP_SCOPE = 'manage_key_value_documents:test-project view_products:test-project';
process.env.LOG_LEVEL = 'error';
process.env.NODE_ENV = 'test';
```
- [ ] 5.4 Write `tests/unit/config.test.ts` covering the four spec scenarios (valid -> defaults; several invalid -> one error naming all; secret not echoed: call `readConfiguration({...valid, CTP_CLIENT_SECRET:'s3cr3t-value', CTP_PROJECT_KEY:''})` and assert `expect(String(err.message)).not.toContain('s3cr3t-value')`; `CONTAINER_PREFIX='bad prefix!'` rejected; `MAX_VERSIONS='abc'` rejected).
  Run: `yarn jest tests/unit/config.test.ts` -> expected `Tests: 5 passed` (adjust to your count, all green).
  Done when: those tests pass.

**Pitfalls.** zod 4 API: `error.issues` (not `.errors`); `z.coerce.number()` turns `''` into `0`, hence the empty-string filter. 

**Rollback.** Delete `src/config`, `tests/unit/config.test.ts`.

---

## 6. Logging, correlation id, access log, errors

**Context.** Operators debug a Connect app only through its logs, so every line is JSON and tied to one request by a correlation id. Errors have one shape and never leak internals.

**Pre-conditions.** Group 5 done.

- [ ] 6.1 `src/utils/logger.utils.ts`:

```ts
import { createApplicationLogger } from '@commercetools-backend/loggers';
import type { Logger } from 'winston';
import { getConfiguration } from '../config/env';

import { correlationFormat } from '../observability/log-format';

let logger: Logger | undefined;
export const getLogger = (): Logger =>
  (logger ??= createApplicationLogger({ json: true, level: getConfiguration().logLevel, formatters: [correlationFormat] }));
```
  `winston` types arrive transitively through `@commercetools-backend/loggers`; if `import type { Logger } from 'winston'` cannot be resolved, use `ReturnType<typeof createApplicationLogger>` instead.
- [ ] 6.2 `src/errors/custom.error.ts`: keep the source file (`/Users/behnam/code/cms/service/src/errors/custom.error.ts`, 26 lines) unchanged except the SPDX header. (No `types/express.d.ts` is needed in D: the correlation id travels in an `AsyncLocalStorage`, not on the request; spec E creates `types/express.d.ts` for `req.principal`.)
- [ ] 6.3 Observability layer, created in the exact paths and names that spec H's design (section 7) uses so that H only verifies it. Ownership note: the coordinator assigned the correlation-id and access-log layers to H; D needs them earlier (the error body carries the correlation id and every log line must have it), so D creates the minimal version and H's group 3 becomes "verify and extend". Files:
  * `src/observability/request-context.ts`: `const store = new AsyncLocalStorage<{ correlationId: string }>()`; `export const currentCorrelationId = (): string | undefined => store.getStore()?.correlationId;` and `export const requestContext: RequestHandler = (req, res, next) => { const incoming = req.get('x-correlation-id'); const id = incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming) ? incoming : randomUUID(); res.setHeader('X-Correlation-ID', id); store.run({ correlationId: id }, next); };` (`randomUUID` from `node:crypto`).
  * `src/observability/log-format.ts`: `export const correlationFormat = format((info) => { const id = currentCorrelationId(); if (id) info.correlationId = id; return info; })();` (`import { format } from 'winston'`; `winston` is a transitive dependency of `@commercetools-backend/loggers`: add it to `dependencies` explicitly: `yarn add winston@^3`).
  * `src/observability/access-log.ts`: middleware: `const start = process.hrtime.bigint(); res.on('finish', () => getLogger().info('request', { method: req.method, route: req.route?.path ? req.baseUrl + req.route.path : '<unmatched>', status: res.statusCode, durationMs: Number(process.hrtime.bigint() - start) / 1e6, source: req.get('x-source') ?? 'unknown' })); next();`. The route TEMPLATE (never the raw URL, never the query string) is logged so arbitrary URLs and secrets in query strings cannot become log fields. Never log `req.body`, `req.headers`, `req.query`, `req.params`.
- [ ] 6.4 Unit test `tests/unit/observability.test.ts`: (a) inside `requestContext` the id equals the incoming header when valid, a UUID when absent, and is replaced when invalid (`bad id with spaces`); (b) `correlationFormat` adds `correlationId` to a log info object only inside the context; (c) the access log call receives `route: '<unmatched>'` for a 404 and the template (`/service/health`) for a matched route (use a fake logger by `jest.spyOn(getLogger(), 'info')`).
- [ ] 6.5 `src/middleware/error.middleware.ts` (replaces source file) exporting `notFoundMiddleware` and `errorMiddleware`:

```ts
export const notFoundMiddleware: RequestHandler = (_req, _res, next) => next(new CustomError(404, 'Path not found.'));

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  const dev = process.env.NODE_ENV === 'development';
  const { status, message, errors } = normalize(error);          // see below
  if (status >= 500) getLogger().error('request failed', { status, err: describe(error) });
  else getLogger().warn('request rejected', { status, message });
  res.status(status).json({ message, statusCode: status, correlationId: currentCorrelationId(), ...(errors && { errors }), ...(dev && { stack: error instanceof Error ? error.stack : undefined }) });
};
```
  `normalize(error)` rules (write as a pure function in the same file and unit test it):
  1. `CustomError` -> its own status/message/errors (status coerced with `Number`).
  2. body-parser errors (object with `type === 'entity.parse.failed'`) -> `400 'Invalid JSON body'`; `type === 'entity.too.large'` -> `413 'Payload too large'`; other objects with numeric `status` 400-499 and `expose === true` -> that status and its `message`.
  3. anything else -> `500 'Internal server error'`.
  `describe(error)` returns `{ name, message }` only (no stack, no SDK `originalRequest`, which holds the Authorization header).
  If `res.headersSent` call `next(error)` first line (Express rule).
- [ ] 6.6 Unit tests `tests/unit/error-normalize.test.ts`: table-driven over rules 1-3 incl. an `Error('db password is hunter2')` -> message `Internal server error`.
  Run `yarn jest tests/unit/error-normalize.test.ts` -> all pass.

**Pitfalls.** `winston` `logger.error('msg', obj)` merges `obj` into the JSON line; never pass the raw `Error` of an SDK call (it includes request headers). `res.on('finish')` fires after the error middleware writes, so status is correct.

**Rollback.** Delete the four middleware/util files created.

---

## 7. commercetools client and Custom Objects client

**Context.** All persistence goes through these two modules.

**Pre-conditions.** Groups 5 and 6 done.

- [ ] 7.1 `src/ct/client.ts`:

```ts
import { ClientBuilder } from '@commercetools/ts-client';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import type { ByProjectKeyRequestBuilder } from '@commercetools/platform-sdk';
import { getConfiguration, type Configuration } from '../config/env';

export function buildApiRoot(ctp: Configuration['ctp']): ByProjectKeyRequestBuilder {
  const client = new ClientBuilder()
    .withProjectKey(ctp.projectKey)
    .withClientCredentialsFlow({
      host: ctp.authUrl,
      projectKey: ctp.projectKey,
      credentials: { clientId: ctp.clientId, clientSecret: ctp.clientSecret },
      ...(ctp.scopes.length ? { scopes: ctp.scopes } : {}),
      httpClient: fetch,
    })
    .withHttpMiddleware({
      host: ctp.apiUrl, httpClient: fetch, timeout: 10_000,
      enableRetry: true, retryConfig: { maxRetries: 3, retryCodes: [429, 502, 503, 504], backoff: true },
    })
    .build();
  return createApiBuilderFromCtpClient(client).withProjectKey({ projectKey: ctp.projectKey });
}

let root: ByProjectKeyRequestBuilder | undefined;
export const getApiRoot = () => (root ??= buildApiRoot(getConfiguration().ctp));
export const resetApiRootForTests = () => { root = undefined; };
```
  If the compiler complains that `ByProjectKeyRequestBuilder` is not exported from the package root, use `ReturnType<ReturnType<typeof createApiBuilderFromCtpClient>['withProjectKey']>`. If `httpClient` is rejected in `withClientCredentialsFlow`, drop it there (the experiment in explore used it only in the HTTP middleware); verify with the unit test below.
  Done when: `yarn tsc -p tsconfig.json --noEmit` reports no error for `src/ct/client.ts`.
- [ ] 7.2 `src/ct/errors.ts` with `toCustomError(error: unknown, action: string): CustomError`:
  read `statusCode` (number) from the error object; mapping: 404 -> `CustomError(404, 'Not found')`; 409 -> `409 'Conflict: the object was modified concurrently'`; 429 or >=500 -> `503 'Upstream service unavailable'`; 401/403 -> `502 'Upstream authorization failed'` (log at error level with `action` and the code only); other -> `500 'Internal server error'`. An existing `CustomError` is returned unchanged. Unit test every row.
- [ ] 7.3 `src/utils/predicate.ts`:

```ts
import CustomError from '../errors/custom.error';
const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
export const eq = (field: string, value: string) => `${field} = "${esc(value)}"`;
export const inList = (field: string, values: string[]) => `${field} in (${values.map((v) => `"${esc(v)}"`).join(', ')})`;
export const and = (...p: string[]) => p.join(' and ');
export const or = (...p: string[]) => p.map((x) => `(${x})`).join(' or ');
export const inValue = (inner: string) => `value(${inner})`;
const SAFE_KEY = /^[A-Za-z0-9_.~-]{1,128}$/;
export function assertSafeKey(value: string, name: string): string {
  if (!SAFE_KEY.test(value)) throw new CustomError(400, `Invalid ${name}`);
  return value;
}
```
  Operator spelling: commercetools accepts `and`/`AND` (the source used upper-case `AND`/`OR`); use upper-case in outputs of `and`/`or` to keep parity: `p.join(' AND ')`, `' OR '`. Test: `eq('businessUnitKey','x" OR key = "y')` === `businessUnitKey = "x\" OR key = \"y"` (spec scenario).
- [ ] 7.4 `src/ct/custom-objects.ts`. Interface and behaviour (implement each method with `getApiRoot().customObjects()...`):

```ts
import type { CustomObject } from '@commercetools/platform-sdk';
export interface CustomObjectsClient {
  readonly container: string;
  get(key: string): Promise<CustomObject | null>;
  getOrThrow(key: string): Promise<CustomObject>;                       // 404 -> CustomError(404, `Custom object not found with key: ${key}`)
  create(key: string, value: unknown): Promise<CustomObject>;           // get(); if exists -> CustomError(409,'Already exists'); else put
  put(key: string, value: unknown, version?: number): Promise<CustomObject>;  // POST /custom-objects {container,key,value,version?}
  delete(key: string): Promise<boolean>;                                // await!; 404 -> false
  list(where?: string): Promise<CustomObject[]>;                        // paginate, limit 500, sort ['id asc'], withTotal false, cap 10000
  update<T>(key: string, mutate: (current: T | null) => T, maxAttempts?: number): Promise<CustomObject>;
}
export function customObjects(key: ContainerKey): CustomObjectsClient;
```
  `container` = `containerName(getConfiguration().containerPrefix, key)`. Every SDK call is wrapped: `catch (e) { throw toCustomError(e, 'customObjects.<method>') }`, except `get`/`delete` which treat `statusCode === 404` as `null`/`false` first. `update`: loop `attempt 1..maxAttempts` { `current = await get(key)`; `next = mutate(current?.value ?? null)`; try `put(key, next, current?.version)`; on `CustomError` 409 continue; } then throw `CustomError(409, ...)`. `list`: `where` is passed as given (callers build it with `predicate.ts`); `if (offset >= 10000) { log warn; break }`.
  Done when: compiles.
- [ ] 7.5 Create the stateful fake commercetools for tests: `tests/support/fake-ct.ts`. It exports `startFakeCt(server: SetupServer = setupServer()): { server, store, requests, reset() }` (a test that also needs other fake hosts, e.g. spec E's Merchant Center JWKS, passes ONE shared server so all handlers live together; the test file calls `server.listen(...)`/`server.close()` itself, `startFakeCt` never listens) with handlers (all under `https://api.test.local/test-project` and `https://auth.test.local`):
  * `POST https://auth.test.local/oauth/token` -> `{access_token:'fake', expires_in: 172800, token_type:'Bearer', scope: <echo of form 'scope'>}`; record the form body in `requests`.
  * `GET /custom-objects/:container/:key` -> 200 object or 404 `{statusCode:404,message:'not found',errors:[{code:'ResourceNotFound',message:'not found'}]}`.
  * `POST /custom-objects` body `{container,key,value,version?}`: if exists and `version` given and different -> 409 `{statusCode:409,message:'Object ... has a different version than expected.',errors:[{code:'ConcurrentModification',message:'...',currentVersion: n}]}`; create -> 201 version 1; update -> 200 version+1. `value` fields with `null` are dropped (CT behaviour). Support a test hook `store.failNextWriteWith(409)` to simulate a race.
  * `DELETE /custom-objects/:container/:key` -> 200 deleted object / 404.
  * `GET /custom-objects/:container` with `where`, `limit` (default 20, max 500), `offset`, `sort`, `withTotal`: returns `{limit, offset, count, results}` (and `total` when requested). Implement `where` with a tiny evaluator `matches(obj, where)` supporting: groups with parentheses, `AND`/`OR` (case-insensitive), `field = "text"` where `field` is `key`, `id`, `container` or a `value(...)` wrapped expression (inside `value(...)` fields refer to `obj.value`), and `field in ("a","b")`; unescape `\"` and `\\`. Throw an error (500 with message `fake-ct: unsupported predicate: <where>`) on anything else, so a new predicate shape in F is noticed immediately.
  * `POST /products/search` is added by F.
  Also export a helper `listenQuietly(server)` that calls `server.listen({ onUnhandledRequest(req, print) { if (new URL(req.url).hostname === '127.0.0.1') return; print.error(); } })` (supertest talks to 127.0.0.1; see explore section 4); every test file that uses msw calls it in `beforeAll` and `server.close()` in `afterAll`, `server.resetHandlers()` in `afterEach`.
  Write `tests/unit/fake-ct.test.ts` (6 tests: 404, create 201, update bump, 409, delete, where with `value(a = "x" AND b = "y")`).
  Run: `yarn jest tests/unit/fake-ct.test.ts` -> all pass.
- [ ] 7.6 Tests for the clients: `tests/unit/custom-objects.test.ts` using `startFakeCt()`; call `resetConfigurationForTests()` and `resetApiRootForTests()` in `beforeEach`. Cases (one `it` each): `get` missing -> `null`; `getOrThrow` missing -> rejects status 404; `delete` missing -> `false`; `put` then `get`; `create` twice -> second rejects 409; `list` with 1203 seeded objects returns 1203 and the fake saw 3 list requests with `limit=500`; `update` retry (arm `failNextWriteWith(409)`, expect `mutate` called twice); container prefix (`process.env.CONTAINER_PREFIX='contentools-test-'` before reset -> stored container `contentools-test-puck-page`); token reuse (two sequential calls -> exactly one token request); scope forwarding (token request form `scope` equals the two scopes of `tests/support/env.ts` separated by a space); `toCustomError` on 403 -> 502.
  Run `yarn jest tests/unit/custom-objects.test.ts` -> all green.

**Pitfalls.** The ts-client token cache is per client instance; tests must reset the api root. CT's `where` string must be URL-encoded: the SDK does it, do not encode manually. `sort: ['id asc']` is unverified against the real API until the live check in group 10.

**Rollback.** Delete `src/ct`, `src/utils/predicate.ts`, the two test support/unit files.

---

## 8. App, routes, bootstrap, health

**Context.** Wire everything into an Express app that can be created without listening (so supertest works) and a thin `index.ts` that validates config and listens.

**Pre-conditions.** Groups 5-7 done.

- [ ] 8.1 `src/routes/health.route.ts`:

```ts
import { Router } from 'express';
const handler = (_req: Request, res: Response) =>
  res.status(200).json({ status: 'UP', service: 'contentools-service', timestamp: new Date().toISOString() });
export const healthRouter = Router();
healthRouter.get('/health', handler);
healthRouter.get('/status', handler);
```
  (import `Request, Response` types from express.)
- [ ] 8.2 `src/routes/service.route.ts` (replaces source): `const serviceRouter = Router(); serviceRouter.use(healthRouter); export default serviceRouter;` and a comment-free placeholder: spec E inserts auth here, spec F mounts the content routers after the auth gate, spec G adds media.
- [ ] 8.3 `src/app.ts`:

```ts
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(accessLog);
  // E: app.use(corsMiddleware) goes here, before the body parser
  app.use(express.json({ limit: '2mb' }));
  app.use('/service', serviceRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
```
  No `getConfiguration()` call at import time (so importing `app.ts` never throws).
- [ ] 8.4 `src/index.ts`:

```ts
import { ConfigurationError, readConfiguration } from './config/env';
import { createApp } from './app';
import { getLogger } from './utils/logger.utils';

function main(): void {
  let config;
  try { config = readConfiguration(); } catch (error) {
    // logger needs config for the level: fall back to a plain JSON line
    process.stderr.write(JSON.stringify({ level: 'error', message: error instanceof ConfigurationError ? error.message : 'Configuration failed' }) + '\n');
    process.exit(1);
  }
  const logger = getLogger();
  const server = createApp().listen(config.port, () => logger.info('service listening', { port: config.port, projectKey: config.ctp.projectKey }));
  const shutdown = (signal: string) => {
    logger.info('shutting down', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
main();
```
  `no-console` is satisfied because `process.stderr.write` is used. Logging the project key is fine (it is not secret).
- [ ] 8.5 `tests/support/app.ts`: `export const app = createApp()` factory `makeApp()` that calls `resetConfigurationForTests()` and returns `createApp()`; also a helper `startMsw()` wrapper reused from `fake-ct`.
- [ ] 8.6 `tests/integration/runtime.test.ts` (supertest, no CT needed): cases mapped to the `service-runtime` spec scenarios: unknown path 404 body; `/service/health` and `/service/status` 200 with the exact keys; correlation id echoed (`X-Correlation-ID: abc-123`) and generated (UUID regex); invalid correlation id (`bad id with spaces`) replaced; malformed JSON `POST /service/health` is a GET route so use a temporary route: in the test create `const app = express(); app.use(requestContext, express.json({limit:'2mb'})); app.post('/echo', (_q,r)=>r.json({})); app.use(errorMiddleware)` to assert 400 `Invalid JSON body` and 413 for a 3 MB body; unexpected exception route -> 500 generic and body has no `hunter2`; bodies-never-logged: spy `process.stdout.write` (winston Console transport writes there) and assert captured text lacks `zzz` and `top-secret` after a `PUT /echo`.
  Run: `yarn jest tests/integration/runtime.test.ts` -> all pass.
- [ ] 8.7 `tests/integration/bootstrap.test.ts`: run the compiled bootstrap in a child process: `yarn build`, then `spawnSync('node', ['build/index.js'], { env: { PATH: process.env.PATH }, encoding: 'utf8', timeout: 15000 })` -> status 1 and `stderr` contains `CTP_PROJECT_KEY`, and does not contain `client-secret`. Second case: valid env + `PORT=0`... skip listening test (covered by supertest).
  Run `yarn build && yarn jest tests/integration/bootstrap.test.ts` -> pass.

**Pitfalls.** Do not mount `/service` twice. `express.json()` must be after `requestContext` so parse errors carry a correlation id. Winston JSON logger prints to stdout via `console._stdout`; capture `process.stdout.write`.

**Rollback.** Delete `src/app.ts`, `src/index.ts`, `src/routes/health.route.ts`, tests.

---

## 9. Whole-tree checks

- [ ] 9.1 `cd <root>/service && yarn typecheck && yarn lint && yarn build` -> all exit 0; `ls build` shows `index.js app.js config ct errors middleware routes utils` and NO `_pending`.
- [ ] 9.2 `yarn test` -> all suites pass (expected roughly 6 suites, 40+ tests). No `console` output besides jest.
- [ ] 9.3 Forbidden-word sweep. Run `grep -rniE "firestore|GCP_FIRESTORE|jsonwebtoken|x-project-key|authenticate-project|refresh-jwt|validateProject|requireProjectKey|multitenant|sdk-client-v2|ct-poc|sellertools|cms|demo" src tests package.json .env.example --exclude-dir=_pending`.
  Done when: it prints nothing. Then `grep -rniE "firestore|jwt_secret|x-project-key|requireProjectKey|validateJwt|validateProject" src/_pending | cut -d: -f1 | sort | uniq -c` lists the files F/G will port (expected ~20); save the list into `openspec/changes/d-service-core-single-tenant/explore.md` under a new heading "Pending files still referencing tenant code" (copy the output).
- [ ] 9.4 SPDX check: `grep -L "SPDX-License-Identifier: MIT" $(git ls-files 'src/**/*.ts' 'tests/**/*.ts' 2>/dev/null || find src tests -name "*.ts" -not -path "*/_pending/*")` prints nothing.
- [ ] 9.5 Smoke run: `cp .env.example .env` (fill nothing; it points at the real hosts but nothing is called), `yarn start:dev` in a second terminal, then `curl -s -i localhost:8080/service/health` -> `HTTP/1.1 200`, header `X-Correlation-ID: <uuid>`, body `{"status":"UP","service":"contentools-service","timestamp":"..."}`; `curl -s -i localhost:8080/service/authenticate-project -X POST` -> `404`. Stop the dev server; `rm .env`.
- [ ] 9.6 Live sandbox check (only if `.env.e2e` exists, manual step M-01; otherwise record "skipped, no sandbox" in the notes): with `CONTAINER_PREFIX=contentools-test-` create a one-off script in the scratchpad (outside the repo) that calls `customObjects('puckPage').put('d-smoke', {a:1})`, `.list()` with `sort: id asc`, `.update(...)`, `.delete('d-smoke')`; expected: all succeed, no 400 on `sort`. If CT rejects `sort`, remove the `sort` parameter from `list` and re-run 7.6 (update the design note D4).

**Pitfalls.** `git ls-files` only works if `<root>` is a git repo; the `||` fallback handles scratch trees.

---

## 10. Rollback / recovery (whole change)

Restore the backup from 1.2 and delete the change's new files (`git clean -fd service` in a scratch repo). No data is migrated: existing custom objects in any project keep working with the new service because container names and value shapes are unchanged.

---

## 11. Definition of Done (mapped to spec scenarios)

| Spec requirement / scenario | Verified by |
| --- | --- |
| Removed endpoints do not exist | 9.5 curl 404; `tests/integration/runtime.test.ts` unknown path |
| No tenant code remains | 9.3 grep prints nothing (outside `_pending/`) |
| Unported routes parked, build green | 9.1 (`build` has no `_pending`) |
| Env: all valid / several invalid / secret never echoed | 5.4 tests |
| Process refuses to start on bad configuration | 8.7 |
| Client reused / scopes from generated client | 7.6 (token reuse, scope forwarding) |
| Custom objects: missing, idempotent delete, complete list, retry, prefix | 7.6 |
| Safe predicates | 7.3 unit test (injection string) |
| Router at `/service`, 404 body, graceful shutdown | 8.6; shutdown: manual `kill -TERM` of the 9.5 server prints `shutting down` and exits 0 |
| Liveness endpoints | 8.6 |
| Correlation id, bodies never logged | 8.6 |
| Uniform error contract (400/413/500/502) | 6.6, 7.6 (`toCustomError`), 8.6 |

Additionally: `yarn typecheck && yarn lint && yarn test && yarn build` all green in `service/`; `questions.md` and `manual.md` read by the coordinator.
