## Context

Specs D-Q need to prove behaviour without the owner. The service talks to commercetools only through the SDK (custom objects, token,
product search; see explore.md section 2), so one in-memory fake of those few endpoints covers unit, integration and (via a standalone
server) browser runs. Real-API e2e must be possible but impossible to point at a non-sandbox project by accident. No CI service
exists (owner decision): everything here runs locally via root `yarn` scripts and, for Connect, `commercetools connect application test`.

## Goals / Non-Goals

**Goals**: offline default test runs; one fake CT used three ways; guarded live e2e; scripted browser verification; shared helpers for the Connect test checklist.
**Non-Goals**: writing the feature tests of D-Q (they add tests with their code); Merchant Center login automation; load/perf tests; coverage thresholds.

## Decisions

1. **Per-app stack (and why)**
   | App | Runner | HTTP/DOM | Mocking |
   | --- | --- | --- | --- |
   | service | jest 29 + ts-jest (already there; Connect template default) | supertest 7 | msw 2 (node) |
   | admin-app | jest 29.7 + `@commercetools-frontend/jest-preset-mc-app` | Testing Library + MC `renderApp` | msw **0.49.x** (already pinned; preset-era `rest` API) |
   | puck packages | vitest 3 + jsdom | Testing Library 16 + user-event 14 | msw 2 |
   | mcp | vitest 3 (ESM package, `type: module`) | n/a | msw 2 |
   Alternative rejected: jest everywhere. puck/mcp are ESM + tsup + Vite; jest ESM/TS setup there costs more than vitest.
2. **One fake CT, written once in TypeScript with erasable syntax only** (`service/tests/support/fake-ct-store.ts`: no enums, no parameter properties, no relative imports). jest imports it normally; `tools/fake-ct/server.mjs` imports it with Node 22's built-in type stripping (`node --experimental-strip-types`; default-on from 22.18). Alternative rejected: duplicating the store in JS (drift).
3. **Fake CT answers loudly on the unknown.** Unsupported `where` syntax -> 400 `InvalidInput` naming the clause, never "return everything". Supported: `id="x"`, `key="x"`, `key in ("a","b")`, `value(<field> = "v" [AND ...])`, `value(<field> in ("a","b"))`, joined by `and`. These are exactly the forms found in `service/src/controllers/*` (explore.md).
4. **msw `onUnhandledRequest: 'error'` everywhere** (Connect skill checklist) so an unmocked call fails the test.
5. **Env before import.** `service/tests/support/env.ts` is a jest `setupFiles` entry (runs before test files import the app; constants are read at import time).
6. **Live e2e is in-process, not against a deployed URL.** Same code path as supertest tests, but `CTP_API_URL`/`CTP_AUTH_URL` unset so the real hosts of `E2E_CTP_REGION` are used. A guard variable `E2E_ALLOW_PROJECT_KEY` must be typed twice (once as the key, once as allow-list) so it cannot be satisfied by accident, plus container prefix `contentools-test-<runId>-` so even a wrong run only creates namespaced objects.
7. **Browser verification without a sandbox uses the fake-CT server**: stack = fake CT (8099) + service (8080, `CTP_*` pointing at fake) + playground (5174). MC checks stay owner-assisted (manual M-04).
8. **Playbooks are markdown with exact tool calls**, not executable code, because the Chrome connector is an agent tool, not a library. Evidence under `plans/evidence/<spec>/<step>.png`, git-ignored (root `.gitignore`, A).

## Risks / Trade-offs

- [Fake drifts from real CT] -> the live sandbox e2e (service) is the contract check; keep the fake minimal and loud.
- [`CTP_API_URL`/`CTP_AUTH_URL` not read by D's config] -> Q-B1 (settled): Connect injects both and D reads them from env. B's tests fail until then, which is the signal.
- [Container env names change in D/F] -> `e2e/support/containers.ts` is the single list to update.
- [msw 2 + jest 29 fetch interception] -> works on Node 22 with `testEnvironment: 'node'`; if `Response is not defined` appears, the jest environment is wrong (task 2.3 pitfall).

## Migration Plan

Additive. Rollback: delete the added `tests/`, `e2e/support/`, `tools/fake-ct`, `tools/verify`, and revert `package.json` scripts/devDependencies.

## Open Questions

Q-B1 (URLs from env), Q-B2 (vitest for puck/mcp) in `questions.md`.
