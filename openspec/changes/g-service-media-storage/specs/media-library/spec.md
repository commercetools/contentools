## ADDED Requirements

### Requirement: Authenticated, business-unit-scoped listing
The service SHALL expose `GET /service/{businessUnitKey}/media-library` that lists only objects stored under
`<MEDIA_PATH_PREFIX>/<businessUnitKey>/`. The endpoint SHALL require authentication (spec E): a bucket listing is not
published content, so it is not part of the public read surface. It SHALL NOT read an `x-project-key` header.

#### Scenario: Unauthenticated listing is refused
- **WHEN** `GET /service/main-bu/media-library` is called without a token
- **THEN** the response is 401 and the provider is not called

#### Scenario: Isolation between business units
- **WHEN** business unit `a` has 3 stored objects and business unit `b` has 2, and the library of `b` is requested
- **THEN** exactly the 2 objects of `b` are returned

### Requirement: Cursor pagination
The listing SHALL accept `limit` (integer, default 20, clamped to the range 1..100; non-numeric input falls back to 20) and
`cursor` (opaque string). It SHALL respond with `{ files, pagination: { limit, nextCursor, hasMore } }` where `nextCursor` is
`null` and `hasMore` is `false` when there is no further page. The service SHALL page through the provider's native cursor
(GCS `pageToken`, S3 `ContinuationToken`, Cloudinary `next_cursor`), SHALL NOT load the whole prefix into memory, and SHALL NOT
return `totalItems` or `totalPages`. A cursor SHALL be bound to the business unit and extension filter it was issued for.

#### Scenario: Walk all pages
- **WHEN** 45 objects exist and the client requests `limit=20`, then follows `nextCursor` until `hasMore` is false
- **THEN** the client receives pages of 20, 20 and 5 objects, every object exactly once, newest first

#### Scenario: Limit clamping
- **WHEN** `limit=100000` is requested
- **THEN** the provider is asked for at most 100 objects and `pagination.limit` is 100

#### Scenario: Tampered cursor
- **WHEN** the client sends a `cursor` that is not valid base64url JSON, or was issued for another business unit
- **THEN** the response is 400 with code `MEDIA_INVALID_CURSOR` and the provider is not called

### Requirement: Extension filter
The listing SHALL accept `extensions` as a comma-separated list of 1 to 20 entries, each matching `[A-Za-z0-9]{1,10}` (a leading
dot is tolerated and stripped), compared case-insensitively against the object's extension. An invalid entry SHALL give `400`
with code `MEDIA_INVALID_EXTENSIONS`. When a filter is active the service MAY scan up to 5 provider pages to fill one response
page; the response then reports `hasMore: true` with a `nextCursor` if more objects may remain, even when fewer than `limit`
files were returned.

#### Scenario: Images only
- **WHEN** `extensions=jpg,png` is requested and the prefix holds `a.png`, `b.pdf`, `c.jpg`
- **THEN** the response contains `c.jpg` and `a.png` and not `b.pdf`

#### Scenario: Invalid extension
- **WHEN** `extensions=png,../x`
- **THEN** the response is 400 with code `MEDIA_INVALID_EXTENSIONS`

### Requirement: Response shape
Each returned file SHALL contain `url`, `key`, `name` (the last key segment), `isImage` (true when the content type or extension is
`jpg`, `jpeg`, `png`, `gif`, `webp`, `avif` or `svg`), and, when the provider knows them, `title`, `description`, `createdAt`
(ISO 8601 string), `size` (bytes) and `contentType`. Titles and descriptions SHALL be returned in decoded form.

#### Scenario: Metadata is returned without extra calls for GCS and Cloudinary
- **WHEN** the GCS provider lists a page of 20 objects, or the Cloudinary provider lists a page of 20 resources
- **THEN** the mocked SDK sees exactly one list call and no per-object metadata or `api.resource` call

#### Scenario: S3 metadata uses HeadObject, never GetObject
- **WHEN** the S3 provider lists a page of 20 objects
- **THEN** the mock sees one `ListObjectsV2Command` and at most 20 `HeadObjectCommand`, and no `GetObjectCommand`, and a failing `HeadObject` for one key still returns that file without title and description

### Requirement: Provider failures are mapped
A provider failure while listing SHALL map to `502` with code `MEDIA_STORAGE_UNAVAILABLE` and a generic message.

#### Scenario: Listing fails
- **WHEN** the mocked provider rejects `list`
- **THEN** the response is 502 with code `MEDIA_STORAGE_UNAVAILABLE` and no SDK message in the body
