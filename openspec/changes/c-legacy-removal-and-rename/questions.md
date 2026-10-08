# Questions raised by C

| ID | Question | Recommended default (C proceeds on it) |
| -- | -------- | -------------------------------------- |
| Q-C1 | Env var that carries the service URL into the MC app (old `CMS_API_URL`; applied by K). | `CONTENTOOLS_SERVICE_URL` (analogy with the sibling repo's `SEARCH_CONFIG_SERVICE_URL`); K reads it, L fills it from the Connect service URL. |
| Q-C2 | `GET /datasource` and `GET /:bu/media-library` are public reads today (only `x-project-key`). Public or protected in the single-tenant auth model? | Decided in E; C does not touch auth. Suggest: datasource list protected, media-library protected (editor-only). |
| Q-C3 | Datasources are stored in Firestore (`projects/<pk>/datasources`); with Firestore gone D must store them as custom objects. Container name? | `datasource` (env `DATASOURCE_CONTAINER`). Cross-spec note for D and F. |
| Q-C4 | `service/postman/*` not copied (A Q-A2) and `service/README.md` replaced by a stub; P writes the API reference from the final route table. | Accept. |
| Q-C5 | `uuid` and other possibly unused service dependencies are left for D's dependency pass. | Accept. |
