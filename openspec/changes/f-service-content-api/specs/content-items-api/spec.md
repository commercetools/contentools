## ADDED Requirements

### Requirement: Create, read, update, delete content items
The service SHALL implement the same 13 route shapes as pages for `puck-contents` with container `puck-content`, keys `puck-content-<uuid v4>`, create body `{value:{name, contentType, data?, meta?}}` (`400 name is required`, `400 contentType is required`; `data` defaults `{}`), update of `name, contentType, data, meta`, list with optional `?contentType=` filter, published read (public), preview read (protected), queries on `contentType`, `name`, `key` with the same grammar as pages, and `204` delete that also removes states and versions. Reads of content items SHALL NOT resolve datasources.

#### Scenario: Filter by content type
- **WHEN** content items of types `hero` and `faq` exist and `GET /service/default/puck-contents?contentType=hero` is called
- **THEN** only `hero` items are returned

#### Scenario: Query by content type
- **WHEN** `{"query":"contentType = \"hero\""}` is posted to `/service/default/published/puck-contents/query`
- **THEN** the published value of the first `hero` item is returned, `404` if none is published

#### Scenario: Business unit mismatch
- **WHEN** an item of business unit `a` is requested through business unit `b`
- **THEN** the response is `404`
