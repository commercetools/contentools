## Context

The service must become a Connect `service` application bound to one commercetools project. Facts and evidence are in `explore.md`.
Specs C (legacy removal) is archived before this change; E (auth) and F/G (content, media) build on the core defined here.

## Goals / Non-Goals

* Goals: one project, one client, one env contract, one error contract, predictable logs, compile-green and test-green tree at the end of D.
* Non-goals: authentication (E), porting content routes (F), media (G), `connect.yaml` and lifecycle scripts (H). No `postDeploy` is needed
  by the service (custom objects need no registration), see H.

## Decisions

### D1. Target layout of `service/` after this change (files marked `E`, `F`, `G` are created by those specs)

```
service/
├── package.json  tsconfig.json  tsconfig.build.json  jest.config.cjs  .eslintrc.cjs  .prettierrc  .nvmrc  .env.example  .gitignore
├── src/
│   ├── index.ts                      # load config, build app, listen, graceful shutdown
│   ├── app.ts                        # createApp(config): express app (no listen) -> supertest-able
│   ├── config/
│   │   ├── env.ts                    # zod schema, readConfiguration(env), getConfiguration(), ConfigurationError
│   │   └── containers.ts             # CONTAINER_NAMES, containerName(config, key)
│   ├── ct/
│   │   ├── client.ts                 # buildApiRoot(config.ctp), getApiRoot()
│   │   ├── custom-objects.ts         # customObjects(containerKey): CustomObjectsClient
│   │   └── errors.ts                 # toCustomError(err) - maps SDK errors to CustomError
│   ├── errors/custom.error.ts        # CustomError (kept from source, unchanged shape)
│   ├── middleware/
│   │   ├── error.middleware.ts       # errorMiddleware + notFoundMiddleware
│   │   ├── auth.middleware.ts        # E
│   │   └── cors.middleware.ts        # E
│   ├── routes/
│   │   ├── service.route.ts          # composes health + (E auth) + (F routers)
│   │   ├── health.route.ts
│   │   └── …                         # F / G
│   ├── utils/
│   │   ├── logger.utils.ts           # createApplicationLogger({json:true,level})
│   │   └── predicate.ts              # eq(), and(), or(), inList(), assertSafeKey()
│   ├── observability/                # request-context.ts (AsyncLocalStorage correlation id), log-format.ts, access-log.ts  (names shared with spec H)
│   └── _pending/                     # F/G files not ported yet (excluded from tsc and jest); empty + removed by end of G
└── tests/
    ├── support/{env.ts,app.ts,fake-ct.ts}   # D;  mc.ts is E's
    ├── unit/*.test.ts
    └── integration/*.test.ts
```

### D2. One module for configuration, zod for validation
Alternatives: keep the `validator`-based helpers (never wired, `@ts-nocheck`, 149 lines) - rejected; hand-rolled `if` chains - rejected
(poor error aggregation). zod 4 gives typed output + all issues at once (`error.issues`). `readConfiguration(env = process.env)` is a pure function
(tests pass literal objects); `getConfiguration()` caches the first result. E extends the schema with an `auth` section, so the schema is composed from
section objects (`ctpSchema`, `runtimeSchema`, `contentSchema`) in one `z.object({...})`; the exported `Configuration` type is the
inferred output.

