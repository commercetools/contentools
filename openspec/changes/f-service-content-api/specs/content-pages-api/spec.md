## ADDED Requirements

### Requirement: Create, read, update, delete pages
The service SHALL implement `GET /:bu/puck-pages` (list with states), `GET /:bu/puck-pages/:key` (page with states), `POST /:bu/puck-pages` (body `{value:{name, slug, puckData?, meta?}}`, `201`), `PUT /:bu/puck-pages/:key` (partial update of `name, slug, puckData, meta`, `200`) and `DELETE /:bu/puck-pages/:key` (`204`; removes the page, its states object and its versions object; `404` when the page does not exist). Page keys SHALL be `puck-page-<uuid v4>` in container `puck-page`. A new page without `puckData` SHALL get `{content: [], root: {props: {}}}`. Unknown fields in `value` SHALL be ignored on update; `key`, `businessUnitKey` and `createdAt` SHALL NOT be client-settable.

#### Scenario: Create
- **WHEN** an authorised client posts `{value:{name:"Home", slug:"/home"}}` to `/service/default/puck-pages`
- **THEN** the response is `201`, the body is the custom object with `key` starting `puck-page-` and `value.businessUnitKey = "default"`, a draft state and one version entry exist

#### Scenario: Update cannot rewrite identity
- **WHEN** `PUT` sends `{value:{name:"X", createdAt:"1999-01-01T00:00:00.000Z", key:"other"}}`
- **THEN** the stored `createdAt` and `key` are unchanged and `name` is `X`, `updatedAt` is refreshed

#### Scenario: Delete cleans up
- **WHEN** a page with states and versions is deleted
- **THEN** the page, `default_<key>` state and `default_<key>` version objects no longer exist and a second `DELETE` answers `404`

#### Scenario: Validation
- **WHEN** `POST` omits `name` or `slug`
- **THEN** the response is `400` with `name is required` / `slug is required`

### Requirement: Published and preview reads
`GET /:bu/published/puck-pages/:key` (public) SHALL return the published value, `404` `Published puck page not found` when the page has no published state. `GET /:bu/preview/puck-pages/:key` (protected) SHALL return the draft value, else the published value, `404` `Puck page not found` when neither exists. Both SHALL resolve datasource props (see datasource-api) and add `resolvedData` next to the original value.

#### Scenario: Unpublished page
- **WHEN** a page was created but never published and `GET published/puck-pages/:key` is called anonymously
- **THEN** the response is `404`; the preview read with a credential returns `200` with the draft

#### Scenario: Datasource resolved on read
- **WHEN** a published page has a component prop `{type:"product-by-sku", skus:["SKU-1"]}`
- **THEN** the response prop is `{type, skus, resolvedData: <product projection>}`; if resolution fails the prop has `resolvedData: null` and the read still succeeds

### Requirement: Slug query
`POST /:bu/published/puck-pages/query` (public) and `POST /:bu/preview/puck-pages/query` (protected) SHALL accept `{query: string}` where the query is a conjunction (`AND`) of equality clauses `field = "text"` with `field` in `slug`, `name`, `key`; other shapes SHALL be rejected with `400 Invalid query`. A missing `query` SHALL be `400 query is required in request body`. The first matching page of the business unit is looked up and its published (or draft-then-published for preview) value returned; `404` when none.

#### Scenario: Query by slug
- **WHEN** `{"query":"slug = \"/home\""}` is posted to the published query route and a published page has slug `/home`
- **THEN** the response is `200` with that page value

#### Scenario: Predicate injection refused
- **WHEN** the query is `slug = "/a" OR key exists` or `slug = "x\" OR name = \"y"`
- **THEN** the response is `400` (or a safely escaped literal match returning `404`), never a broader result

### Requirement: List with states
`GET /:bu/puck-pages` SHALL return every page of the business unit with a `states` object (`{}` when none), using one state lookup per business unit (not one predicate clause per page).

#### Scenario: 45 pages with states
- **WHEN** 45 pages exist, 3 of them published
- **THEN** the response has 45 entries and exactly those 3 carry `states.published`
