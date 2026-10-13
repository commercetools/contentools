## ADDED Requirements

### Requirement: Route inventory and access split
The service SHALL expose exactly the routes listed in design.md section 2 (73 routes under `/service`, excluding media which belongs to spec G), with the access (public or protected) defined by spec E. Public routers SHALL be registered before the authentication gate and protected routers after it.

#### Scenario: Inventory matches
- **WHEN** the Express router tree is walked
- **THEN** the set of (method, path, access) equals the table in design.md section 2 and no other route exists

#### Scenario: Every protected route rejects anonymous callers
- **WHEN** each protected route of the table is called without credentials
- **THEN** every response is `401`

### Requirement: Business-unit scoping
Content, templates and configuration SHALL be scoped by the `:businessUnitKey` path segment, which is a content partition (not an access-control boundary). The service SHALL NOT call the commercetools Business Unit API.

#### Scenario: Two business units are isolated
- **WHEN** a page is created in business unit `b2b-eu` and listed in business unit `b2c-us`
- **THEN** the list for `b2c-us` does not contain it

#### Scenario: Wrong business unit on a keyed read
- **WHEN** `GET /service/b2c-us/puck-pages/<key of a page of b2b-eu>` is called
- **THEN** the response is `404`

### Requirement: Path parameter validation
Every `:businessUnitKey` and `:key` path parameter SHALL match `^[A-Za-z0-9_.~-]{1,128}$`; otherwise the response SHALL be `400` `{"message":"Invalid <name>"}` before any commercetools call.

#### Scenario: Hostile key
- **WHEN** `GET /service/default/puck-pages/x%22%20OR%20key%20%3D%20%22y` is called with a valid credential
- **THEN** the response is `400` and no request reaches commercetools

### Requirement: Complete lists and escaped predicates
List operations SHALL return all matching objects (not only the first 20) and every commercetools predicate SHALL be assembled with the escaping helpers of the core.

#### Scenario: More than 20 pages
- **WHEN** a business unit has 45 pages
- **THEN** `GET /service/<bu>/puck-pages` returns 45 entries

### Requirement: Request body validation
Bodies SHALL be validated (zod) and rejected with `400` and a message naming the field. Source messages SHALL be preserved where they existed (`value is required in request body`, `name is required`, `slug is required`, `contentType is required`, `kind must be "page" or "content"`, `query is required in request body`).

#### Scenario: Missing value
- **WHEN** `POST /service/default/puck-pages` is sent with body `{}`
- **THEN** the response is `400` with message `value is required in request body`
