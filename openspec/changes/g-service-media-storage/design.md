## Context

Media in Contentools means: the Puck image picker uploads a file and lists previously uploaded files per business unit
(BU, the `/:businessUnitKey/` URL segment kept by Q-03). The source implementation (see `explore.md`) has three divergent
backends, several correctness bugs (D1-D13) and a `connect.yaml` that cannot configure two of them. The target is a
single-tenant Connect `service` app: 512 MB memory, no disk, no cloud identity for the customer's bucket, configuration only
through `connect.yaml` keys. This spec delivers the media module and the configuration key contract; spec H writes the
keys into `connect.yaml`, the lifecycle scripts and the README; spec E supplies the auth middleware; spec D supplies the
config reader, logger and error type; spec J/M adapt the clients.

## Goals / Non-Goals

**Goals:**
- One `StorageProvider` interface, three small implementations that pass the same contract suite.
- Valid, validated configuration keys with a clear standard/secured split, usable on Connect.
- Safe uploads (size, type, name) and scalable, per-BU listing with cursor pagination.
- Everything testable without network (mocked SDKs) plus an optional live check.

**Non-Goals:**
- Deleting or renaming media from the UI (no DELETE route; `remove` exists on the interface only for tests and future use).
- Image transformation, thumbnails, virus scanning, quotas per BU.
- Signed or private URLs (decision 5).
- Migrating objects written by the old layout (`<projectKey>/<bu>/...`). They stay where they are; URLs already stored in
  content keep working because objects are not moved.
- Creating buckets, IAM or CORS (operator task, documented in `manual.md`).

## Decisions

### 1. Interface

```ts
// service/src/media/types.ts
export type ProviderId = 'gcp' | 'aws' | 'cloudinary';
export interface PutInput { key: string; body: Buffer; contentType: string; title?: string; description?: string }
export interface StoredObject { key: string; url: string; size: number; contentType: string }
export interface ListInput { prefix: string; limit: number; cursor?: string }
export interface MediaFile { key: string; url: string; name: string; isImage: boolean; title?: string; description?: string;
  createdAt?: string; size?: number; contentType?: string }
export interface ListPage { files: MediaFile[]; nextCursor: string | null }   // provider-native cursor, wrapped by cursor.ts
export interface StorageProvider {
  readonly id: ProviderId;
  put(input: PutInput): Promise<StoredObject>;
  list(input: ListInput): Promise<ListPage>;
  remove(key: string): Promise<void>;          // missing key is success
  checkConnectivity(): Promise<void>;          // throws StorageUnavailableError
}
```
`MediaService` (`media.service.ts`) owns everything that is not storage: BU validation, key building, MIME checks, cursor
wrap/unwrap, clamping, error mapping. Providers know nothing about HTTP. Alternative rejected: keeping the old
`FileController` with `(file, path, metadata)` and an Express type in the interface: it couples providers to multer and made
`list` take page numbers that no provider can honour.

### 2. Configuration keys (the contract handed to spec H)

Rule: halves of a credential (id, key, secret, token, key material) are `securedConfiguration`; names, locations and limits are
`standardConfiguration`. Provider-specific keys are `required: false` in `connect.yaml` because Connect cannot express "required
if provider = X"; `loadMediaConfig()` enforces them (decision 3). Defaults are strings, as in `connect.yaml`.

| Key | Type | Default | Used by | Old key |
| --- | ---- | ------- | ------- | ------- |
| `MEDIA_STORAGE_PROVIDER` | standard | `none` | all | `STORAGE_TYPE` (default `gcpcms`, invalid) |
| `MEDIA_PATH_PREFIX` | standard | `contentools/media` | all | (none; was `<projectKey>/<bu>/uploads`) |
| `MEDIA_MAX_UPLOAD_BYTES` | standard | `10485760` | all | (none; unlimited) |
| `MEDIA_ALLOWED_MIME_TYPES` | standard | `image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf` | all | (none) |
| `MEDIA_PUBLIC_BASE_URL` | standard | empty | all (CDN in front of the bucket) | (none) |
| `MEDIA_GCP_BUCKET` | standard | empty | gcp | `GCP_BUCKET_NAME` |
| `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` | **secured** | empty | gcp | `GCP_STORAGE_SERVICE_ACCOUNT_PRIVATE_KEY` + `..._CLIENT_EMAIL` + `GCP_PROJECT_ID` |
| `MEDIA_AWS_BUCKET` | standard | empty | aws | `AWS_S3_BUCKET` |
| `MEDIA_AWS_REGION` | standard | `us-east-1` | aws | `AWS_REGION` |
| `MEDIA_AWS_ENDPOINT` | standard | empty | aws (S3-compatible, e.g. MinIO) | (none) |
| `MEDIA_AWS_ACCESS_KEY_ID` | **secured** | empty | aws | `AWS_ACCESS_KEY_ID` |
| `MEDIA_AWS_SECRET_ACCESS_KEY` | **secured** | empty | aws | `AWS_SECRET_ACCESS_KEY` |
| `MEDIA_CLOUDINARY_CLOUD_NAME` | standard | empty | cloudinary | `CLOUDINARY_CLOUD_NAME` |
| `MEDIA_CLOUDINARY_API_KEY` | **secured** | empty | cloudinary | `CLOUDINARY_API_KEY` |
| `MEDIA_CLOUDINARY_API_SECRET` | **secured** | empty | cloudinary | `CLOUDINARY_API_SECRET` |

