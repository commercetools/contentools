## ADDED Requirements

### Requirement: Provider-neutral storage interface
The service SHALL access object storage only through a `StorageProvider` interface with the operations
`put`, `list`, `remove` and `checkConnectivity`, implemented once each for Google Cloud Storage (`gcp`),
Amazon S3 or an S3-compatible endpoint (`aws`) and Cloudinary (`cloudinary`). Route handlers and the media service
SHALL NOT import a storage SDK directly.

#### Scenario: Handler depends only on the interface
- **WHEN** the source of `service/src/routes/media.route.ts` and `service/src/media/media.service.ts` is inspected
- **THEN** neither imports `@google-cloud/storage`, `@aws-sdk/*` or `cloudinary`

#### Scenario: All providers pass the same contract suite
- **WHEN** the provider contract test suite runs against each of the three providers with its SDK mocked
- **THEN** every provider stores an object under the requested key, returns its public URL, lists only objects under the
  requested prefix, honours `limit` and the opaque cursor, and reports `remove` of a missing key as success

### Requirement: Provider selection and the default "none"
The service SHALL select the provider from the configuration key `MEDIA_STORAGE_PROVIDER` with the allowed values
`none`, `gcp`, `aws` and `cloudinary`; the default SHALL be `none`. Any other value SHALL make configuration loading fail.
With `none`, the service SHALL start normally and the two media endpoints SHALL answer `501` with the error code
`MEDIA_NOT_CONFIGURED`.

#### Scenario: Default configuration has no media
- **WHEN** the service starts with `MEDIA_STORAGE_PROVIDER` unset
- **THEN** the service starts, `GET /service/health` returns 200, and `POST /service/{businessUnitKey}/upload-file` with a valid token returns 501 with code `MEDIA_NOT_CONFIGURED`

#### Scenario: Unknown provider is rejected at startup
- **WHEN** the service starts with `MEDIA_STORAGE_PROVIDER=gcpcms`
- **THEN** configuration loading throws an error naming `MEDIA_STORAGE_PROVIDER` and the allowed values, and the process exits non-zero

### Requirement: Credentials are validated when a provider is selected
When `MEDIA_STORAGE_PROVIDER` is `gcp`, `aws` or `cloudinary`, configuration loading SHALL require every key that provider
needs and SHALL fail fast, listing the missing key NAMES (never values). Keys of providers that are not selected SHALL be ignored.
Credential values SHALL be declared in `securedConfiguration` (see the key table in design.md) and SHALL NOT appear in logs,
error responses or health output.

#### Scenario: Missing GCP key material
- **WHEN** `MEDIA_STORAGE_PROVIDER=gcp` and `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` is empty
- **THEN** configuration loading throws a `MediaConfigError` whose message contains `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` and does not contain any other configuration value

#### Scenario: Unselected provider keys are ignored
- **WHEN** `MEDIA_STORAGE_PROVIDER=aws` with all AWS keys set and the GCP keys empty
- **THEN** configuration loading succeeds and no GCP client is constructed

#### Scenario: GCP key is one base64 JSON value
- **WHEN** `MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64` is not valid base64 of a JSON object containing `client_email` and `private_key`
- **THEN** configuration loading throws a `MediaConfigError` that does not echo the value

### Requirement: Lazy provider construction
The provider SHALL be created on first use of a media endpoint (or by `postDeploy`), not when modules are imported,
and a single instance SHALL be reused for the life of the process.

#### Scenario: Importing the app does not build an SDK client
- **WHEN** the Express app module is imported with `MEDIA_STORAGE_PROVIDER=aws` and the S3 SDK mocked
- **THEN** no S3 client has been constructed until the first media request

