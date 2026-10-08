# Implementation log: g-service-media-storage

Branch: worktree branch (reset to `develop` 43e5d00 first). 26 of 30 checkboxes ticked; 6.1-6.4 (live check) not ticked (see Deferred).

## Done
- `service/src/media/`: `types`, `errors` (`MediaError` extends `CustomError` with `code`), `keys`, `mime` (magic-byte sniffing), `cursor`, `config` (`loadMediaConfig`, pure, key names only in errors), `public-url`, `concurrency` (`mapLimit`), `provider-factory` (lazy SDK imports), `providers/{aws,gcp,cloudinary}.provider.ts`, `media.service`, `runtime` (memoized lazy provider), `index` barrel.
- `service/src/routes/media.route.ts`: `POST /:businessUnitKey/upload-file` and `GET /:businessUnitKey/media-library` (multer memory storage with limits, MIME allowlist, error mapping). Mounted in `service.route.ts` behind the E gate via a lazy router; `index.ts` validates `MEDIA_*` at startup (`MediaConfigError: ...` and exit 1).
- Parked media files (`_pending/routes/file.route.ts`, `controllers/file-controller.ts`, `controllers/file-controllers/*`) deleted with `git rm`; no other `_pending` file touched. Removed the `file.route.ts` line from `tools/forbidden-pending.txt`.
- Tests: `tests/media/` 11 suites, 99 tests (keys, mime, cursor, config, three provider suites sharing one contract, service, route via supertest, runtime laziness, secret hygiene); jest `testMatch` extended to `tests/media`. Media coverage 94.7% statements / 96.7% lines.
- `.env.example`: 15 `MEDIA_*` keys. `e2e/media/media.e2e.ts` + `yarn test:e2e:media` (skipped unless `E2E_MEDIA_PROVIDER` is set). `e2e/README.md` documents emulator use and the "unverified live" lines.
- Deps: `@aws-sdk/client-s3`, `@google-cloud/storage`, `cloudinary`, `multer@^2.2.0` (resolved 2.4.0); dev `aws-sdk-client-mock`, `@types/multer`. `yarn audit --groups dependencies --level high`: 0 vulnerabilities.

## Deviations
1. `package.json` `resolutions` for `@types/express` (`^4.17.21`) and `@types/express-serve-static-core` (`^4.19.6`): `@types/multer` pulled in Express 5 types and broke `upload.single` typing.
2. No `e2e/media/docker-compose.yml`: Q-17 forbids compose files and Dockerfiles in the repo. The README gives `docker run` commands for fake-gcs-server instead (task 6.1 not done as written).
3. `service.route.ts` builds the media router lazily on first request (`lazyMediaRouter`) so importing the app never reads media config; startup validation is in `index.ts`.
4. The media router uses `authenticated` = skip when `req.principal` is already set, else `requireAuth`. Mounted behind the gate it authenticates once; standalone (tests) it is still self-protecting.
5. Route tests authenticate with the service token (`SERVICE_API_TOKEN` from `tests/support/env.ts`) instead of a stub, so they exercise the real `requireAuth`.
6. `parseAllowedMimeTypes` throws a plain `Error` and `loadMediaConfig` rewrites it as a message naming the key (so a bad entry is never echoed).
7. Cloudinary listing sets `isImage` false only for `pdf` format; list/upload `key` is `public_id.format`.
8. Prettier was run over `src`/`tests`; unrelated files it touched were reverted so the diff only has this change.

## Questions for the owner
- None new (Q-G* in the change's `questions.md` stand). Recommended: keep GCS as the only live-verified provider.

## MISSED / UNPORTED
- No DELETE route (non-goal). No migration of old `<projectKey>/<bu>/...` objects (non-goal).
- `service/README.md` media section and `connect.yaml` keys are spec H's. Hand-off for H: the 15 `MEDIA_*` keys in `design.md` decision 2 (the key set matches `h-service-connect-app/design.md`); `postDeploy` imports `loadMediaConfig`/`createStorageProvider` from `service/src/media`.
- Hand-off for J: `MediaLibraryResult` becomes `{ files, pagination: { limit, nextCursor, hasMore } }` (cursor, no page numbers); upload response is `{ url, key, name, size, contentType }`; drop `projectKey`. Hand-off for M: `get_media_library` takes `cursor` (not `page`); remove the `compile_upload` tool.
- `_pending` folder: still holds F's files; the coordinator removes the folder and its `tsconfig`/jest exclusions when F merges.

## Verification (in `service/` unless noted)
- `yarn typecheck`, `yarn lint`, `yarn build`: exit 0. `yarn jest`: 30 suites, 271 tests pass. `yarn install --frozen-lockfile`: OK.
- Root: `yarn check:forbidden` OK (0 hits, 14 pending); `yarn check:spdx` OK (451 files).
- Sweep for cms / x-project-key / projectKey / old file names in `src/media`, `routes/media.route.ts`, `tests/media`, `e2e/media`: empty.
- Startup smoke (built server): `MEDIA_STORAGE_PROVIDER=gcp-typo` prints `MediaConfigError: MEDIA_STORAGE_PROVIDER must be one of ...` and exits 1; with no `MEDIA_*` set the server starts and `GET /service/health` answers 200.

## Deferred / not run
- Live GCS check (6.2-6.4): the owner env file has no GCS variables (names checked, no values printed: only `E2E_CTP_*`, `E2E_BUSINESS_UNIT_KEY`, `E2E_ALLOW_PROJECT_KEY`), and Docker is not running (daemon unreachable), so fake-gcs-server could not be used. `e2e/media/media.e2e.ts` is written and skips cleanly; run it per `service/e2e/README.md` once a bucket (M-G1) or Docker is available. Public-fetch and newest-first behaviour on a real bucket are therefore unverified.
- S3 and Cloudinary: mock-tested only, unverified live (as decided in Q-06).
- `openspec validate` not run.
