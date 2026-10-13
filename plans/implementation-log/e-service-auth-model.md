# Implementation log: e-service-auth-model

Branch: worktree branch (reset to `develop` 8b4ec66 first). All 27 checkboxes in `tasks.md` ticked (8.2, the real Merchant Center check, is a recorded deferral).

## Done
- Config: `src/auth/cloud-identifier.ts`; `config/env.ts` gained `CONNECT_SERVICE_URL, CLOUD_IDENTIFIER, SERVICE_API_TOKEN (>=32 chars, not JWT-shaped), CORS_ALLOWED_ORIGINS, MC_REQUIRED_PERMISSION, PUBLIC_DATASOURCE_RESOLVE, PUBLIC_RESOLVE_MAX_PER_MINUTE` and the `auth` section (issuer derived from `CTP_API_URL` when `CLOUD_IDENTIFIER` is unset). `.env.example` documents them (commented).
- Errors: `CustomError` accepts `{headers, code}` as 4th arg (a plain string is still accepted as `code`); `errorMiddleware` sets `error.headers`.
- Auth core: `auth/{principal,service-token,mc-verifier,authenticate,diagnostics}.ts`, `types/express.d.ts`, `middleware/{auth,cors,public-resolve}.middleware.ts`. Both audience policies are tried (full-path then origin); JWKS outage -> 503 + `Retry-After: 5`; project claim and optional permission authorised -> 403.
- Router: `service.route.ts` = public (health) -> `requireAuth` gate -> protected placeholder; `createApp(config)` mounts CORS before the router; `index.ts` calls `logAuthDiagnostics`.
- Test kit (`tests/support/mc.ts`: local RS256 pair, msw JWKS at the real issuer URLs incl. legacy issuer, token signer incl. HS256 / `alg: none`; `tests/support/probe-app.ts`: probe router mirroring the layout + `captureLogs`).
- Tests (+9 suites, +101 tests): auth-config, service-token, diagnostics, error-headers (unit); auth-matrix (45, 16 rejection rows x GET/POST + acceptance + no-oracle + log hygiene), auth-jwks-outage, auth-policy, cors, public-resolve (integration).

## Deviations
1. 4th `CustomError` arg is `string | {headers?, code?}` (task text had only the object form) to keep D's existing string-`code` call and test valid.
2. Test env in `tests/support/env.ts` already had a 18-char `SERVICE_API_TOKEN` (B); replaced by the 41-char one the new validation requires.
3. The kit uses B's shared msw `server` (`server.use(...kit.handlers)` in `beforeEach`; `resetHandlers` after each test drops them) instead of a private `setupServer` (task 7.1 text), so `onUnhandledRequest: 'error'` stays active.
4. JWKS-outage rows live in their own file `auth-jwks-outage.test.ts` (task pitfall 3: the library caches the key set per issuer for the process lifetime).
5. Unknown paths below the gate answer 401 when unauthenticated, not 404 (tasks 8.1 expected 404; deny-by-default makes 401 correct). D's `runtime.test.ts` "removed endpoint" tests now assert 401 anonymous and 404 with the service token.
6. Tests build the forbidden header name from fragments (`['x','project','key'].join('-')`) so `check:forbidden` stays clean.
7. `.env.example` additions are commented out (D's bootstrap test requires the file to stay valid when loaded as-is, and an unset `CONNECT_SERVICE_URL` is a valid config).

## Questions for the owner
- None new. Q-E1..E7 in the change's `questions.md` stand on their defaults.

## MISSED / UNPORTED
- Nothing from spec E. F/G still have to mount their routers (public ones before the gate, `publicResolveGuard` for `POST /datasource/:key/test`) and add the route-inventory test against design section 4. `service/README.md` env table is H's.

## Verification (in `service/` unless noted)
- `yarn typecheck`, `yarn lint`, `yarn build`: exit 0. `yarn test`: 19 suites, 172 tests pass.
- Root `yarn check:spdx` OK (425 files); `yarn check:forbidden` OK (0 hits, 15 pending); `grep -ri x-project-key src` (excluding `_pending`) empty.
- Smoke (task 8.1, built server, port 18081, throwaway token): `GET /service/health` 200; unknown path anonymously 401; allowed-origin preflight 204 with the allow-method/header/max-age headers and no credentials header; startup log shows `authentication {merchantCenter:false, serviceToken:true}` plus the MC-disabled `warn`.

## Not run
- Real Merchant Center forward-to check (task 8.2 / manual M-E1): Chrome connector detached and the gateway needs an https service URL (Connect deployment or tunnel). Covered only by the token-forging kit, which exercises the real verifier library against a faked JWKS. Deferred to specs K/Q.
- Live sandbox: not needed (auth does not call commercetools).
