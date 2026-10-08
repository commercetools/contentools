# Questions raised by B

| ID | Question | Recommended default |
| -- | -------- | ------------------- |
| Q-B1 | `CTP_API_URL` and `CTP_AUTH_URL` are injected by Connect together with the API client (confirmed by the coordinator; skill security.md:86); D reads them from env (no region derivation needed). B relies on this so tests and the browser stack can point at the fake CT; before D lands, B's integration tests that need the CT client are expected to fail, which is the signal. | Settled: injected, read from env. |
| Q-B2 | vitest for `puck/` and `mcp/` (jest for `service/`, `admin-app/`). | Yes. |
| Q-B3 | D/F keep the container-name env overrides (`PUCK_PAGE_CONTAINER`, ... `CONFIGURATION_CONTAINER`, `CONTENT_TYPE_CONTAINER`) so e2e can namespace data. | Keep. |
| Q-B4 | Cross-spec: `plans/03-testing-strategy.md` lists `yarn test|test:e2e|verify|gate`; B/A implement them as root `yarn` scripts (root has no deps), and per-app scripts run with Yarn (owner decision). | Accept. |
