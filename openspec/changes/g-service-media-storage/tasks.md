## 0. How to read this file

Vocabulary used below.
- **Connect**: commercetools' hosting platform for integrations. This repo's `service` app is one Connect application; it is
  built from the folder `service/`, runs with 512 MB memory, has no disk and receives its configuration as environment variables.
- **BU (business unit)**: the `:businessUnitKey` URL segment. Content (and now media) is scoped per BU.
- **Provider**: one of the three storage backends: `gcp` (Google Cloud Storage), `aws` (Amazon S3 or an S3-compatible server),
  `cloudinary`.
- **Names from other specs (verified in their finished designs)**: spec D owns `src/config/env.ts` (`readConfiguration`, `getConfiguration`, zod),
  `getLogger()` in `src/utils/logger.utils.ts`, `CustomError` and `errorMiddleware`; spec E owns `requireAuth` in `src/middleware/auth.middleware.ts`
  and extends `CustomError` with an optional stable `code`: `new CustomError(status, message, undefined, { code })`. The service error body is
  `{ message, statusCode, correlationId, code?, errors? }`. Re-check these names with `ls service/src service/src/config service/src/middleware` before starting.
- **`src/_pending/`**: spec D moved the unported source files to `service/src/_pending/` (excluded from `tsc` and jest). G owns the media files there:
  `routes/file.route.ts`, `controllers/file-controller.ts`, `controllers/file-controllers/*`.
- All paths are relative to the repo root `/Users/behnam/code/commercetools-labs/contentools/` unless they start with `/Users/behnam/code/cms/`
  (the read-only source). Run commands from `service/` unless stated (`cd service`).
- Every new `.ts` file starts with the exact SPDX header:
```ts
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
- Code in the target must contain no occurrence of the word "cms" (case-insensitive), no `any`, no commented-out code.

Pre-conditions for the whole spec: specs C, D and E are archived and `ls src/_pending` lists the three media paths above (`openspec list` shows them archived), so `service/` already has
Express, the single-tenant client, the config reader and the auth middleware; `cd service && yarn install --frozen-lockfile && yarn test`
is green before you start. Spec B's test harness (jest, supertest, msw) is available.

## 1. Dependencies and scaffolding

Context: the media module is a new folder `service/src/media/` with its own tests. We first fix dependencies so every later
task compiles. We keep the three SDKs the source already used; `multer` handles multipart parsing in memory.

Pre-conditions: section 0.

- [ ] 1.1 Edit `service/package.json` `dependencies`: ensure `@aws-sdk/client-s3` (`^3.772.0` or newer), `@google-cloud/storage` (`^8`),
  `cloudinary` (`^2.6.0`), `multer` (`^2.2.0`) are present; add to `devDependencies`: `aws-sdk-client-mock` (`^4`), `@types/multer`, `@types/supertest` (if B did not add it).
  Remove nothing else here. Run `yarn install` and commit `yarn.lock`.
  Done when: `yarn why @aws-sdk/client-s3` prints a version and `yarn audit --groups dependencies --level high` exits 0 (Connect's validation
  runs a vulnerability scan that fails on HIGH/CRITICAL, see spec H).
- [ ] 1.2 Create the empty folders and a barrel: `mkdir -p src/media/providers tests/media/support e2e/media`. Create `src/media/index.ts` that will export
  `createMediaRouter`, `loadMediaConfig`, `createStorageProvider` (leave it empty with the SPDX header for now; task 7.3 fills it).
  Done when: `ls src/media tests/media e2e` shows the folders.
- [ ] 1.3 Create `src/media/errors.ts` with these classes (all extend `Error`, set `name`):
```ts
import { CustomError } from '../errors/custom.error';
export type MediaErrorCode =
  | 'MEDIA_NOT_CONFIGURED' | 'MEDIA_FILE_REQUIRED' | 'MEDIA_FILE_TOO_LARGE' | 'MEDIA_FILE_COUNT_EXCEEDED'
  | 'MEDIA_TYPE_NOT_ALLOWED' | 'MEDIA_TYPE_MISMATCH' | 'MEDIA_INVALID_BUSINESS_UNIT' | 'MEDIA_INVALID_CURSOR'
  | 'MEDIA_INVALID_EXTENSIONS' | 'MEDIA_INVALID_METADATA' | 'MEDIA_STORAGE_UNAVAILABLE';
