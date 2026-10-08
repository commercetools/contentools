## Why

The Puck editor needs image upload and a media library. In the source service this is three
copy-pasted storage backends (GCP, S3, Cloudinary) behind a factory that reads a mis-defaulted
`STORAGE_TYPE`, with no size limit, no content-type check, listings that silently truncate at
500/1000 objects, a library that does not even find the files S3 and Cloudinary uploads wrote, a
per-tenant `projectKey` folder prefix that no longer exists, and an unauthenticated listing endpoint.
Connect has no persistent disk, so the bucket stays external, but it must be configured through
valid, validated `connect.yaml` keys (the old file declared the GCP key material as optional,
split it across standard and secured configuration, and did not declare the AWS or Cloudinary
keys at all). Single-tenant Contentools needs this rebuilt as a small, tested, provider-neutral module.

## What Changes

- Add `service/src/media/`: a `StorageProvider` interface (`put`, `list`, `remove`, `checkConnectivity`),
  three implementations (`gcp`, `aws`, `cloudinary`), a factory that builds the provider lazily and returns
  "not configured" for the new default `none`.
- Add validated media configuration (`MEDIA_*` keys): provider selection, per-provider credentials,
  upload size cap, MIME allowlist, path prefix, optional public base URL. Fail fast when the selected
  provider's keys are missing. These keys are the contract that spec H copies into `connect.yaml`.
- New object path convention without `projectKey`: `<MEDIA_PATH_PREFIX>/<businessUnitKey>/<reverse-timestamp>-<id>-<safe-name>.<ext>`
  (default prefix `contentools/media`), business-unit key validated, newest object listed first.
- Upload hardening: multer limits, MIME allowlist checked twice (declared type and magic-byte sniffing),
  sanitized file names, SVG off by default, metadata escaped per provider.
- Media library pagination rewritten to cursor-based (`limit` max 100, `cursor`, `nextCursor`, `hasMore`),
  using each provider's native paging, with no in-memory slicing and no N+1 metadata calls.
- Public URL model: objects are served from stable public URLs (bucket IAM or CDN base URL); signed,
  expiring URLs are deliberately not offered (decision 5 in design.md).
- Rename the routes' internals only: `POST /service/:businessUnitKey/upload-file` and
  `GET /service/:businessUnitKey/media-library` keep their paths. Both require authentication (E).
- Delete `controllers/file-controller.ts`, `controllers/file-controllers/*`, `routes/file.route.ts` and the
  legacy `POST /compile-upload` route (removed with the legacy API in spec C).
- Tests with mocked SDKs (`aws-sdk-client-mock`, Jest module mocks for GCS and Cloudinary) behind one shared
  provider contract suite, route tests with an in-memory provider, and an optional env-gated live check
  (emulators for GCS and S3 run locally in Docker; Cloudinary needs a real account).
- **BREAKING** (media-library response): `pagination` becomes `{ limit, nextCursor, hasMore }`; the query parameter
  `page` is removed. `puck-types`, `puck-api`, `puck-image-picker` (spec J) and the MCP `get_media_library` tool
  (spec M) must adapt. The upload response gains `key`, `name`, `size`, `contentType` next to `url`.
- **BREAKING** (config names): `STORAGE_TYPE`, `AWS_*`, `GCP_*`, `CLOUDINARY_*` become `MEDIA_STORAGE_PROVIDER`
  and `MEDIA_*`; the default provider is `none` (media endpoints answer 501, everything else works).

## Capabilities

### New Capabilities
- `media-storage-providers`: the provider interface, the three implementations, configuration keys and validation,
  the object path convention, URL model, connectivity check.
- `media-upload`: the authenticated upload endpoint, limits, MIME allowlist and sniffing, name sanitization, metadata.
- `media-library`: the authenticated library listing, extension filter, cursor pagination, response shape, isolation per business unit.

### Modified Capabilities
<!-- none: openspec/specs/ is empty -->

## Impact

- Code: new `service/src/media/**`, new `service/src/routes/media.route.ts`, edits to `service/src/routes/service.route.ts`
  (router registration) and `service/package.json` (dependencies); deletions listed above. Depends on specs D (config module,
  logger, `CustomError`/error middleware) and E (auth middleware).
- API: two routes keep their paths; media-library pagination changes shape (breaking, coordinated with J and M); one
  legacy route is removed.
- Configuration: a table of 15 `MEDIA_*` keys (standard vs secured) handed to spec H for `connect.yaml`.
- Dependencies: keep `@aws-sdk/client-s3`, `@google-cloud/storage`, `cloudinary`, `multer`; add dev dependency `aws-sdk-client-mock`.
- Operators: a public-read bucket (or CDN) is a documented prerequisite; nothing is created in the bucket by the service.
