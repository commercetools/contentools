## ADDED Requirements

### Requirement: Datasource definitions stored as custom objects
The service SHALL store datasource definitions as custom objects in container `datasource`, key = datasource key (validated like path keys), value = the posted `value`. The service SHALL NOT use Firestore or any other store. Routes (all protected): `GET /datasource` (list; `[{key, value}]`, built-ins first marked `builtIn: true` inside `value`), `GET /datasource/:key` (`200 {key, value}` / `404`), `POST /datasource/:key` (create, `201 {key, value}`, `409` when it exists or is a built-in key), `PUT /datasource/:key` (upsert, `200 {key, value}`, `409` for a built-in key), `DELETE /datasource/:key` (`204`, idempotent; `409` for a built-in key).

#### Scenario: Built-ins always present
- **WHEN** nothing is stored and `GET /service/datasource` is called
- **THEN** the list contains `product-by-sku` and `products-by-sku`

#### Scenario: Create twice
- **WHEN** `POST /service/datasource/stock-levels` is sent twice
- **THEN** the first answer is `201`, the second `409`

#### Scenario: No Firestore
- **WHEN** the source tree is searched for `firestore`
- **THEN** there is no match

### Requirement: Resolution and test endpoint
`POST /datasource/:key/test` with body `{params}` SHALL resolve built-in datasources: `product-by-sku` (param `sku`, returns the product projection of the first match or nothing) and `products-by-sku` (param `skus`, comma-separated, at most 25 SKUs; more answers `400`), using the Product Search API. For a stored non-built-in key the response SHALL be `501` `{"message":"Datasource has no resolver"}`; for an unknown key `404`. The route is protected except for built-in keys when `PUBLIC_DATASOURCE_RESOLVE=true` (spec E). Resolution errors during page reads SHALL NOT fail the page read (result `null`).

#### Scenario: Resolve one SKU
- **WHEN** `POST /service/datasource/product-by-sku/test` with `{"params":{"sku":"SKU-1"}}` and the search returns a product
- **THEN** the response is `200` with that projection

#### Scenario: Too many SKUs
- **WHEN** `products-by-sku` receives 26 SKUs
- **THEN** the response is `400`

#### Scenario: Stored datasource without resolver
- **WHEN** a custom datasource `stock-levels` is stored and its `/test` is called
- **THEN** the response is `501`