Why one base64 JSON key for GCP: a GCP service-account key is a JSON document containing `client_email`, `private_key` (a
multi-line PEM that the old code repaired with a `\\n` replace), `project_id`. Splitting it across a standard and a secured key
(old) put half a credential in a visible field and invited the newline bug. One secured value, base64 on one line (the same
pattern the `search-config` sibling uses for its GCP key), removes `GCP_PROJECT_ID` and `..._CLIENT_EMAIL` entirely.
The `MEDIA_` prefix removes ambiguity with `CTP_*`, `GCP_*` platform names. Alternative rejected: keep the old names for
continuity; there is no installed base of single-tenant deployments, so clarity wins.

### 3. Validation lives in code, not in the manifest

`loadMediaConfig(env): MediaConfig` is a pure function (no `process.env` access inside; takes an object) returning a
discriminated union (`{provider:'none'} | {provider:'gcp', bucket, credentials} | ...`) plus the common limits. It throws
`MediaConfigError` listing missing key names. It is called (a) at startup by `index.ts` through spec D's config reader, so
a bad deploy fails visibly, and (b) by `postDeploy` (spec H) so the failure message appears in the deployment log. Trade-off
accepted: a mis-set media key stops the whole service, not just media. Rejected alternative "degraded mode" (start, answer
503 on media): an operator who set `MEDIA_STORAGE_PROVIDER=gcp` expects uploads to work, and a half-working deployment is
discovered by an editor, not by the deploy.

### 4. Path convention

`<prefix>/<bu>/<reverseTimestamp>-<id>-<safeName>.<ext>`. The old per-tenant prefix is gone (single tenant); the BU stays
(Q-03) as the isolation unit. Details that matter:
- the listing prefix is `<prefix>/<bu>/` with the trailing slash (fixes D2 collision between `a` and `ab`);
- `bu` matches `^[A-Za-z0-9_-]{1,256}$` (the commercetools key alphabet), which also removes path traversal (D10);
- reverse timestamp makes GCS and S3 (which list in UTF-8 key order) return newest first without sorting, which cursor
  pagination needs; Cloudinary listing order is not guaranteed and is verified in the live check (risk 3);
- `<id>` (8 hex from `crypto.randomBytes(4)`) prevents collisions within one millisecond; no database needed.
- Cloudinary: `public_id` is the key without extension, `resource_type: 'image'` (PDF is an image resource in Cloudinary), no
  `folder` or `asset_folder` parameter, so it behaves the same in fixed and dynamic folder modes. Listing uses `prefix`.
  Allowed types for the Cloudinary provider are limited to `image/*` and `application/pdf`; config loading rejects others.

### 5. Public URLs only (signed URLs rejected)

The picker returns the object `url`, and the editor stores it inside the Puck page JSON. Any URL that expires would silently
break published pages. A signed-URL mode would only be coherent with a resolver that re-signs at render time, which is a
different product. Therefore: public-read objects, stable URLs, optional `MEDIA_PUBLIC_BASE_URL` for a CDN. Consequences,
all documented for operators: the bucket must allow public read of the media prefix through bucket-level policy (GCS:
`allUsers` with `roles/storage.objectViewer` on a uniform-access bucket; S3: Block Public Access relaxed plus a bucket policy
allowing `s3:GetObject` on `<prefix>/*`; no ACLs, since S3 now defaults to ACLs disabled and GCS uniform access rejects
`public: true`, defect D5). Uploaded names are not secret, so do not upload private files. Alternative kept open: an
`urlFor(key)` seam in `MediaService` is the one place a future signed mode would plug in. The listing endpoint is
authenticated (D13) even though the object URLs are public: enumeration is protected, individual URLs are not.

### 6. Upload pipeline

