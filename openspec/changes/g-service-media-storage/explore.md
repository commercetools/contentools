# Explore notes: g-service-media-storage

Working note (not an OpenSpec artifact). Evidence that the source was read. All source paths are under
`/Users/behnam/code/cms/service/` (read-only). Line numbers refer to that tree at the time of reading.

## 1. What exists today

### 1.1 Files

| File | Lines | Role |
| ---- | ----: | ---- |
| `src/routes/file.route.ts` | 159 | Express router: `POST /:businessUnitKey/upload-file`, `GET /:businessUnitKey/media-library`, `POST /compile-upload` |
| `src/controllers/file-controller.ts` | 58 | `FileController` interface, `MediaLibraryResult`, `FileMetadata`, `FileControllerFactory` (reads `STORAGE_TYPE`, default `aws`) |
| `src/controllers/file-controllers/gcp-file-controller.ts` | 138 | Google Cloud Storage backend |
| `src/controllers/file-controllers/aws-file-controller.ts` | 158 | S3 backend |
| `src/controllers/file-controllers/cloudinary-file-controller.ts` | 199 | Cloudinary backend |
| `e2e/file.e2e.ts` | ~80 | Live e2e (uses `x-project-key`; stale after single-tenant) |
| `connect.yaml` (repo root, old) | 60 | Declares the storage keys (see section 4) |

Callers (puck side): `puck/packages/puck-api/src/api/media-library.api.ts` and
`puck/packages/puck-image-picker/src/api/media-library.api.ts` (same two functions twice), the hook
`puck-image-picker/src/hooks/useMediaLibrary.ts`, the field `puck-image-picker/src/ImagePickerField.tsx`
(line 496: `extensions = imagesOnly ? ['jpg','jpeg','png','gif','webp','svg'] : []`, page size 20, previous/next
buttons at lines 595-596), and `mcp/src/shared/functions.ts` lines 364-393 (`upload_file`, `get_media_library`,
`compile_upload`). The types are `MediaLibraryResult` / `MediaFile` / `MediaLibraryPagination` in
`puck/packages/puck-types/src/puck-api.types.ts` (line 39).

### 1.2 Routes (file.route.ts)

| Route | Middleware | Behaviour |
| ----- | ---------- | --------- |
| `POST /:businessUnitKey/upload-file` (line 18) | `validateJwt`, `validateProject`, `multer.memoryStorage()` with NO limits, `upload.single('file')` | 400 if no file; path = `${projectKey}/${businessUnitKey}`; returns `{ url }` |
| `GET /:businessUnitKey/media-library` (line 54) | only `requireProjectKey` (the `x-project-key` header, no token) | query `extensions` (comma list), `page` (default 1), `limit` (default 20, no maximum) |
| `POST /compile-upload` (line 85) | `validateJwt`, `validateProject` | LEGACY: bundles TypeScript with the rollup/babel bundler and uploads the result to `deployed-content-types/`. Removed by spec C (Q-02). NOT carried over. |

### 1.3 Provider behaviour and defects found while reading

`FileController` (file-controller.ts lines 24-35): `uploadFile(file, path?, metadata?) -> url` and
`getMediaLibrary(extensions, page, limit, path?) -> { files, pagination }`. Factory is invoked at module load
(`file.route.ts` line 16), so a bad `STORAGE_TYPE` throws while the module graph is imported, and the unset
default is `aws` (line 45) while `connect.yaml` defaulted to `gcpcms`.

