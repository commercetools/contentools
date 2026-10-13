## ADDED Requirements

### Requirement: Configuration slices
For each slice `theme`, `header`, `facet`, `footer`, `site-metadata`, `category-listing`, `translations`, `b2b-account-menu-links` the service SHALL implement `GET /:bu/configuration/<slice>` (public; `200` with the stored value or JSON `null`), `POST` (protected, `201`), `PUT` (protected, `200`) and `DELETE` (protected, `204`), storing the request body field `value` in container `configuration`, key `<bu>-<slice>`. POST and PUT SHALL both upsert. A missing `value` (undefined or null) SHALL answer `400 value is required in request body`. DELETE of a missing slice SHALL answer `204`.

#### Scenario: Round trip
- **WHEN** `PUT /service/default/configuration/theme` with `{value:{colors:{primary:"#000"}}}` then `GET` anonymously
- **THEN** the PUT answers `200` and the GET returns `{colors:{primary:"#000"}}`

#### Scenario: Missing slice
- **WHEN** nothing is stored and `GET .../configuration/header` is called
- **THEN** the response is `200` with body `null`

#### Scenario: Missing value
- **WHEN** `POST .../configuration/footer` has body `{}`
- **THEN** the response is `400`

### Requirement: Default business-unit fallback
A slice read (single or aggregate) for a business unit other than `default` that has no stored value SHALL return the value stored for business unit `default`, slice by slice.

#### Scenario: Fallback
- **WHEN** only `default-theme` exists and `GET /service/b2b-eu/configuration/theme` is called
- **THEN** the default theme is returned

#### Scenario: Own value wins
- **WHEN** both `default-theme` and `b2b-eu-theme` exist
- **THEN** the `b2b-eu` value is returned for `b2b-eu`

### Requirement: Aggregate configuration
`GET /:bu/configuration` and `GET /:bu/configurations` (public) SHALL return `{theme, header, facetConfiguration, footer, siteMetadata, categoryListing, translations, contentoolsBaseUrl, b2bAccountMenuLinks}` with `null` for absent slices, using one commercetools query per business unit (plus one for `default` when needed). `contentoolsBaseUrl` SHALL be read from key `<bu>-contentools-base-url` when it holds a string.

#### Scenario: Partial aggregate
- **WHEN** only theme and footer are stored for `default`
- **THEN** the aggregate has those two values and `null` for the other seven keys
