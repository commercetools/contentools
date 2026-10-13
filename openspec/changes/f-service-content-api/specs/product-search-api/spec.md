## ADDED Requirements

### Requirement: Product search for the picker
`GET /products/search?text=&limit=&locale=` (protected; `q` accepted as alias of `text`) SHALL return `[{id, name?, sku?, image?, slug?}]`. Empty or blank text SHALL return `[]` without calling commercetools. `limit` defaults to 20 and is capped at 50; `locale` defaults to `en-US`. The query SHALL be a Product Search API `or` of case-insensitive wildcard matches on `name` and `description` (language = locale) and `variants.sku`, after removing `*` and `?` from the text. Names and slugs SHALL be localised with the fallback locale, language part, first available.

#### Scenario: Slim result
- **WHEN** the search returns one product projection with name `{"en-US":"Shoe"}`, master SKU `S-1`, one image and slug
- **THEN** the response is `[{"id":"...","name":"Shoe","sku":"S-1","image":"<url>","slug":"..."}]`

#### Scenario: Wildcard injection
- **WHEN** `text=a*b?` is sent
- **THEN** the search request contains the value `*ab*`

#### Scenario: Limit cap
- **WHEN** `limit=500`
- **THEN** the search request has `limit: 50`

#### Scenario: Search not enabled
- **WHEN** commercetools answers 400 because Product Search is not activated
- **THEN** the service answers `502` with message `Product search is not available for this project` (not 500)