### Requirement: Object path convention without project key
Every stored object key SHALL have the form `<MEDIA_PATH_PREFIX>/<businessUnitKey>/<reverseTimestamp>-<id>-<safeName>.<ext>`,
where `MEDIA_PATH_PREFIX` defaults to `contentools/media` and has no leading or trailing slash, `reverseTimestamp` is
`9999999999999 - Date.now()` zero-padded to 13 digits (so lexicographic listing returns the newest object first), `id` is
8 lowercase hexadecimal characters, `safeName` matches `[A-Za-z0-9._-]` with at most 80 characters, and `ext` is the canonical
extension of the sniffed content type. The key SHALL NOT contain a commercetools project key.

#### Scenario: Key shape
- **WHEN** a file named `Summer Sale (1).PNG` containing PNG bytes is stored for business unit `main-bu` at a fixed clock of `2026-01-01T00:00:00.000Z` with id `1a2b3c4d`
- **THEN** the key is `contentools/media/main-bu/8232774399999-1a2b3c4d-Summer-Sale-1.png` (9999999999999 minus 1767225600000)

#### Scenario: Business unit key is validated
- **WHEN** the business unit key in the URL is `..%2Fother` or `a/b` or longer than 256 characters or contains a character outside `[A-Za-z0-9_-]`
- **THEN** the service answers `400` with code `MEDIA_INVALID_BUSINESS_UNIT` and no provider call is made

#### Scenario: Prefix does not leak across business units
- **WHEN** business unit `a` and business unit `ab` each have one stored object and the library of `a` is listed
- **THEN** only the object of `a` is returned (the listing prefix ends with `/`)

### Requirement: Stable public URLs, no signed URLs
The URL returned for a stored object SHALL be a stable, non-expiring public URL: `MEDIA_PUBLIC_BASE_URL` plus the key when
that key is set, otherwise the provider's canonical public URL (`https://storage.googleapis.com/<bucket>/<key>` for GCS,
`https://<bucket>.s3.<region>.amazonaws.com/<key>` for AWS (or `<MEDIA_AWS_ENDPOINT>/<bucket>/<key>` when an endpoint is
configured), and the `secure_url` for Cloudinary). The service SHALL NOT set per-object ACLs, and SHALL NOT mint signed
or expiring URLs.

#### Scenario: Public base URL override
- **WHEN** `MEDIA_PUBLIC_BASE_URL=https://cdn.example.com/assets/` and an object with key `contentools/media/bu1/x.png` is stored
- **THEN** the returned URL is exactly `https://cdn.example.com/assets/contentools/media/bu1/x.png`

#### Scenario: No object ACL is requested
- **WHEN** the GCS and S3 providers store an object in their mocked SDKs
- **THEN** the GCS save options do not contain `public: true` and the S3 `PutObjectCommand` input does not contain `ACL`

### Requirement: Connectivity check for deploy time
Each provider SHALL implement `checkConnectivity()` that performs one cheap read-only call (GCS: list one object under the
prefix; S3: `HeadBucket`; Cloudinary: `api.ping()`), resolves on success and rejects with `StorageUnavailableError` carrying
only a provider name and a sanitized reason otherwise. spec H's `postDeploy` calls it.

#### Scenario: Bad credentials surface as a sanitized error
- **WHEN** the mocked S3 client rejects `HeadBucket` with an `AccessDenied` error
- **THEN** `checkConnectivity()` rejects with `StorageUnavailableError` whose message contains `aws` and `AccessDenied` and contains neither the access key id nor the secret

### Requirement: Legacy file code is removed
The files `controllers/file-controller.ts`, `controllers/file-controllers/aws-file-controller.ts`,
`controllers/file-controllers/gcp-file-controller.ts`, `controllers/file-controllers/cloudinary-file-controller.ts`,
`routes/file.route.ts` (including their parked copies under `src/_pending/`) and the route `POST /compile-upload` SHALL NOT exist in the target tree, and no media file SHALL remain in `src/_pending/`.

#### Scenario: Removed route
- **WHEN** an authenticated client calls `POST /service/compile-upload`
- **THEN** the service answers `404`