multer (`memoryStorage`, limits from config) -> `fileFilter` rejects a declared type outside the allowlist early ->
`MediaService.upload`: validate BU -> sniff magic bytes (table in `mime.ts`: JPEG `FF D8 FF`, PNG `89 50 4E 47`, GIF `GIF8`,
WebP `RIFF....WEBP`, AVIF `....ftypavif|avis`, PDF `%PDF`, optional SVG when allowlisted: begins with `<svg` or `<?xml` after
trimming, MP4/WebM not in the default list) -> require sniffed == declared (canonicalizing `image/jpg`) -> build key -> `put`.
Memory: the Buffer is held once (10 MiB default, 25 MiB ceiling, so concurrency 10 is at most ~250 MB of the 512 MB
container; documented in the README). Cloudinary uses `uploader.upload_stream` (not a base64 data URI, D8). Cache headers:
objects are immutable (unique key), so GCS `cacheControl` and S3 `CacheControl` are `public, max-age=31536000, immutable`.
Alternative rejected: a library like `file-type` (ESM-only, forces ESM in the whole service for ~8 formats).

### 7. Listing pipeline and pagination

`list` returns one provider page. GCS: `getFiles({prefix, maxResults: limit, pageToken, autoPaginate:false})`, metadata is
already on each `File`. S3: `ListObjectsV2` (`MaxKeys: limit`, `ContinuationToken`) plus `HeadObject` per key with concurrency 8
for title/description (not `GetObject`, D4), tolerant of one failing head. Cloudinary: `api.resources({type:'upload', prefix,
max_results: limit, next_cursor, context:true})`. The extension filter is applied after fetching (all three APIs lack a suffix
filter); `MediaService` loops up to 5 provider pages until it has `limit` matches or runs out, so the cost is bounded. The
public cursor is `base64url(JSON.stringify({v:1, bu, ext: sortedExtensions.join(','), t: providerToken}))`; unwrap rejects a
cursor whose `bu` or `ext` differ from the request (stops cursor reuse across BUs). Page numbers and totals are dropped:
S3/GCS cannot count a prefix without scanning it (defect D3), and `totalItems` was already wrong past 500/1000 objects. The
picker's previous/next buttons become "load more" or a client-side stack of cursors (spec J). **BREAKING** for
`MediaLibraryResult` in `puck-types`.

### 8. Auth, errors, logging

Both routes use spec E's middleware for mutations/protected reads (`requireAuth` from `src/middleware/auth.middleware.ts`). Error bodies follow the service contract `{ message, statusCode, correlationId, code?, errors? }` (D, with `code` added by E); `MediaError` extends `CustomError` and passes the stable `MEDIA_*` code (list in the specs, 501 is `MEDIA_NOT_CONFIGURED`). Logging (D's `getLogger()`, one line per request): `{ msg:'media.upload', businessUnitKey, size, contentType,
provider, durationMs }`, never the file name, title, description, URL query or credentials.

### 9. Tests

Layers: (a) pure unit tests (`keys`, `mime`, `cursor`, `config`), (b) one `describeStorageProviderContract(name, makeHarness)`
suite run against three harnesses: `aws-sdk-client-mock` for S3, `jest.mock('@google-cloud/storage')` with an in-memory fake
bucket, `jest.mock('cloudinary')` with an in-memory fake; (c) route tests with supertest and an in-memory provider (injected
through `createMediaRouter({ getProvider })`), covering auth, limits, MIME matrix, pagination, error mapping; (d) optional live:
`yarn test:e2e:media` against emulators (`fake-gcs-server`, MinIO) started by `docker compose -f e2e/media/docker-compose.yml
up -d`, or real accounts via `E2E_MEDIA_*`. The live suite only writes under `contentools-test/` prefix and removes what it wrote.
Local gate: the service's `yarn test` (run by spec H's `verify:service`) includes the media tests; there is no hosted CI (owner decision).

## Risks / Trade-offs

- **Public bucket = public content.** Mitigated by MIME allowlist, SVG off by default, no HTML, documentation, and keeping
  the listing authenticated. Residual: anyone with a URL can read it.
- **Contract change for pickers.** Cursor pagination breaks `puck-image-picker`/`puck-api`/`mcp`. Mitigation: tracked in
  `questions.md` (Q-G2) and the report; J and M must schedule the change; until then both would send `page`, which the service ignores
  (returns the first page), so the failure is soft.
- **Config coupling to D/E.** Names of the config reader, logger, `CustomError` and `requireAuth` were taken from the finished D and E designs and must be re-checked. Tasks use
  placeholders and each lists the exact lines to adapt.
- **Cloudinary behaviours (order, dynamic folders, context in list)** are only verifiable with a real account; the unit tests
  pin our assumptions, the optional live check confirms them.
- **No cap on number of objects per BU**; listing cost is bounded per call (limit and 5-page scan) so a large library is safe
  to browse, but there is no quota.
- **Emulator fidelity**: fake-gcs-server and MinIO do not reproduce IAM public-access rules; they prove the code paths, not the
  bucket policy.
