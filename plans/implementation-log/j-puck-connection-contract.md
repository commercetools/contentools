# Implementation log: j-puck-connection-contract

Branch: worktree branch `worktree-agent-a5bb2ce3046412905`, started from `develop` b081105 (spec I merged). Tasks: 48 of 58 ticked; 10 marked `[~]` (group 10, browser checks, and 11.4, see below). Everything service related ran against the dependency-free mock server; real-service variants are deferred (see "Deferred").

## Done
- puck-types: `connection.types.ts` (`PuckConnection`, `PuckFetcher`, `PuckRequest`, `PuckResponse`, auth header types); media types follow spec G (`MediaUploadResult`, cursor `MediaLibraryPagination`, optional `key`/`contentType`/`createdAt`).
- puck-api: `client/` (`createPuckClient`, `updatePuckClient` (internal), `fetcherFromFetch`, `PuckHttpError`/`PuckAuthError` with parsed `serverMessage`/`code`/`correlationId`, `PUCK_AUTH_POLICY` for the 35 functions, `enc`). One `fetch(` call in all packages; the three duplicated header builders are gone. All 35 raw functions take `(client, ...args)`; `http-client.ts` deleted.
- Context/provider: `usePuckApiContextOptional`, `usePuckClient`, stable client identity, token rotation without remount, nested provider reuses the ancestor client when the connection is shallow-equal.
- Hooks migrated (no `projectKey`/`jwtToken` guards; `saveDraft` fails fast with `PuckAuthError`); `useDatasource` works without a provider, idle without auth unless `publicDatasourceResolve`, de-duplicated per client; `useMediaLibrary` has the cursor stack and `notConfigured` (HTTP 501).
- Components: `PuckEditor`, `PageManager`, `ContentManager`(+List/Router/Editor), `ThemeManager`, `ImportContentTypes`, `ImagePickerProvider` all take `PuckConnection`. Image picker depends on puck-api now (own HTTP code and context deleted). Both `ImagePickerField` copies: Previous/Next only, "media not configured" message, upload hidden (keys `ImagePicker.mediaNotConfigured` and `Editor.mediaNotConfigured`).
- Renderer: `loadPuckData` (React-free, exported), `PuckRenderer` public-read mode (no provider needed; preview without auth shows "Preview requires authentication" and sends nothing; error text instead of a throw).
- Playground: `.env.example`, `App.tsx` with `VITE_AUTH_MODE` token/fetcher/none; `playground/mock-server/{index,server}.mjs` (`yarn workspace @commercetools-labs/puck-playground mock`).
- German: machine-translated `de.json` in the six catalog packages (`scripts/translate-messages.mjs --locale de`), `Lang` unions and catalogs wired.
- Docs: `puck/README.md` (Authentication section, SSR, SemVer), `puck/docs/migration-1.0.md`, `docs/api-contracts.json` (descriptions + `auth` field on all 13 entries), `puck-api` and `puck-renderer` README "Connect" examples.
- Tests: 118 pass (was 19): client (14), policy (2 + snapshot), 37 path rows, provider (4), hooks (14), no-tenant guard (2), renderer (11), page manager (4 incl. German + compile-time `projectKey` rejection), image picker (3), mock server contract (8, includes all 35 client functions end to end).
- `tools/forbidden-pending.txt`: removed the four `# J` entries (files are clean now).

## Deviations
1. Raw API function `deletePuck*Api`/`deletePuckTemplateApi` still resolve `void` (the client returns `undefined` on 204); `queryPuck*Api` pass `mode` through to the client so the function-valued policy can decide.
2. `PuckConnection` gained `publicDatasourceResolve` (design D-3) and `PuckClient` exposes `locale` and `publicDatasourceResolve` getters.
3. `puck-image-picker/src/hooks/useMediaLibrary.ts` and `src/types.ts` were deleted instead of kept as re-exports; `index.ts` re-exports `useMediaLibrary`, `UseMediaLibraryReturn` and the media types from puck-api/puck-types, so the public symbols stay. `ImagePickerProviderProps` no longer declares its own `locale` (comes from `PuckConnection`).
4. The editor's copy of the image picker uses the `Editor.*` message namespace (catalog lives in puck-components), so its new key is `Editor.mediaNotConfigured`, not `ImagePicker.mediaNotConfigured`. `ImagePicker.pageIndicator` was removed from en/es.
5. Test helpers (`createFakeFetcher`, `fakeResponse`) live in `puck-api/src/client/fake-fetcher.ts` and are not exported; `puck-renderer/src/test-fetcher.ts` is a small duplicate, because package `tsc` has `rootDir: src` and there is no shared test package.
6. Task 8.3 `PageManager.save.test.tsx` (full save through the editor in jsdom) not written: Puck needs layout APIs. The save path is covered by `usePuckPage` hook tests (debounce, auth header, no-auth rejection) plus the mock contract tests; the full-UI proof is the Chrome script (not run). Recorded here instead of design.md D-12.
7. The mock server tests run in a second vitest project (`playground/mock-server`, Node environment) because jsdom's `FormData`/`File` do not work with Node's `fetch`; root `vitest.config.ts` now uses `projects`.
8. Root `vitest.setup.ts` now calls Testing Library `cleanup()` after each test (vitest `globals` are off at the root, so it never auto-cleaned). This exposed one smoke test (`ProductTeaser`) that only passed thanks to DOM leaked from a previous test; it now asserts on the product image alt text. `testTimeout` raised to 30 s because `publish-packages.test.mjs` (packs ten packages) timed out at 5 s when files run in parallel.
9. Test files contain no `x-project-key`/`projectKey` literals except `PageManager.test.tsx` (the `@ts-expect-error` proof) and `no-tenant.test.ts`; the second spells the names in pieces. Both are the allow list of the guard test. The migration doc contains `projectKey` but never the retired header name (the repository guard forbids it).
10. Machine-translated German has rough spots (a few terms fixed by hand: "Slug", "Kein Status"); the `ImagePicker/Editor.mediaNotConfigured` strings are the ones from the task text. READMEs say the Spanish and German catalogs are machine translated.

