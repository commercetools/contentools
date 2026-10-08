# Contentools service: live sandbox e2e

Opt-in tests that run the service logic against a REAL commercetools sandbox project. They are skipped unless every
variable below is set, and they refuse to run unless the project is explicitly allow-listed.

**Never use a production project.** Use a throw-away sandbox only.

## Variables

| Variable | Meaning |
| -------- | ------- |
| `E2E_CTP_PROJECT_KEY` | sandbox project key |
| `E2E_CTP_CLIENT_ID` | API client id (scopes: `manage_key_value_documents`, `view_products`) |
| `E2E_CTP_CLIENT_SECRET` | API client secret (never printed, never committed) |
| `E2E_CTP_REGION` | cloud identifier, e.g. `europe-west1.gcp` |
| `E2E_CTP_SCOPE` | scope string for the client |
| `E2E_BUSINESS_UNIT_KEY` | business unit key used by tests |
| `E2E_ALLOW_PROJECT_KEY` | MUST equal `E2E_CTP_PROJECT_KEY`, else the run aborts (`refusing to run`) |

Optional: `E2E_CTP_API_URL`, `E2E_CTP_AUTH_URL` (override hosts derived from the region), `E2E_RUN_ID`
(default: time based), `E2E_ENV_FILE` (absolute path of an env file kept outside the repo).

Put them in `service/.env.e2e` or `service/.env.e2e.local` (both git-ignored) or export them.

## Isolation and cleanup

* Every run gets its own containers `contentools-test-<runId>-<name>`; `env-setup.ts` points the container env vars there.
* `afterAll` deletes everything in the run's containers.
* If a run was killed, sweep leftovers: `node tools/sandbox-sweep.mjs` (repo root) deletes every custom object whose
  container starts with `contentools-test-` and prints `deleted N`.

## Running

```bash
cd service
yarn test:e2e          # skipped (exit 0) when the variables are unset
```

The legacy black-box suites still in this folder are not selected by `jest.config.js`; they are removed or rewritten by
the legacy-removal and content-API specs.