/** A CustomError with a stable `code`; spec D's error middleware renders { message, statusCode, correlationId, code }. */
export class MediaError extends CustomError {
  constructor(status: number, readonly mediaCode: MediaErrorCode, message: string) { super(status, message, undefined, { code: mediaCode }); }
}
export class MediaConfigError extends Error { constructor(message: string) { super(message); this.name = 'MediaConfigError'; } }
export class StorageUnavailableError extends Error {
  constructor(readonly provider: string, readonly reason: string) { super(`storage ${provider} unavailable: ${reason}`); this.name = 'StorageUnavailableError'; }
}
```
  Status per code (passed by the thrower): 501, 400, 413, 400, 415, 415, 400, 400, 400, 400, 502 in the order above.
  Done when: `npx tsc --noEmit` passes.

Verification: `npx tsc --noEmit` -> no output, exit 0.
Rollback: `git checkout service/package.json service/yarn.lock && rm -rf service/src/media`.

## 2. Pure helpers (keys, MIME, cursor, configuration)

Context: all rules that are not storage I/O are pure functions, so they are unit-testable in milliseconds. These tasks implement the
requirements "Object path convention", "Content type allowlist with sniffing", "Cursor pagination" and "Credentials are validated".

Pre-conditions: group 1 done.

- [ ] 2.1 `src/media/keys.ts`. Exports:
```ts
export const BU_KEY_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
export function assertBusinessUnitKey(value: string): string          // throws MediaError(400,'MEDIA_INVALID_BUSINESS_UNIT',...)
export function sanitizeFileName(original: string): string           // stem only, rules in spec "File name sanitization"
export function reverseTimestamp(nowMs: number): string               // String(9999999999999 - nowMs).padStart(13,'0')
export function buildObjectKey(i: { prefix: string; businessUnitKey: string; stem: string; ext: string; nowMs: number; id: string }): string
export function listPrefix(prefix: string, businessUnitKey: string): string   // `${prefix}/${bu}/` (trailing slash)
export function newObjectId(): string                                 // crypto.randomBytes(4).toString('hex')
```
  `sanitizeFileName` steps: `path.posix.basename(original.replace(/\\/g,'/'))` -> drop the extension (`path.posix.parse(...).name`) -> `.normalize('NFKD')`
  -> `replace(/[^A-Za-z0-9._-]+/g,'-')` -> `replace(/^[-.]+|[-.]+$/g,'')` -> `slice(0,80)` -> `|| 'file'`.
  Done when: unit test `tests/media/keys.test.ts` passes with cases: `Summer Sale (1).PNG` -> stem `Summer-Sale-1`; `../../etc/passwd.png` -> `passwd`;
  `日本語.png` -> `file`; BU `ab` vs `a` prefixes differ (`x/a/` is not a prefix of `x/ab/...`); `buildObjectKey` with `nowMs=1767225600000`,
  id `1a2b3c4d`, stem `Summer-Sale-1`, ext `png`, prefix `contentools/media`, BU `main-bu` equals `contentools/media/main-bu/8232774399999-1a2b3c4d-Summer-Sale-1.png`.
- [ ] 2.2 `src/media/mime.ts`. Exports `parseAllowedMimeTypes(csv: string): ReadonlySet<string>` (trim, lowercase, drop empties, reject entries not matching
  `^[a-z]+/[a-z0-9.+-]+$`), `sniffMime(buf: Buffer): string | null`, `canonicalMime(declared: string): string` (`image/jpg` -> `image/jpeg`, strip `; charset=...`),
  `extensionFor(mime: string): string` (map: jpeg->`jpg`, png, gif, webp, avif, pdf, svg+xml->`svg`), `isImageMime(mime)`.
  Signatures for `sniffMime`: JPEG bytes `ff d8 ff`; PNG `89 50 4e 47 0d 0a 1a 0a`; GIF ascii `GIF87a`/`GIF89a`; WebP `RIFF` at 0 and `WEBP` at 8;
  AVIF `ftyp` at 4 followed by `avif` or `avis` at 8; PDF `%PDF-`; SVG: `buf.subarray(0,512).toString('utf8').trimStart()` starts with `<svg` or (`<?xml` and contains `<svg`).
  Done when: `tests/media/mime.test.ts` covers one real minimal fixture per type (build the buffers inline from hex strings, no binary files committed), a text/html buffer -> `null`,
  and `parseAllowedMimeTypes('image/png, IMAGE/JPEG')` -> `{image/png,image/jpeg}`.
- [ ] 2.3 `src/media/cursor.ts`. Exports `encodeCursor(c: { bu: string; ext: string; t: string })` and `decodeCursor(raw: string, expect: { bu: string; ext: string }): string` (returns the provider token `t`).
  Encoding: `Buffer.from(JSON.stringify({ v: 1, ...c })).toString('base64url')`. Decoding throws `MediaError(400,'MEDIA_INVALID_CURSOR',...)` on any failure: bad base64/JSON, `v !== 1`, `bu` or `ext` mismatch, token longer than 2048 chars.
  Done when: `tests/media/cursor.test.ts` passes round trip, garbage input, wrong BU, wrong extension set.
- [ ] 2.4 `src/media/config.ts`: `loadMediaConfig(env: Record<string, string | undefined>): MediaConfig`.
```ts
export interface CommonMediaConfig { pathPrefix: string; maxUploadBytes: number; allowedMimeTypes: ReadonlySet<string>; publicBaseUrl: string | null }
export type MediaConfig = CommonMediaConfig & (
  | { provider: 'none' }
  | { provider: 'gcp'; bucket: string; serviceAccount: { client_email: string; private_key: string; project_id?: string } }
  | { provider: 'aws'; bucket: string; region: string; endpoint: string | null; accessKeyId: string; secretAccessKey: string }
  | { provider: 'cloudinary'; cloudName: string; apiKey: string; apiSecret: string });