| # | Defect | Where | Consequence |
| - | ------ | ----- | ----------- |
| D1 | Listing ignores the BU path for S3 and Cloudinary: prefix is the literal `uploads/` (aws line 71, cloudinary line 163) while uploads go to `${path}/...` (aws line 35, cloudinary line 129). | aws, cloudinary | The library never shows files uploaded through the API, and (if files were at `uploads/`) would show every BU's files. Cross-BU leakage by design. |
| D2 | GCP stores at `${path}/uploads/<ts>-<name>` and lists `${path}/uploads`; the prefix has no trailing slash so BU `a` also lists BU `ab`'s files. | gcp lines 35, 66 | Prefix collision between business units. |
| D3 | `bucket.getFiles({ prefix })` with auto-pagination (gcp line 70), S3 `MaxKeys: 1000` without continuation (aws line 75), Cloudinary `max_results: 500` (line 164): then filter and slice in memory. | all | Silent truncation at 1000/500 objects; memory and latency grow with library size; `totalItems` is wrong beyond the cap. |
| D4 | Per-file metadata via N+1 calls: S3 uses `GetObjectCommand` (downloads the whole body!) instead of `HeadObject` (aws line 111); Cloudinary calls `api.resource()` once per file (line 76). GCP is fine (the listing already carries metadata, but the code calls `getMetadata()` again, line 96). | aws, cloudinary, gcp | Slow library, Cloudinary Admin API rate limit (default 500 calls/hour), S3 egress cost. |
| D5 | `public: true` on every GCS object (gcp line 42). | gcp | Fails with 400 on buckets that use Uniform bucket-level access (the default for new buckets). Publicity must come from bucket IAM. |
| D6 | S3 URL uses `process.env.AWS_REGION` directly (aws line 57, 107) while the client falls back to `us-east-1` (line 21). | aws | URL contains the text `undefined` when the region is unset. |
| D7 | Cloudinary `context` built by string concatenation `title=${...}|description=${...}` (cloudinary lines 135-143). | cloudinary | A title containing `|` or `=` injects or corrupts context keys. (Verified in the scratchpad: the SDK's `utils.encode_context({title:'a|b=c'})` escapes to `title=a\|b\=c`.) |
| D8 | Cloudinary upload goes through a base64 data URI (line 126). | cloudinary | +33% memory on a 512 MB Connect container. Use `upload_stream`. |
| D9 | No size limit, no MIME allowlist, no content sniffing, file name used verbatim (`file.originalname`, all three). | all | Memory exhaustion (memoryStorage without `limits.fileSize`), stored XSS via `.html`/`.svg`, path characters in object names. |
| D10 | `path` is `${projectKey}/${businessUnitKey}` with `businessUnitKey` taken verbatim from the URL. | route lines 30-33, 62-65 | `..` / `%2F` segments widen the prefix. |
| D11 | S3 object metadata: non-ASCII `title` breaks the signature (S3 user metadata must be US-ASCII, 2 KB total). | aws line 48-50 | 500 on a title like "Café". |
| D12 | Errors are rethrown as `new Error('Failed to upload file')` (no status, no code) and logged with the whole error object. | all | Every failure is a 500 with a generic message; an unavailable bucket is indistinguishable from a bug. |
| D13 | `GET media-library` has no bearer check (only `x-project-key`). | route line 54 | Anyone who knows the project key can enumerate every asset. Under Q-01a only *published content* reads are public, a bucket listing is not content. |

### 1.4 Environment variables read by the storage code

`STORAGE_TYPE`; GCP: `GCP_BUCKET_NAME`, `GCP_PROJECT_ID`, `GCP_STORAGE_SERVICE_ACCOUNT_CLIENT_EMAIL`,
`GCP_STORAGE_SERVICE_ACCOUNT_PRIVATE_KEY` (with a `\\n` to newline rewrite, gcp lines 19-23); AWS:
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`; Cloudinary: `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. (`service/.env.example` lists the same plus the Firestore and JWT keys that
are removed by D/E.)

## 2. Dependencies

From `service/package.json`: `@aws-sdk/client-s3 ^3.772.0`, `@google-cloud/storage ^7.15.2`, `cloudinary ^2.6.0`,
`multer ^2.2.0`, `@types/multer`. `@google-cloud/firestore` is removed by D. Scratchpad check (not in the target tree):
`@google-cloud/storage 8.3.0`, `multer 2.4.0`, `cloudinary` 2.x install clean, `yarn audit --groups dependencies` reports 0 findings
(matters because Connect's validation runs Trivy for HIGH/CRITICAL, see spec H explore).

SDK facts verified in the scratchpad:
* GCS `bucket.getFiles({ prefix, maxResults, pageToken, autoPaginate:false })` is typed in `bucket.d.ts` (lines 16-69); the
  result tuple is `[files, nextQuery, apiResponse]`, `nextQuery.pageToken` is the cursor, and each `File.metadata` already
  holds `size`, `timeCreated`, `contentType` and custom `metadata`.
* multer 2.x aborts with `MulterError` codes `LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`, `LIMIT_PART_COUNT`,
  `LIMIT_FIELD_VALUE` (`node_modules/multer/lib/make-middleware.js` lines 261-427).
* Cloudinary `api.resources({ type:'upload', prefix, max_results, next_cursor, context:true })` returns context inline
  (no per-file call), per the Admin API docs; to be confirmed in the optional live check.

## 3. Platform constraints that shape the design

* Connect `service` apps: 1 CPU, 512 MB memory, 5 minute request timeout, stateless, no persistent disk
  (docs: https://docs.commercetools.com/connect/best-practices). Hence: size cap, no data-URI buffering, no local cache.
* No cloud-native identity for the customer's bucket: the app needs explicit credentials in `securedConfiguration`.
* Connect configuration cannot express "required only if provider X". Provider-specific keys must be `required: false`
  in `connect.yaml`; enforcement has to be in code (startup + `postDeploy`, spec H).
* Product URLs are written into Puck page content by the editor (the picker returns the `url`), so a URL stored in content
  must keep working for as long as the page exists. That rules out expiring signed URLs (see design.md decision 5).

## 4. The old connect.yaml storage block (what was wrong)

`/Users/behnam/code/cms/connect.yaml`, lines 5-47 and 56-61 (fully explained in `h-service-connect-app/design.md`):

* `GCP_BUCKET_NAME`, `GCP_PROJECT_ID`, `GCP_STORAGE_SERVICE_ACCOUNT_CLIENT_EMAIL` in `standardConfiguration` and
  `GCP_STORAGE_SERVICE_ACCOUNT_PRIVATE_KEY` in `securedConfiguration`, all `required: false`. The credential halves were
  split across standard and secured configuration, the PEM key needed a newline-escaping hack, and nothing validated that
  they were present when `STORAGE_TYPE=gcp`. A deployment without them succeeded and failed on the first upload.
* AWS and Cloudinary keys were commented out, so those backends could not be configured on Connect at all.
* `STORAGE_TYPE` lived under `inheritAs.configuration` with `default: gcpcms` (not a valid value: the factory throws
  `Unsupported storage type: gcpcms`) and the description "Storage type (gcp)".

## 5. Target tree (to be created)

```
service/src/media/
  types.ts  errors.ts  config.ts  keys.ts  mime.ts  cursor.ts  provider-factory.ts  media.service.ts
  providers/gcp.provider.ts  providers/aws.provider.ts  providers/cloudinary.provider.ts
service/src/routes/media.route.ts          (replaces routes/file.route.ts)
service/tests/media/*.test.ts              (+ tests/media/support/*)
service/e2e/media.e2e.ts                   (env-gated)
```
The old `controllers/file-controller.ts`, `controllers/file-controllers/*` and `routes/file.route.ts` are deleted.

## 6. Risks recorded

1. Spec D owns `service/src/config` (env reader, logger, `CustomError`, error middleware) and spec E owns the auth
   middleware; names used in tasks.md for them are placeholders to be reconciled at implementation time.
2. The media-library response shape changes (cursor instead of page numbers). `puck-types`, `puck-api`,
   `puck-image-picker` (spec J) and the MCP tool `get_media_library` (spec M) must follow.
3. Cloudinary accounts created recently default to "dynamic folder mode"; relying on `folder` is brittle, so the design
   uses an explicit path-style `public_id` (works in both modes). Needs the optional live check to confirm listing order.
4. Public read access to the bucket is an operator-side prerequisite (cannot be done by the service).
