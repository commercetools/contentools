# Manual steps (only you can do these)

Everything else is automated by the specs. Per-spec details: `openspec/changes/<id>/manual.md`.
Listed roughly in the order you will need them. "Reply" items are literal approvals.

| ID | Step | Needed before | Details |
| -- | ---- | ------------- | ------- |
| M-A1 | `corepack enable` once (Yarn 4 for `puck/`) | spec I | |
| M-A2 | Presales plugin with skill `commercetools-labs-publish` installed (or `LABS_PUBLISH_DIR` pointing at `ossify.mjs`/`gate.mjs`) | A task 6.1, R | |
| M-O1 | **Docker Desktop** running + Connect CLI (`npm i -g @commercetools/cli`); `commercetools connect validate` builds in Docker and runs Trivy (first run downloads several GB) | H/O validation | |
| M-01 | **Sandbox commercetools project + API client** with exactly `manage_key_value_documents` and `view_products`. Put creds in git-ignored `service/.env.e2e` (`E2E_CTP_*`/`CTP_*`, `E2E_ALLOW_PROJECT_KEY` = project key, `SERVICE_API_TOKEN` ≥ 32 chars). **Activate Product Search** on the project (call it at least every 30 days) | live e2e in B, D, F, G, Q | MC → Settings → Developer settings; Project settings → Product Search |
| M-02 | **Media bucket** for the backend chosen in Q-06 (GCS public-read bucket + service account with `objectAdmin`; key JSON → `base64 -i key.json \| tr -d '\n'`; or S3 with public `GetObject` policy; Cloudinary only if verified live) | G live check, Q | Without it G is verified with mocks / MinIO / fake-gcs-server |
| M-B1 | Chrome connector attached to a Chrome profile | every UI verification | |
| M-03 | **Register the MC custom application**: placeholder URL `https://example.com`, entry point `contentools`, scopes `view_business_units` / `manage_key_value_documents`, label `Contentools`, link permissions View+Manage. Send me the **Application ID** (field list: L tasks 5.1) | spec L | After first deploy replace the placeholder with the real admin-app URL (M-L2) |
| M-04 | **Log in to Merchant Center** when Chrome prompts (you said you will); **reattach the Chrome DevTools connector first — it is disconnected right now**. Optional: second team/user without the app permission (403 check; else waived) | K/L/Q MC checks | MC needs SSO/2FA |
| M-K2 | Provide the MC session so I can live-verify PUT / JSON / multipart / large uploads through forward-to (undocumented) | spec K | Fallbacks designed |
| M-K4 | https tunnel (ngrok/cloudflared) for local end-to-end with MC (gateway refuses `http://`), or use the deployed sandbox service | K group 8, Q | |
| M-05 | **Connect CLI login** (`commercetools auth login`) with an API client that has `manage_connectors`, `manage_connectors_deployments`, `manage_api_clients` in a sandbox region | H/L/M deploy checks, Q | Local-only checks work without |
| M-L6 | ~~private fork~~ **Not needed**: the same repo is public after the gate; tags `v1.0.0-rc.N` are deployed by Connect | first Connect deploy | Q-19 answered |
| M-MM | After deploying `service`: put its URL into `mcp` (`CONTENT_SERVICE_URL`) and admin-app (`CONTENTOOLS_SERVICE_URL`, second pass); generate `openssl rand -base64 32` for `MCP_ACCESS_TOKEN` and `SERVICE_API_TOKEN` (same value on service and mcp) | first mcp/admin-app deploy | Order: service → mcp / admin-app |
| M-07 | **npm**: `@commercetools-labs` org exists and you can publish; `npm login` with 2FA (OTP prompted per package; no CI, no trusted publishing). Names free? `npm view @commercetools-labs/puck-types version` → E404 | puck rc publish, R | |
| M-08 | **Run the rc publish**: `node puck/scripts/publish-packages.mjs` (dry run), then `--execute` (tag `next`) so Connect can install puck for admin-app | first admin-app Connect deploy, Q | Reply `go npm` at CP-1 |
| M-J1 | Optional: `GOOGLE_TRANSLATE_API_KEY` for a better machine-translated German catalog | J task 9.5 | |
| M-06 | **GitHub**: permission to create public `commercetools/contentools`; org custom property `commercetools-labs` (boolean) defined (a 422 ⇒ org admin); topic `labs`; private vulnerability reporting enabled; OK to delete+recreate if a leak is found | spec R | Reply `go repo` / `go settings` |
| M-10 | Read the gate output; approve each outward-facing step. I stop before `npm publish --execute`, `gh repo create --public`, `git push` | spec R | Irreversible (commits stay fetchable) |
| M-11 | Confirm no contact email in `SECURITY.md` / `SUPPORT.md` | spec P/R | |
| M-R1 | Author name/email for the single public commit | R task 8.1 | Q-20 |
| M-09 | **Answer `plans/owner-questions.md`** ("defaults" is valid) | before implementation | |