```
  Rules (each violation collects a message; at the end `throw new MediaConfigError(messages.join('; '))` naming KEYS only, never values):
  `MEDIA_STORAGE_PROVIDER` default `none`, lowercased, must be one of the four; `MEDIA_PATH_PREFIX` default `contentools/media`, strip leading/trailing `/`, must match `^[A-Za-z0-9/_-]{1,200}$` with no `//`;
  `MEDIA_MAX_UPLOAD_BYTES` default `10485760`, integer 1024..26214400; `MEDIA_ALLOWED_MIME_TYPES` default as in design.md (use `parseAllowedMimeTypes`); `MEDIA_PUBLIC_BASE_URL` empty -> null, else must be `https://` (or `http://localhost`) and is stored without trailing `/`.
  Provider keys per the table in design.md decision 2 are required only for the selected provider. GCP: base64-decode `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64`, `JSON.parse`, require string `client_email` and `private_key`; on any failure message is `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64 is not base64 of a service-account JSON` (never include the value or a parser message that echoes it).
  AWS: `MEDIA_AWS_REGION` default `us-east-1`; `MEDIA_AWS_ENDPOINT` empty -> null else `http(s)://` URL. Cloudinary: reject (for provider `cloudinary`) any allowed MIME type that is neither `image/*` nor `application/pdf`.
  Call-site (task 7.3): pass `process.env` once, via spec D's config reader if it exposes the raw env (adapt).
  Done when: `tests/media/config.test.ts` covers: default is `none`; `gcpcms` rejected naming `MEDIA_STORAGE_PROVIDER`; missing `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` named; bad base64 not echoed (assert `expect(message).not.toContain(secretValue)`); GCP keys ignored when provider is `aws`; ceiling 26214400; Cloudinary with `video/mp4` rejected.

Verification: `npx jest tests/media` -> the four helper suites (keys, mime, cursor, config) green. `npx tsc --noEmit` clean.
Rollback: delete the files created in this group.

Pitfalls: do not read `process.env` inside `config.ts` (keeps it testable); do not log the config object (it holds secrets); `Buffer.from(x, 'base64')` never throws, so validate by `JSON.parse` result shape.

## 3. Providers

Context: each provider file is ~100 lines and implements `StorageProvider` from `src/media/types.ts` (create it first, task 3.1; copy the interface from design.md decision 1 verbatim).
SDK clients are imported lazily inside the constructor factory (`await import('@aws-sdk/client-s3')`) so a deployment that uses `none` or another provider
does not pay SDK start-up time (Connect sandbox deployments already cold-start in about 15 s).

Pre-conditions: group 2 done.

- [ ] 3.1 `src/media/types.ts` (the interface, `PutInput`, `StoredObject`, `ListInput`, `MediaFile`, `ListPage`, `ProviderId`) and `src/media/public-url.ts`:
  `export function publicUrl(base: string | null, fallback: string, key: string): string` -> `base ? `${base}/${key}` : fallback` (keys are already URL-safe because of sanitization; still `encodeURI` each segment).
  Done when: `npx tsc --noEmit` passes.
- [ ] 3.2 `src/media/providers/aws.provider.ts`: `export async function createAwsProvider(cfg: AwsConfig & CommonMediaConfig): Promise<StorageProvider>`.
  Client: `new S3Client({ region, endpoint: endpoint ?? undefined, forcePathStyle: endpoint !== null, credentials: { accessKeyId, secretAccessKey } })`.
  `put`: `PutObjectCommand({ Bucket, Key, Body, ContentType, CacheControl: 'public, max-age=31536000, immutable', Metadata: { title: encodeURIComponent(title), description: encodeURIComponent(description) } })` (omit absent values; NO `ACL`).
  URL: endpoint set -> `${endpoint}/${bucket}/${key}`, else `https://${bucket}.s3.${region}.amazonaws.com/${key}`; wrap with `publicUrl`.
  `list`: `ListObjectsV2Command({ Bucket, Prefix, MaxKeys: limit, ContinuationToken })`; drop keys ending `/`; map `HeadObjectCommand` per key with concurrency 8 (write a 10-line `mapLimit` helper in `src/media/concurrency.ts`, no dependency), catching failures per key (file returned without title/description); decode metadata with `decodeURIComponent` inside try/catch; `nextCursor = response.IsTruncated ? response.NextContinuationToken ?? null : null`.
  The provider returns what the page contains; it never filters by extension (`ListInput` has no `extensions` field; `MediaService` filters, task 4.1).
  `remove`: `DeleteObjectCommand` (S3 delete of a missing key succeeds). `checkConnectivity`: `HeadBucketCommand`; catch -> `throw new StorageUnavailableError('aws', err.name ?? 'Error')` (use the error `name`, e.g. `AccessDenied`, never `message`).
  Done when: provider contract test (group 5) passes for aws.
