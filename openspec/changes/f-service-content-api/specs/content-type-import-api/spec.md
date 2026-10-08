## ADDED Requirements

### Requirement: Import default content types
`POST /:bu/content-type/import` and `POST /content-type/import` (protected, same handler) SHALL upsert the 27 bundled sample content types into container `content-type` with key = kebab-case of `metadata.type` and value `{key, metadata, code:{componentName, transpiledCode (base64), text (base64)}}`, and answer `200` `{imported: string[], failed: [{key, error}]}`. A failing sample SHALL be reported in `failed` and SHALL NOT stop the others. The transpiler SHALL reject sources containing dangerous patterns (eval, Function constructor, document.write/createElement, innerHTML/outerHTML assignment, window., global., process., require/import calls, `__dirname`/`__filename`) and sources over 50000 characters, independent of how often it has been called before.

#### Scenario: Both paths
- **WHEN** either path is called with a credential
- **THEN** the response is `200` with `imported.length = 27` and `failed = []`

#### Scenario: Idempotent
- **WHEN** the import is run twice
- **THEN** the container still has 27 objects and the second response is identical

#### Scenario: Unsafe sample
- **WHEN** a source containing `eval(` is transpiled repeatedly (three times in a row)
- **THEN** it is rejected every time

#### Scenario: Anonymous
- **WHEN** the import is called without credentials
- **THEN** the response is `401`