## Questions for the owner
- Q-J-A: the German catalogs are machine translated and unreviewed. Recommended default: ship as is (flagged in the README) and have a native speaker review before 1.0.0.
- Q-J3 (multipart through the Merchant Center proxy) and Q-J4 (`'use client'`) stay on their defaults: `fetcher` receives `FormData` as is, no `'use client'` directives.

## MISSED / UNPORTED
- No test for the editor-embedded `ImagePickerField` copy (needs the editor intl catalog; the picker package copy is tested and the two share the same logic).
- Version-history and other packages that have no connection props needed no change.

## TODO for others
- K (admin-app): build the forward-to `fetcher` per `puck/README.md` (Authentication) and the D-7 snippet; pass no `jwtToken`/`getAuthHeaders`. `PuckAuthError.authCode` and `serverMessage` are there for error UI. Add `de` is already done on the puck side.
- E/F: policy table is `puck/packages/puck-api/src/client/auth-policy.ts` (public: published page/content reads, published queries, theme read; `attach`: datasource resolve; everything else protected). The client sends only `x-source`, `Content-Type` (JSON bodies) and whatever the auth source adds. A route-inventory test against the real service is deferred until F merges.
- Merge note: `develop` moved on (D, E, G merged) after this branch started; `tools/forbidden-pending.txt` and `tools/verify/*.md` changed there, so expect a trivial conflict or none. At this branch's base, `yarn check:forbidden` reports the `tools/verify/*.md` mentions and one stale pending entry; both are fixed on develop.

## Deferred (real service, spec D/E/F/G)
- Running the playground and the Chrome script against the real service (`SERVICE_API_TOKEN`): not run, the real service routes (F) are not merged. The Chrome script and the client contract are identical to the mock run.
- Contract test of `PUCK_AUTH_POLICY` against the real service route table and the real error envelope/`code` values: deferred until F.
- Real Merchant Center forward-to check of the `fetcher` adapter, multipart upload through the proxy (Q-J3): spec K/Q.
- Live media (GCS) against the picker: spec G/Q; the picker is tested against the mock contract only.

## Verification (all from `puck/` unless noted)
- `corepack yarn verify`: exit 0 (headers OK, 10 packages OK, build 10 packages + playground, typecheck, `check:consumer` 3 configs, lint 0 problems, tests 118 passed in 15 files).
- `node -e "require('./packages/puck-api/dist/index.js')"` exposes `createPuckClient` (`function`); `grep -c projectKey packages/puck-api/dist/index.js` is 0.
- Absence greps (task 11.1): no `projectKey`/`x-project-key`/`PROJECT_KEY` outside the migration doc and the two allowed test files; the only `fetch(` outside `client/client.ts` is the playground `proxyLikeFetcher`.
- Mock curl checks (port 8081): `GET /service/health` returns `{"status":"ok"}`; anonymous `PUT .../puck-pages/home` 401; with `Authorization: Bearer dev-token` 200; the anonymous published read returns JSON with `"key":"home"`; media page 1 has 4 files.
- Repo root: `yarn check:spdx` OK (431 files); `yarn test:tools` all pass; `yarn check:forbidden` reports only the `tools/verify/*.md` and stale-pending items that already exist at this branch's base.

## Not run
- Group 10 (Chrome DevTools playbook 10.1 to 10.8, 10.7b): not run: connector detached. No screenshots under `plans/evidence/j/`.
- `openspec validate` not run.