Environment keys owned by this change (documented for H's README table; none is a secret except `CTP_CLIENT_SECRET`, which Connect injects):

| Key | Source | Required | Default | Notes |
| --- | --- | :-: | --- | --- |
| `CTP_API_URL` | Connect-injected | yes | - | https URL, trailing slash stripped |
| `CTP_AUTH_URL` | Connect-injected | yes | - | https URL |
| `CTP_PROJECT_KEY` | Connect-injected | yes | - | the single tenant |
| `CTP_CLIENT_ID` / `CTP_CLIENT_SECRET` | Connect-injected | yes | - | secret is never logged |
| `CTP_SCOPE` | Connect-injected | no | - | space separated; empty = let CT grant all client scopes |
| `PORT` | platform | no | `8080` | |
| `LOG_LEVEL` | standardConfiguration | no | `info` | `error|warn|info|debug` |
| `MAX_VERSIONS` | standardConfiguration | no | `5` | integer 1..100; F uses it for pruning |
| `CONTAINER_PREFIX` | standardConfiguration | no | `""` | lets tests/e2e isolate data (`contentools-test-`) |

Deviation from the brief: the brief lists `CTP_REGION`; Connect does not inject it when `inheritAs.apiClient` is used, it injects
`CTP_API_URL`/`CTP_AUTH_URL`, which are also what the SDK needs. Nothing in the service needs the region name. (E needs the Merchant Center
cloud identifier and derives it from `CTP_API_URL`; see E.) Recorded in `questions.md` Q-D1.

Deviation from the source: container names and configuration keys are no longer individually overridable through ~20 env vars
(`PUCK_PAGE_CONTAINER`, ...). They are fixed constants (identical defaults, so data written by the old service remains readable) plus
the single `CONTAINER_PREFIX`. Rationale: every env key becomes part of the Connect install contract (`connect.yaml` + README); a
prefix covers the only real use (test isolation).

### D3. Client: singleton, SDK v4/v8, retry and timeout
Source built a new client (and therefore fetched a new OAuth token) on **every request**. New `ct/client.ts` exports
`buildApiRoot(ctp)` (pure, testable) and `getApiRoot()` (memoised). `ts-client` caches and refreshes the token itself.
`httpClient: fetch` is passed explicitly so msw can intercept in tests. Retry: `enableRetry: true`,
`retryConfig: { maxRetries: 3, retryCodes: [429, 502, 503, 504], backoff: true }`; `timeout: 10_000`.
Scopes: `CTP_SCOPE.split(/\s+/).filter(Boolean)`, omitted when empty.
Alternative considered: `@commercetools/ts-client` `withConcurrentModificationMiddleware` for 409 - rejected: it blindly re-sends the
old payload; we need a re-read inside `update()` because the payload is derived from the current value.

### D4. `CustomObjectsClient` instead of `CustomObjectController`
The old class was constructed per request with `req`. The new one is a thin typed function `customObjects(key: ContainerKey)`
returning an object (see spec for the method list). Why each method exists:
* `get`/`getOrThrow`: F's controllers catch 404 in ~14 places (`statusCode === 404`); `get -> null` removes the try/catch noise.
* `create`: used for `datasource` create (source returned 400 "already exists"; new: 409). Implemented as `get` then `put` because the
  documented API guarantees (see OAS) cover only "version must match"; creating with `version: 0` is not documented, so it is not relied upon.
* `list`: paginates with `limit=500&offset=n&sort=id asc&withTotal=false` until a short page; cap 10000 (CT offset limit); logs `warn` at cap.
  (e2e task F-live verifies `sort=id asc` is accepted.)
* `update(key, mutate, {maxAttempts: 3})`: `get` -> `mutate(current|null)` -> `POST` with `version: current.version` (omitted when creating).
  On HTTP 409 re-read and retry; after 3 attempts throw `CustomError(409)`. This makes state and version-history writes safe under
  concurrent editors (F uses it).
* `delete` returns boolean and fixes the missing-`await` bug.

All SDK errors pass through `ct/errors.ts#toCustomError`, the only place that knows about SDK error shapes (`error.statusCode`).

### D5. Error contract and HTTP runtime
Body: `{ message, statusCode, correlationId, errors? }` (source was `{message, errors, stack}`); `statusCode` and `correlationId` added so
clients and support can quote them. 5xx text is always generic. Mapping table is in the spec. `express.json({ limit: '2mb' })` replaces
`body-parser` (built into Express 4.16+); the urlencoded parser is dropped (no form endpoints; media upload uses multer in G).
Alternatives: keep 100 kb default - rejected, a Puck page with many blocks exceeds it.

### D6. Logging
`createApplicationLogger({ json: true, level, formatters: [correlationFormat] })` from `@commercetools-backend/loggers`. The correlation id lives in an
`AsyncLocalStorage` filled by `requestContext`; a winston format adds it to every line, so any code logs through the plain `getLogger()` and the id is still there
(no `req.log` plumbing). The access logger writes one line per request on `res.on('finish')` with the route template (never the raw URL). `console.log` is banned by
ESLint (`no-console: error`, kept from source). Redaction by omission: bodies, headers, query strings are never passed to the logger.
Ownership: the coordinator assigned correlation id and access log to spec H; D needs them for its own acceptance criteria, so D creates them in the paths and names of H's
design (section 7) and H verifies/extends (see questions.md Q-D5).

### D7. Keeping the tree green: `_pending/`
D deletes tenant code but F/G files still `import` it (every route uses `validateJwt`, `requireProjectKey`, `AuthenticatedRequest`, ...).
Rather than patch ~25 files twice, D moves these files (still unmodified) to `service/src/_pending/` preserving sub-folders:
`routes/{puck-page,puck-content,puck-template,configuration,datasource,product,content-type,file}.route.ts`,
`controllers/{puck-page,puck-content,puck-template,configuration,product,content-state-controller,content-version-controller,datasource-resolution.route,content-type-import,file-controller}.ts`,
`controllers/file-controllers/*`, `services/products.ts`, `samples/**`, `utils/secure-transpiler.ts`. `tsconfig.json` `exclude`s the folder and jest ignores it.
F/G tasks start with `mv` back to the real path and port. Alternative (delete and recreate from the source repo): rejected, loses the
reviewable diff "what changed in the port".
`controllers/custom-object.controller.ts`, `routes/content-type.route.ts` legacy CRUD parts etc. that spec C already removed are not touched.

### D8. Tooling
`service` is a self-contained Connect app (own `package.json`, own `yarn.lock`; **no workspaces**). Package manager: **Yarn 1 classic** (owner decision, final; Connect's build detects the committed `yarn.lock` and runs `yarn install --frozen-lockfile`; keep the script names `build`, `test`, `start`); the stale `yarn.lock` copied from the source is deleted and regenerated by the first `yarn install`, then committed; no `package-lock.json`. Node 22
(`.nvmrc`, `engines`). Scripts: `build` (`rimraf build && tsc -p tsconfig.build.json`), `gcp-build` (alias kept because Connect's Node buildpack
runs it), `start` (`node build/index.js`), `start:dev` (`tsc -p tsconfig.build.json --watch` + `node --env-file=.env --watch build/index.js` via
`concurrently`), `lint`, `typecheck`, `test`, `test:watch`. `dotenv` removed in favour of `node --env-file`.

## Risks / Trade-offs

* `_pending/` can be forgotten: G's Definition of Done and the local `yarn verify` / `yarn gate` scripts (spec O) check `test ! -d service/src/_pending`.
* Express 4 chosen for compatibility with `@commercetools-backend/express`; Express 5 migration deferred.
* Retry on 429/5xx may lengthen requests up to ~10 s x 4; acceptable for an editor API, documented in README by H.
* `list()` is O(n) requests for big containers; F reduces its use (states are fetched per BU, not per page).
* ts-client 4 / platform-sdk 8 are one major behind the npm registry's `latest`; locked by the Connect checklist.

## Migration Plan

1. Preflight: confirm C archived; 2. move pending files; 3. delete tenant files; 4. add new modules + tests; 5. verify. Rollback: restore from the
backup copy taken in task 1.2 (`service-d-backup/`, outside the repo) or `git checkout` of the scratch repo; no data migration (custom
objects keep their names and shape, so a project already used by the old service works unchanged after deployment).
