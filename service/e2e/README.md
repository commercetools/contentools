# E2E Tests for CMS Service

End-to-end tests run against the CMS service HTTP API. They are specified from **route names/descriptions** (not implementation) and include happy and unhappy paths. Each test cleans up created data via DELETE endpoints.

## Running locally

1. **Start the service** (one of):
   - From repo root: `cd service && yarn build && yarn start`
   - Or with Docker: `docker-compose -f service/docker-compose.e2e.yml --env-file service/.env up -d` (then wait for the service to be ready)

2. **Set env** (e.g. in `service/.env` or export). Prefer **E2E_**-prefixed names; non-prefixed are still read for backward compatibility:
   - `E2E_BASE_URL` (or `BASE_URL`) – default `http://localhost:8080`
   - `E2E_BUSINESS_UNIT_KEY` (or `BUSINESS_UNIT_KEY`) – tenant for path params
   - `E2E_CTP_PROJECT_KEY`, `E2E_CTP_CLIENT_ID`, `E2E_CTP_CLIENT_SECRET` (or `CTP_*`) – for JWT via `POST /service/authenticate-project`

3. **Run tests**:
   ```bash
   cd service && yarn test:e2e
   ```

## CI (GitHub Actions)

The workflow in `.github/workflows/e2e.yml` builds the service Docker image, starts the container with env from secrets/vars, waits for the service to respond, then runs `yarn test:e2e`. Required repository vars/secrets align with the deploy workflow (Firestore, JWT, CTP_*, STORAGE_*, etc.).

## Env reference

All env variable names, defaults, and resolved values are defined in **`e2e/constants.ts`** (`ENV_KEYS`, `E2E_ENV`, `ensureE2EEnv`).

| Variable (E2E_ prefix)   | Required | Description                                      |
|--------------------------|----------|--------------------------------------------------|
| E2E_BASE_URL             | Yes      | Service base URL (e.g. `http://localhost:8080`)  |
| E2E_BUSINESS_UNIT_KEY    | No       | Defaults to E2E_CTP_PROJECT_KEY                  |
| E2E_CTP_PROJECT_KEY      | Yes      | CommerceTools project key (and x-project-key)    |
| E2E_CTP_CLIENT_ID        | Yes      | For authenticate-project                        |
| E2E_CTP_CLIENT_SECRET    | Yes      | For authenticate-project                        |
| E2E_CTP_AUTH_URL         | No       | Optional override                                |
| E2E_CTP_API_URL          | No       | Optional override                                |
| E2E_CTP_SCOPE            | No       | Optional override                                |
| E2E_CTP_REGION           | No       | Optional override                                |

Non-prefixed names (`BASE_URL`, `CTP_PROJECT_KEY`, etc.) are still read as fallback for local `.env`.
