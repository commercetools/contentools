## ADDED Requirements

### Requirement: Authenticated upload endpoint
The service SHALL expose `POST /service/{businessUnitKey}/upload-file` accepting `multipart/form-data` with one file part
named `file` and optional text fields `title` and `description`. The endpoint SHALL require authentication using the
auth middleware defined by spec E (a mutation: Merchant Center session token or the service token) and SHALL NOT read an
`x-project-key` header. On success it SHALL answer `200` with JSON `{ url, key, name, size, contentType }`.

#### Scenario: Successful upload
- **WHEN** an authenticated client posts a 1x1 PNG as `file` to `/service/main-bu/upload-file` with `title=Logo`
- **THEN** the response is 200 with `url` pointing at the stored object, `key` starting with `contentools/media/main-bu/`, `contentType` `image/png`, `size` equal to the byte length, and the provider received the title as metadata

#### Scenario: Missing or invalid token
- **WHEN** the request has no `Authorization` header, or an invalid token
- **THEN** the response is 401 and the provider is not called

#### Scenario: No file part
- **WHEN** the multipart body contains no `file` part
- **THEN** the response is 400 with code `MEDIA_FILE_REQUIRED`

### Requirement: Upload size and part limits
The service SHALL configure multer with in-memory storage and the limits `fileSize = MEDIA_MAX_UPLOAD_BYTES`
(default 10485760, maximum accepted configuration value 26214400), `files = 1`, `fields = 4`, `fieldSize = 4096` and
`parts = 6`. A violation SHALL produce an error response and SHALL NOT call the provider. The title SHALL be at most 200
characters and the description at most 2000 characters.

#### Scenario: File over the limit
- **WHEN** `MEDIA_MAX_UPLOAD_BYTES=1024` and a 2048 byte PNG is uploaded
- **THEN** the response is 413 with code `MEDIA_FILE_TOO_LARGE` and the provider is not called

#### Scenario: Two files
- **WHEN** the multipart body contains two parts named `file`
- **THEN** the response is 400 with code `MEDIA_FILE_COUNT_EXCEEDED`

#### Scenario: Configuration ceiling
- **WHEN** `MEDIA_MAX_UPLOAD_BYTES=104857600`
- **THEN** configuration loading fails with a `MediaConfigError` naming `MEDIA_MAX_UPLOAD_BYTES` and the maximum 26214400

#### Scenario: Oversized metadata
- **WHEN** `title` is 201 characters
- **THEN** the response is 400 with code `MEDIA_INVALID_METADATA`

### Requirement: Content type allowlist with sniffing
The service SHALL accept only content types listed in `MEDIA_ALLOWED_MIME_TYPES` (default
`image/jpeg,image/png,image/gif,image/webp,image/avif,application/pdf`). It SHALL reject a file whose declared content type is not
allowed (`415`, code `MEDIA_TYPE_NOT_ALLOWED`) before buffering the body where the multipart parser allows, and SHALL also
inspect the first bytes of the file: when the sniffed type is unknown or differs from the declared type the response SHALL be
`415` with code `MEDIA_TYPE_MISMATCH`. `image/svg+xml` SHALL be accepted only when explicitly listed in the allowlist, and
the stored object SHALL carry the sniffed type, never the client's.

#### Scenario: Disallowed type
- **WHEN** a file declared `text/html` is uploaded
- **THEN** the response is 415 with code `MEDIA_TYPE_NOT_ALLOWED`

#### Scenario: Extension lies about content
- **WHEN** a file named `photo.png` declared `image/png` actually starts with `<html>`
- **THEN** the response is 415 with code `MEDIA_TYPE_MISMATCH`

#### Scenario: SVG is off by default
- **WHEN** an `image/svg+xml` file is uploaded with the default allowlist
- **THEN** the response is 415 with code `MEDIA_TYPE_NOT_ALLOWED`

#### Scenario: Allowlist is configurable
- **WHEN** `MEDIA_ALLOWED_MIME_TYPES=image/png` and a JPEG is uploaded
- **THEN** the response is 415 with code `MEDIA_TYPE_NOT_ALLOWED`

### Requirement: File name sanitization
The stored name SHALL be derived from the client file name by taking the base name (dropping any directory part), Unicode
normalizing to NFKD, replacing every run of characters outside `[A-Za-z0-9._-]` by one `-`, trimming leading and trailing
`-` and `.`, truncating the stem to 80 characters, and falling back to `file` when the result is empty. The original name SHALL
NOT be used in the key and SHALL NOT be logged.

#### Scenario: Path traversal in the name
- **WHEN** the client file name is `../../etc/passwd.png`
- **THEN** the stored key's last segment ends with `-passwd.png` and the key contains no `..` segment

#### Scenario: Non-Latin name
- **WHEN** the client file name is `日本語.png` (only non-Latin characters)
- **THEN** the stored name stem is `file`

### Requirement: Metadata is stored safely per provider
`title` and `description` SHALL be stored as provider metadata without altering the provider's own control fields: for S3 the values SHALL be
percent-encoded with `encodeURIComponent` (US-ASCII only) and decoded on read, for Cloudinary they SHALL be passed as a `context`
object so the SDK escapes `|` and `=`, and for GCS as custom metadata.

#### Scenario: Special characters in a Cloudinary title
- **WHEN** `title` is `a|b=c`
- **THEN** the Cloudinary upload receives `context: { title: 'a|b=c' }` (an object, not a concatenated string)

#### Scenario: Non-ASCII S3 title
- **WHEN** `title` is `Café` and the provider is `aws`
- **THEN** the S3 `Metadata.title` is `Caf%C3%A9` and a later listing returns the title `Café`

### Requirement: Error body contract
Every error response of the media endpoints SHALL use the service error contract `{ message, statusCode, correlationId, code }` with `code` one of the `MEDIA_*` codes named in these specs.

#### Scenario: Body shape
- **WHEN** an oversized file is uploaded
- **THEN** the body has `message`, `statusCode` 413, a `correlationId` equal to the `X-Correlation-ID` response header, and `code` `MEDIA_FILE_TOO_LARGE`

### Requirement: Failure mapping and error hygiene
A provider failure during upload SHALL map to `502` with code `MEDIA_STORAGE_UNAVAILABLE` and a generic message. The response
SHALL NOT contain SDK error text, bucket names, credentials or stack traces; the full error SHALL be logged once with the
request correlation id (spec H).

#### Scenario: Bucket unavailable
- **WHEN** the mocked provider rejects `put` with an error whose message contains the bucket name
- **THEN** the response is 502 with code `MEDIA_STORAGE_UNAVAILABLE` and the body does not contain the bucket name