- [ ] 3.3 `src/media/providers/gcp.provider.ts`: `createGcpProvider(cfg)`.
  `new Storage({ projectId: serviceAccount.project_id, credentials: { client_email, private_key } })`; bucket `storage.bucket(cfg.bucket)`.
  `put`: `bucket.file(key).save(body, { resumable: false, contentType, metadata: { cacheControl: 'public, max-age=31536000, immutable', metadata: { title, description } } })` (NO `public: true`; metadata values omitted when undefined).
  URL fallback `https://storage.googleapis.com/${bucket}/${key}`.
  `list`: `const [files, next] = await bucket.getFiles({ prefix, maxResults: limit, pageToken: cursor, autoPaginate: false })`; map each `file.metadata` (`size` string->number, `timeCreated`, `contentType`, `metadata.title`, `metadata.description`); skip names ending `/`; `nextCursor = (next as { pageToken?: string } | null)?.pageToken ?? null`.
  `remove`: `file.delete({ ignoreNotFound: true })`. `checkConnectivity`: `bucket.getFiles({ prefix, maxResults: 1, autoPaginate: false })`; error -> `StorageUnavailableError('gcp', String(err.code ?? err.name))`.
  Done when: contract test passes for gcp.
- [ ] 3.4 `src/media/providers/cloudinary.provider.ts`: `createCloudinaryProvider(cfg)`.
  `import { v2 as cloudinary } from 'cloudinary'`; `cloudinary.config({ cloud_name, api_key, api_secret, secure: true })`.
  `put`: wrap `cloudinary.uploader.upload_stream({ public_id: keyWithoutExtension, resource_type: 'image', overwrite: false, unique_filename: false, use_filename: false, context: { title, description } (omit when both absent), invalidate: false }, cb)` in a Promise and `.end(body)`; result `secure_url` is the URL (use `publicUrl(base, secure_url, key)`); the `key` returned to callers is `public_id + '.' + format`.
  `list`: `cloudinary.api.resources({ type: 'upload', resource_type: 'image', prefix, max_results: limit, next_cursor: cursor, context: true })`; map `resource.public_id`, `resource.format`, `resource.secure_url`, `resource.created_at`, `resource.bytes`, `resource.context?.custom?.title|description`; `nextCursor = result.next_cursor ?? null`.
  `remove`: `cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })` (result `not found` is success). `checkConnectivity`: `cloudinary.api.ping()`; error -> `StorageUnavailableError('cloudinary', String(err.http_code ?? err.name))`.
  Done when: contract test passes for cloudinary.
- [ ] 3.5 `src/media/provider-factory.ts`:
```ts
export async function createStorageProvider(cfg: MediaConfig): Promise<StorageProvider | null> {
  switch (cfg.provider) {
    case 'none': return null;
    case 'aws': return (await import('./providers/aws.provider')).createAwsProvider(cfg);
    case 'gcp': return (await import('./providers/gcp.provider')).createGcpProvider(cfg);
    case 'cloudinary': return (await import('./providers/cloudinary.provider')).createCloudinaryProvider(cfg);
  }
}
```
  The caller (task 4.2) memoizes the promise. Done when: `tsc --noEmit` passes (the `switch` is exhaustive, so no `default`).

Verification: after group 5. Rollback: delete `src/media/providers`.
Pitfalls: S3 user metadata keys are lowercased by S3 (`title`); GCS custom metadata values must be strings; Cloudinary `api.resources` returns `context.custom` only when `context: true`; never put the provider SDK error `message` into `StorageUnavailableError` (it can contain bucket names and request ids that identify the account).

## 4. Media service and routes

Context: `MediaService` is the only code that knows rules (BU, MIME, keys, pagination, clamping). The router turns HTTP into service calls and
service errors into JSON.

Pre-conditions: groups 2 and 3 done; find the real names of `requireAuth` (spec E), `CustomError` and the error middleware (spec D).

