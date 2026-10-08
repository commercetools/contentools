# 01 Start the local stack (fake commercetools + service + playground)

Run each command in its own background shell from the repo root. Collected evidence goes to `plans/evidence/<spec-id>/`
(see README).

1. Fake commercetools on port 8099:
   ```bash
   yarn dev:fake-ct
   ```
2. Service on port 8080 (no secrets: fake values only):
   ```bash
   cd service && CTP_PROJECT_KEY=test-project CTP_CLIENT_ID=x CTP_CLIENT_SECRET=y \
     CTP_SCOPE=manage_key_value_documents:test-project \
     CTP_API_URL=http://localhost:8099 CTP_AUTH_URL=http://localhost:8099 \
     SERVICE_API_TOKEN=local-dev-token yarn start:dev
   ```
3. Playground on port 5174. Copy `puck/playground/.env.example` to `puck/playground/.env` and set
   `VITE_BASE_URL=http://localhost:8080/service`, `VITE_PROJECT_KEY=test-project`, `VITE_BUSINESS_UNIT_KEY=test-bu`,
   `VITE_JWT_TOKEN=local-dev-token` (the token variable is renamed by the puck connection-contract spec):
   ```bash
   cd puck && yarn start:playground
   ```

Readiness check (available after the service-core and auth specs):

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/service/health   # expect 200
```

Evidence: note the three listening ports and the readiness result in the run notes.
