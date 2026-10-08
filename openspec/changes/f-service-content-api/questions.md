# Questions raised by f-service-content-api

| ID | Question | Recommended default (assumed) | Affects |
| -- | -------- | ----------------------------- | ------- |
| Q-F1 | Datasource definitions move from Firestore to custom objects (container `datasource`). Only the two built-in datasources have a resolver; stored custom definitions are metadata. Is that acceptable, or should custom datasources get a generic resolver (for example an HTTP URL template)? | Keep as is (parity with the source); `/test` of a stored custom key answers 501. | F, J, M |
| Q-F2 | Content-type import transpiles with `@babel/standalone` at request time (large dependency). Pre-transpile at build time and ship JSON instead? | Keep runtime transpile for 1.0 (data flow unchanged); revisit later. | F |
| Q-F3 | Each version entry stores the full page data times `MAX_VERSIONS` inside ONE custom object; the size limit of a custom object value is not stated in the sources consulted. Verify on the sandbox (task 12.2: 900 KB page, 6 saves) and, if a limit is hit, store one custom object per version instead? | Keep one object per item; decide after the live check. | F |
| Q-F4 | `GET /:bu/puck-templates*` and the list/detail/states/versions reads are protected now (they were project-key public). OK for all current clients (editor, MCP, storefront)? | Yes; storefronts use only published reads and configuration. | E, F, M |
| Q-F5 | Duplicate datasource create returns `409` (source: `400 {error}`); datasource errors use the uniform `{message,...}` body. OK? | Yes. | F, J |
| Q-F6 | The editor's content-type import call path (`/:bu/content-type/import`) never existed on the server; both paths are served now. Should `puck-api` keep the BU in the path? | Keep (no client change needed). | F, J |