- [ ] 4.1 `src/media/media.service.ts`:
```ts
export interface MediaServiceDeps { config: MediaConfig; getProvider: () => Promise<StorageProvider | null>; now?: () => number; newId?: () => string }
export function createMediaService(deps: MediaServiceDeps): {
  upload(i: { businessUnitKey: string; file: { buffer: Buffer; originalname: string; mimetype: string }; title?: string; description?: string }): Promise<UploadResult>;
  list(i: { businessUnitKey: string; limit?: number; cursor?: string; extensions?: string }): Promise<{ files: MediaFile[]; pagination: { limit: number; nextCursor: string | null; hasMore: boolean } }>;
}
```
  `upload`: `provider = await getProvider(); if (!provider) throw new MediaError(501,'MEDIA_NOT_CONFIGURED',...)` -> `assertBusinessUnitKey` ->
  validate title <= 200 and description <= 2000 else `MEDIA_INVALID_METADATA` -> `declared = canonicalMime(file.mimetype)`; `allowed.has(declared)` else 415 `MEDIA_TYPE_NOT_ALLOWED` ->
  `sniffed = sniffMime(buffer)`; `sniffed !== declared` -> 415 `MEDIA_TYPE_MISMATCH` -> key = `buildObjectKey({... stem: sanitizeFileName(originalname), ext: extensionFor(sniffed) })` -> `provider.put({ key, body, contentType: sniffed, title, description })`;
  any non-`MediaError` thrown by `put` -> `MediaError(502,'MEDIA_STORAGE_UNAVAILABLE','Media storage is unavailable')` after `getLogger().error('media.upload.failed', { provider: provider.id, reason: <error name only> })`.
  `list`: parse `limit` (`Number.parseInt`, NaN -> 20, clamp 1..100), parse extensions (`split(',')`, strip a leading `.`, lowercase, 1..20 entries, each `^[a-z0-9]{1,10}$` else 400 `MEDIA_INVALID_EXTENSIONS`), `providerToken = cursor ? decodeCursor(cursor, { bu, ext }) : undefined`;
  loop at most 5 times: `page = await provider.list({ prefix: listPrefix(...), limit, cursor: token })`; append the files whose extension passes the filter (all files when no filter); set `token = page.nextCursor`; stop when `files.length >= limit` or `token === null`.
  Never trim the collected files: each provider page holds at most `limit` entries, so a filtered response holds at most `2*limit - 1` files, and trimming would make the returned cursor skip files. Say so in the JSDoc.
  `hasMore = nextCursor !== null`; `nextCursor` wrapped with `encodeCursor({ bu, ext: extensions.sort().join(','), t })`.
  Add `isImage` using `isImageMime(contentType) || ['jpg','jpeg','png','gif','webp','avif','svg'].includes(ext)`.
  Done when: `tests/media/media.service.test.ts` passes with an in-memory fake provider (task 5.1): upload happy path, each rejection code, 45-object walk (20/20/5 pages with `limit=20`), filter scenario, tampered cursor, clamping (provider called with `limit: 100`).
- [ ] 4.2 `src/media/runtime.ts`: `export function createMediaRuntime(env: Record<string, string | undefined>)` returning `{ config, getProvider, service }` where `getProvider` memoizes `createStorageProvider(config)` in a module-level `Promise` (created on first call, so importing the app builds no SDK client). Done when: unit test asserts two `getProvider()` calls resolve to the same object and that no SDK mock constructor was called before the first call.
- [ ] 4.3 `src/routes/media.route.ts` (new; replaces `routes/file.route.ts`). Source reference for the multer wiring: `/Users/behnam/code/cms/service/src/routes/file.route.ts` lines 15-52 and 54-83; changes: no `x-project-key`, no project path, auth middleware, limits, error mapping, no `compile-upload`.
```ts
export function createMediaRouter(deps: { service: MediaService; limits: { maxUploadBytes: number }; allowedMimeTypes: ReadonlySet<string> }): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: deps.limits.maxUploadBytes, files: 1, fields: 4, fieldSize: 4096, parts: 6 },
    fileFilter: (_req, file, cb) => cb(null, deps.allowedMimeTypes.has(canonicalMime(file.mimetype))) /* rejected files arrive as req.file === undefined, see below */,
  });
  router.post('/:businessUnitKey/upload-file', requireAuth, uploadSingle(upload), asyncHandler(async (req, res) => { ... res.json(result); }));
  router.get('/:businessUnitKey/media-library', requireAuth, asyncHandler(async (req, res) => { ... res.json(await deps.service.list({...})); }));
  return router;
}
```
  Details: because `fileFilter` returning `false` silently drops the file, capture the rejection instead: `cb(new MediaError(415,'MEDIA_TYPE_NOT_ALLOWED','Content type is not allowed'))` (multer forwards it to `next(err)`).
  `uploadSingle` wraps `upload.single('file')` and maps `MulterError.code`: `LIMIT_FILE_SIZE` -> `MediaError(413,'MEDIA_FILE_TOO_LARGE')`, `LIMIT_FILE_COUNT`/`LIMIT_UNEXPECTED_FILE`/`LIMIT_PART_COUNT` -> `MediaError(400,'MEDIA_FILE_COUNT_EXCEEDED')`, `LIMIT_FIELD_VALUE`/`LIMIT_FIELD_COUNT` -> `MediaError(400,'MEDIA_INVALID_METADATA')`.
  If `req.file` is undefined after multer -> `MediaError(400,'MEDIA_FILE_REQUIRED')`.
  Error rendering: do nothing special. `MediaError` is a `CustomError`, so spec D's `errorMiddleware` (extended by E for `code`) answers `{ message, statusCode, correlationId, code }`; the route just forwards errors with `next(err)` (via `asyncHandler`).
  Route logging: one `getLogger().info('media.upload', { businessUnitKey, size, contentType, durationMs })` on success. Do not log `originalname`, `title`, `description`.
  Done when: route tests (group 5) pass.
