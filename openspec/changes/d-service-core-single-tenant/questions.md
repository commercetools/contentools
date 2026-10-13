# Questions raised by d-service-core-single-tenant

| ID | Question | Recommended default (assumed) | Affects |
| -- | -------- | ----------------------------- | ------- |
| Q-D1 | The brief lists `CTP_REGION` among Connect-injected variables. Connect docs (connect/modify-connector) say the generated API client injects `CTP_API_URL, CTP_AUTH_URL, CTP_CLIENT_ID, CTP_PROJECT_KEY, CTP_CLIENT_SECRET, CTP_SCOPE` and no region. OK to use the URLs and not require `CTP_REGION`? | Yes. No `CTP_REGION` anywhere; E derives the Merchant Center cloud identifier from `CTP_API_URL`. | D, E, H |
| Q-D2 | `ts-client@^4` / `platform-sdk@^8` are one major behind npm latest (5 / 9). Stay on the Connect-checklist versions? | Stay on ^4 / ^8. | D, F, H |
| Q-D3 | Container names are now fixed constants plus one optional `CONTAINER_PREFIX` (source allowed ~20 individual env overrides). OK? | Yes (smaller Connect install contract; data compatible). | D, H |
| Q-D4 | CLOSED by the owner: Yarn for everything (`service` = Yarn 1 classic with committed `yarn.lock`, `yarn install --frozen-lockfile`; `puck/` stays Yarn 4). | Yarn 1 in Connect apps. | A, D, H |
| Q-D5 | Coordinator assigned the correlation-id and access-log layers to spec H; D's runtime acceptance criteria (error body `correlationId`, bodies never logged) need them. D creates them at `src/observability/{request-context,log-format,access-log}.ts` (H's names). H group 3 should then be verification only. Agree? | Yes. | D, H |
