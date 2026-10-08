## ADDED Requirements

### Requirement: Templates
The service SHALL implement (all protected): `GET /:bu/puck-templates` (optional `?kind=page|content`; any other `kind` value means no filter), `GET /:bu/puck-templates/:key`, `POST /:bu/puck-templates` (body `{value:{name, kind, puckData?}}`, `201`, key `puck-template-<uuid v4>`, container `puck-template`, default `puckData` `{content: [], root:{props:{}}}`), `DELETE /:bu/puck-templates/:key` (`204`). Templates SHALL have no states and no versions. Keyed reads and deletes SHALL answer `404` for templates of another business unit.

#### Scenario: Filter by kind
- **WHEN** a page template and a content template exist and `?kind=page` is requested
- **THEN** only the page template is returned

#### Scenario: Validation
- **WHEN** `POST` has `kind: "banner"` or no `name`
- **THEN** the response is `400` (`kind must be "page" or "content"`, `name is required`)

#### Scenario: Delete
- **WHEN** a template is deleted twice
- **THEN** the first answer is `204`, the second `404`