- [ ] 4.4 Wire it: edit `src/routes/service.route.ts` (it was rewritten by C/F): remove `import fileRouter from './file.route'` and `serviceRouter.use('/', fileRouter)` if still present; add
  `const media = createMediaRouter(createMediaRuntime(process.env)...)` (use D's config object instead of `process.env` if D exposes it) and `serviceRouter.use('/', media)`. Order matters: `/:businessUnitKey/upload-file` and `/:businessUnitKey/media-library` must be registered like the other BU routes, before any catch-all.
  Delete the parked media files: `git rm src/_pending/routes/file.route.ts src/_pending/controllers/file-controller.ts src/_pending/controllers/file-controllers/*.ts` (they are rewritten, not ported; source for reference only: `/Users/behnam/code/cms/service/src/...`). Then check the folder: `find src/_pending -type f` must be empty once spec F also moved its files out; if it is empty run `rmdir -p src/_pending 2>/dev/null; test ! -d src/_pending && echo gone`, otherwise leave the remaining files to F (F's DoD removes the folder) and record in the PR that G is done with its part. Also remove any `_pending` entry that D put in `tsconfig.json` `exclude` and in jest `testPathIgnorePatterns` once the folder is gone.
  Run `grep -rn "file-controller\|file.route\|compile-upload\|bundler.utils" src tests e2e` -> no matches (`src/_pending` is included in `src`, so it must also be clean).
  Done when: `npx tsc --noEmit` passes, the grep prints nothing and `ls src/_pending/routes/file.route.ts` fails.
- [ ] 4.5 Startup validation: in `src/index.ts` (or wherever D builds the validated config) call `loadMediaConfig(process.env)` before `app.listen` so a bad key stops the process (design decision 3). A thrown `MediaConfigError` must print `MediaConfigError: <key names>` through the logger and exit code 1.
  Done when: `MEDIA_STORAGE_PROVIDER=gcpcms yarn start` (after `yarn build`) prints the error naming `MEDIA_STORAGE_PROVIDER` and exits 1; with no `MEDIA_*` set it starts.

Verification: `npx tsc --noEmit`, then group 5.
Rollback: `git checkout src/routes/service.route.ts src/index.ts`, restore deleted files from git, delete new files.
Pitfalls: `multer` memory storage plus Express `bodyParser` do not conflict because multipart bodies are ignored by `bodyParser.json`; Express 4 does not catch async errors, so `asyncHandler` (check whether D has one; otherwise 3 lines: `(fn) => (req,res,next) => { fn(req,res).catch(next); }`) is mandatory; the BU param must be validated by the service, not by an Express regex, so the error code is ours.

## 5. Tests (all offline)

Context: three levels as in design.md decision 9. Use the jest + supertest setup from spec B. No test may touch the network; keep `msw`'s `onUnhandledRequest: 'error'` if B enabled it globally.

Pre-conditions: groups 2-4 done.

- [ ] 5.1 `tests/media/support/memory-provider.ts`: an in-memory `StorageProvider` (Map keyed by object key; `list` sorts keys ascending, honours prefix, `limit`, and a numeric-string cursor; records calls in `calls: string[]`). Used by service and route tests.
- [ ] 5.2 `tests/media/support/provider-contract.ts`: `export function describeStorageProviderContract(name: string, makeHarness: () => Promise<{ provider: StorageProvider; seed(keys: string[]): Promise<void>; calls(): { list: number; perObject: number }; cleanup(): void }>)` with these `it`s: stores and returns URL for the key; list returns only the requested prefix (seed `p/a/1.png`, `p/ab/2.png`, list `p/a/` -> 1 object); paging with `limit=2` over 5 objects yields 2,2,1 and `nextCursor` null at the end; `remove` of a missing key resolves; `checkConnectivity` resolves; `checkConnectivity` rejects with `StorageUnavailableError` carrying provider id and containing no credential text (harness exposes `failConnectivity(secret)`).
- [ ] 5.3 Three harness test files, each calls `describeStorageProviderContract`:
  - `tests/media/providers/aws.provider.test.ts` using `aws-sdk-client-mock` (`mockClient(S3Client)`): reply to `PutObjectCommand`, `ListObjectsV2Command` (derive from an in-memory object list, set `IsTruncated`/`NextContinuationToken`), `HeadObjectCommand`, `DeleteObjectCommand`, `HeadBucketCommand`. Extra assertions: `PutObjectCommand` input has no `ACL`; `Metadata.title` is `Caf%C3%A9` for `Café`; a listing of 20 keys produces 1 `ListObjectsV2Command`, <= 20 `HeadObjectCommand`, 0 `GetObjectCommand`; one rejected `HeadObjectCommand` still returns the file.
  - `tests/media/providers/gcp.provider.test.ts` using `jest.mock('@google-cloud/storage', () => ({ Storage: FakeStorage }))` with an in-memory bucket exposing `file(name).save/delete`, `getFiles({prefix,maxResults,pageToken,autoPaginate})` returning `[files, nextQuery]`. Extra: `save` options do not include `public`; listing makes exactly one `getFiles` and no `getMetadata`.
  - `tests/media/providers/cloudinary.provider.test.ts` using `jest.mock('cloudinary', ...)` with fake `v2.config`, `uploader.upload_stream` (returns a Writable whose `end` invokes the callback with `{ secure_url, public_id, format }`), `api.resources`, `uploader.destroy`, `api.ping`. Extra: upload options contain `context: { title: 'a|b=c' }` as an object; listing makes one `api.resources` call with `context: true` and no `api.resource` call.
  Done when: `npx jest tests/media/providers` -> 3 suites green.
- [ ] 5.4 `tests/media/media.service.test.ts` (task 4.1 cases) and `tests/media/media.route.test.ts` with supertest: build an Express app with `express.json()`, a fake auth (`requireAuth` stub accepting `Bearer ok`; if spec E offers a test helper to mint tokens use it instead), `createMediaRouter` with the memory provider, then D's `errorMiddleware` (so assertions cover the real body shape `{ message, statusCode, correlationId, code }`). Cases (one `it` each, names mirror the spec scenarios): 401 without token (upload and library, provider `calls` empty); 200 upload with inline 1x1 PNG buffer (hex `89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082`) -> body has `url`, `key` starting `contentools/media/main-bu/`, `contentType: 'image/png'`; 413 over limit (config `maxUploadBytes: 1024`); 400 no file; 400 two files; 415 `text/html`; 415 mismatch; 415 default SVG; 415 allowlist `image/png` with JPEG; 400 invalid BU (`a..b`, use `%2e%2e`); 400 title 201 chars; 501 with `none` (`getProvider` returns null); 502 when provider `put` throws an error containing the bucket name, body must not contain it; library: isolation `a` vs `ab` vs `b`, pagination walk, limit clamp, tampered cursor, `extensions=png,../x` -> 400, `extensions=jpg,png` filter.
  Done when: `npx jest tests/media` -> all suites green, `npx jest --coverage --collectCoverageFrom='src/media/**/*.ts'` shows >= 90% lines.
- [ ] 5.5 Secret hygiene test `tests/media/no-secret-leak.test.ts`: call `loadMediaConfig` with a fake secret in each secured key, force a failure, and assert the thrown message and the `JSON.stringify` of every `MediaError` response body from the route tests do not contain the secret strings.

Verification (automated): `cd service && npx jest tests/media --runInBand` -> expected tail `Test Suites: 11 passed` (about 11; the point is zero failures) and `Tests: <n> passed`.
Rollback: delete `tests/media`.

## 6. Optional live check (emulators, then real accounts)

Context: mocks prove our code calls the SDKs the way we believe. This group proves it against servers. Emulators need only Docker; real
the real GCS bucket needs credentials from the owner (manual step M-02/M-G1, see `manual.md`). It is optional and never runs in `yarn test`.

Pre-conditions: group 5 done; Docker running (`docker info`).

- [ ] 6.1 Create `e2e/media/docker-compose.yml` (no Dockerfile involved) with services `minio` (image `minio/minio`, command `server /data`, env `MINIO_ROOT_USER=contentools`, `MINIO_ROOT_PASSWORD=contentools-secret`, port 9000) and `fake-gcs` (image `fsouza/fake-gcs-server`, command `-scheme http -port 4443 -public-host localhost:4443`, port 4443).
  Create buckets: for MinIO `docker run --rm --network host --entrypoint sh minio/mc -c "mc alias set l http://localhost:9000 contentools contentools-secret && mc mb --ignore-existing l/media-test && mc anonymous set download l/media-test"`; fake-gcs creates buckets on first `POST /storage/v1/b?project=test` (`curl -s -X POST localhost:4443/storage/v1/b?project=test -H 'content-type: application/json' -d '{"name":"media-test"}'`).
  Done when: `docker compose -f e2e/media/docker-compose.yml up -d` prints both containers started and `curl -s localhost:9000/minio/health/live -o /dev/null -w '%{http_code}'` prints `200`.
- [ ] 6.2 `e2e/media/media.e2e.ts` (env-gated: `describe.skip` unless `E2E_MEDIA_PROVIDER` is set). Uses the real `createMediaRuntime` with an env built from `E2E_MEDIA_*` variables: for `aws` set `MEDIA_AWS_ENDPOINT=http://localhost:9000`, bucket `media-test`, the MinIO key pair; for `gcp` with the emulator set `STORAGE_EMULATOR_HOST=http://localhost:4443` (the GCS SDK honours it) with a dummy key JSON; for `cloudinary` only a real account. Test body: prefix forced to `contentools-test/media` -> `checkConnectivity` -> upload PNG -> `fetch(url)` returns 200 and the same bytes (for aws/minio: the bucket policy `download` allows it) -> list contains it first -> upload a second -> `limit=1` paging walks both -> cleanup `remove` both in `afterAll`. Refuse to run if the prefix is not under `contentools-test/`.
  Add script `"test:e2e:media": "jest --config e2e/jest.config.js e2e/media"` (reuse spec B's e2e jest config; adjust path).
  Done when: `E2E_MEDIA_PROVIDER=gcp ... yarn test:e2e:media` -> passes against fake-gcs-server (free, no account) and then against the real bucket (6.3); `aws` against MinIO is an optional extra (if the emulator rejects `save({resumable:false})` metadata, note it in `explore.md` and keep the unit tests as the source of truth).
- [ ] 6.3 (needs the owner's GCS bucket and service-account key, M-G1) Run the same file with `E2E_MEDIA_PROVIDER=gcp` against the real bucket (prefix `contentools-test/media`, key via `E2E_MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64`, bucket via `E2E_MEDIA_GCP_BUCKET`). GCS is the only live-verified provider (owner decision, Q-06): additionally `fetch(url)` of an uploaded object must return 200 anonymously (proves the public-read bucket policy) and listing must be newest first.
  S3 and Cloudinary are verified with mocks only (owner has no accounts): the README states `aws: unit-tested with mocked SDK, unverified live` and `cloudinary: unit-tested with mocked SDK, unverified live`, and design.md risk 3 stays open. Do not remove them from the product.
  Done when: GCS result noted (listing order, public fetch); the README lines above exist.
- [ ] 6.4 `docker compose -f e2e/media/docker-compose.yml down -v` after the run.

Verification: described above. Rollback: delete `e2e/media`.

## 7. Wire-up and hand-off

- [ ] 7.1 Fill `src/media/index.ts` exports (`createMediaRouter`, `createMediaRuntime`, `loadMediaConfig`, `MediaConfigError`, `StorageUnavailableError`) and add a one-line link: spec H's `postDeploy` imports `loadMediaConfig`, `createStorageProvider` from here.
- [ ] 7.2 Update `service/.env.example`: remove every `AWS_*`, `GCP_*`, `CLOUDINARY_*`, `STORAGE_TYPE` line; add the 15 `MEDIA_*` keys with empty values and a comment line per provider. Done when: `grep -c '^MEDIA_' .env.example` prints `15`.
- [ ] 7.3 Hand the key table (design.md decision 2) to spec H: confirm that `h-service-connect-app/design.md` lists the same 15 keys with the same standard/secured split (`diff <(grep -o 'MEDIA_[A-Z_0-9]*' openspec/changes/g-service-media-storage/design.md | sort -u) <(grep -o 'MEDIA_[A-Z_0-9]*' openspec/changes/h-service-connect-app/design.md | sort -u)` prints nothing).
- [ ] 7.4 Update the contract consumers' backlog: add a note (in the PR description or `plans/`) for spec J (`MediaLibraryResult` -> cursor; `uploadMediaFileApi` response gains fields; remove `projectKey`) and spec M (`get_media_library` args: `cursor` instead of `page`; remove `compile_upload` tool).

## 8. Definition of Done (mapped to scenarios)

| Spec scenario group | Proven by |
| ------------------- | --------- |
| media-storage-providers: interface, contract suite | tasks 5.2, 5.3; grep check in 4.4 |
| default `none`, unknown provider, missing/invalid keys, unselected keys ignored | 2.4 tests; 4.5 manual run |
| lazy construction | 4.2 test |
| key shape, BU validation, prefix isolation | 2.1 tests; 5.4 isolation |
| public URL, no ACL | 3.2/3.3 assertions in 5.3; base URL case in 2.x/3.x tests |
| connectivity check sanitized | 5.2 contract case; spec H postDeploy test |
| legacy file code removed, `compile-upload` 404 | 4.4 `git rm` + grep; add one route test requesting `POST /service/compile-upload` -> 404 (in 5.4) |
| media-upload: auth, limits, MIME, sniffing, sanitization, metadata, error mapping | 5.4 route cases, 5.3 provider assertions |
| media-library: auth, isolation, pagination, filter, shape, no N+1, error mapping | 5.4, 5.3 call-count assertions |
| Optional live behaviour | 6.2, 6.3 |

Overall done when: `cd service && npx tsc --noEmit && npx jest tests/media` is green; none of the three media files remains under `src/_pending` (and the folder itself is removed once F is also done); `grep -rniE 'cms|x-project-key|projectKey' src/media src/routes/media.route.ts` prints nothing; the 15-key diff in 7.3 is empty; no file under `service/src/media` lacks the SPDX header (`grep -L 'SPDX-License-Identifier: MIT' $(git ls-files 'src/media/**/*.ts')` prints nothing).
