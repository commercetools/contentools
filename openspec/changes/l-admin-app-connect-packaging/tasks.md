## Conventions

* `ROOT` = `/Users/behnam/code/commercetools-labs/contentools`; all paths are relative to it. `SRC` = `/Users/behnam/code/cms/contentools` (read-only).
* **Connect** is commercetools' hosting platform: you point it at a Git repository + tag, it builds each application listed in `connect.yaml` and runs it. A **Connector** is that repository registered in Connect; a **Deployment** is one running instance of it in a project/region.
* **Merchant Center (MC) custom application** = a React app that MC loads from a URL inside its shell. It must be **registered** in MC (name, URL, entry-point path, scopes, menu) and **installed** for a project. The registration is separate from the code: it gets an **Application ID**.
* **Entry point URI path** = the URL segment under which MC mounts the app (`/<projectKey>/<entryPointUriPath>`); unique per cloud region.
* **Cloud identifier** = MC's name for a region (`gcp-eu`, `gcp-us`, `gcp-au`, `aws-eu`, `aws-us`). Connect uses different names for the same regions: `europe-west1.gcp`, `us-central1.gcp`, `australia-southeast1.gcp`, `eu-central-1.aws`, `us-east-2.aws` (pairs in this order).
* Every new `.js/.mjs/.ts` file starts with the SPDX header (exact):
```
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
```
* No GitHub Actions anywhere: checks are local scripts; Connect builds and deploys.
* Background to read first (15 min): `explore.md` sections 2 and 3, `design.md` D1-D6.

---

## 0. Pre-conditions

- [ ] 0.1 Spec K archived: `yarn --cwd admin-app verify` exits 0. Done when: exit code 0 (`echo $?` -> `0`).
- [ ] 0.2 Spec H archived: root `connect.yaml` exists with the `service` application (`endpoint: /service`). Done when: `grep -n "name: service" connect.yaml` prints a line.
- [ ] 0.3 `yarn --cwd admin-app install --frozen-lockfile` works against **registry** puck packages (i.e. `node tools/admin-app-use-local-puck.mjs --restore` was run and `npm view @commercetools-labs/puck-page-manager@next version` prints a version) - manual-steps M-08. Done when: both commands succeed. If the rc is not published, groups 1-4 and A-checks can still be done with the local-puck script, but groups 6 and B cannot.
- [ ] 0.4 CLI present: `commercetools --version` prints `@commercetools/cli/0.0.x`; install with `npm i -g @commercetools/cli` if not.

Rollback for the spec: `git checkout -- connect.yaml admin-app/custom-application-config.mjs admin-app/.env.example admin-app/README.md` and delete the two `tools/*admin-app*` scripts.

---

## 1. The `admin-app` block in `connect.yaml`

Context: `connect.yaml` at the repository root lists every Connect application. The MC app is special: no `endpoint` (it is static files), no secrets, no `scripts`, and Connect itself provides `APPLICATION_URL`. We declare only the three values an operator must supply and share the region value with the service. Reasoning: `design.md` D1.

- [ ] 1.1 Open `connect.yaml`. Under `deployAs:` append (keep two-space indentation; the folder `admin-app/` must exist at the repo root):
  ```yaml
    - name: admin-app
      applicationType: merchant-center-custom-application
      configuration:
        standardConfiguration:
          - key: CUSTOM_APPLICATION_ID
            description: The Application ID the Merchant Center shows after the custom application is registered
            required: true
          - key: ENTRY_POINT_URI_PATH
            description: The entry point URI path the custom application is registered with (unique per region, 2-64 chars, lowercase alphanumerics and hyphens)
            required: true
            default: contentools
          - key: CONTENTOOLS_SERVICE_URL
            description: https URL of the service application, ending in /service. Empty on the first deployment; set it with a redeploy once the service URL is known
            required: false
  ```
  Done when: `grep -n "name: admin-app" connect.yaml` prints one line and the block has no `endpoint:` line.
- [ ] 1.2 Under the top-level `inheritAs:` key (create `inheritAs.configuration.standardConfiguration` if H has not; if H already declared `CLOUD_IDENTIFIER` anywhere else, delete that one so only this remains) add:
  ```yaml
  inheritAs:
    configuration:
      standardConfiguration:
        - key: CLOUD_IDENTIFIER
          description: Merchant Center cloud identifier of the project's region (gcp-eu, gcp-us, gcp-au, aws-eu, aws-us); the admin-app's MC API host and the issuer of the forwarded tokens verified by the service
          required: true
  ```
  Done when: `grep -c "key: CLOUD_IDENTIFIER" connect.yaml` prints `1`.
- [ ] 1.3 Write `tools/check-admin-app-connect.mjs` (Node 22, no dependencies, SPDX header). Logic: read `connect.yaml` as text; find the line `  - name: admin-app`; the block ends at the next line matching `^  - name:` or `^\S`; inside the block fail (exit 1, print the offending line) if any line matches `^\s+(endpoint|scripts|securedConfiguration):` or contains `APPLICATION_URL`; fail unless the block contains `applicationType: merchant-center-custom-application` and the three keys `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `CONTENTOOLS_SERVICE_URL`; fail unless `connect.yaml` contains exactly one `key: CLOUD_IDENTIFIER`; fail if the folder `admin-app` does not exist. On success print `admin-app connect.yaml ok`.
  Add to the root `package.json` scripts (hub from spec A): `"check:admin-app-connect": "node tools/check-admin-app-connect.mjs"`.
  Done when: `node tools/check-admin-app-connect.mjs` prints `admin-app connect.yaml ok`; adding a stray `endpoint: /x` inside the block makes it exit 1 (try, then revert).
- [ ] 1.4 Run Connect's own validator: `commercetools connect validate .` (it validates `connect.yaml` and every application; `--skip analysis` is allowed while code analysis tools are unavailable offline). Expected: no error mentioning `admin-app`. Warnings about `service` belong to H.
  Done when: output has no line containing `admin-app` with `error`.

Pitfalls: (1) the application `name` must equal its folder; (2) do not add `endpoint` "just in case": the docs say it is not required for MC apps and the skill checklist flags it; (3) `required: true` keys without a default must be passed on **every** deployment; (4) Connect silently drops undeclared keys on redeploy - every key you intend to pass must be declared here.
Verification: tasks 1.3, 1.4. Rollback: remove the block and the `inheritAs` entry.

---

## 2. `custom-application-config.mjs` and env files

Context: this file is read by `mc-scripts` at build time. `'${env:NAME}'` placeholders are replaced from the process environment; Connect sets the variables from the deployment configuration. Source to rewrite: `SRC/custom-application-config.mjs` (72 lines); the problems are in `explore.md` section 1.

- [ ] 2.1 Replace `admin-app/custom-application-config.mjs` entirely with the code in `design.md` D2 (SPDX header first). Differences to the source you must see in the diff: `CMS_API_URL` placeholder gone; whole `headers.csp` block gone; `oAuthScopes` = 1 view + 1 manage scope; icon path from `@commercetools-frontend/assets`; `INITIAL_PROJECT_KEY` -> `CTP_INITIAL_PROJECT_KEY`; `description` added.
  Done when: `grep -nE "https?://|\.app\b|run\.app|ct-poc|localhost|cms|tabler" admin-app/custom-application-config.mjs` prints nothing.
- [ ] 2.2 Check the config loads: `cd admin-app && ENTRY_POINT_URI_PATH=contentools CLOUD_IDENTIFIER=gcp-eu CUSTOM_APPLICATION_ID=x APPLICATION_URL=https://example.com CTP_INITIAL_PROJECT_KEY=p npx mc-scripts compile-html` (this compiles `index.html.template`; if mc-scripts says the template is missing, run `yarn build` instead, group 3 does that anyway).
  Expected: exits 0 and creates `public/index.html` (git-ignored).
  Done when: `grep -o '"entryPointUriPath":"[^"]*"' public/index.html` prints `"entryPointUriPath":"contentools"`.
- [ ] 2.3 `admin-app/.env.example`: already rewritten in K 1.4. Confirm it contains exactly `CLOUD_IDENTIFIER, CTP_INITIAL_PROJECT_KEY, ENTRY_POINT_URI_PATH, CUSTOM_APPLICATION_ID, APPLICATION_URL, CONTENTOOLS_SERVICE_URL` with the comments (add the comment "APPLICATION_URL: Connect provides it at deploy time" if missing).
  Done when: `grep -c "=" admin-app/.env.example` prints `6`.
- [ ] 2.4 `admin-app/src/constants.ts` must import nothing from the config; the config imports `PERMISSIONS` from it (as in the source). Confirm `yarn --cwd admin-app typecheck` still passes.

Pitfalls: (1) a `${env:X}` placeholder throws "variable not set" when X is empty, which is why `serviceUrl` uses `process.env` directly (the first deployment has no service URL); (2) never put a secret into `additionalEnv`: its values are written into the public HTML (`window.app`); (3) `entryPointUriPath` is also used for permission key names (`canViewContentools`): changing it later changes the keys the service must check.
Verification: 2.1-2.2. Rollback: `git checkout -- admin-app/custom-application-config.mjs`.

---

## 3. Simulated Connect build (automatable proof)

Context: Connect builds the app in a clean environment that has only what `connect.yaml` declares plus `APPLICATION_URL`. Developers usually have a `.env` that hides mistakes (a variable the code needs but Connect never sets). This script builds with a minimal environment and inspects the output.

- [ ] 3.1 Create `tools/admin-app-simulate-connect-build.mjs` (Node 22, no dependencies, SPDX header). Skeleton:
  ```js
  import { execFileSync } from 'node:child_process';
  import { readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
  import { join, resolve } from 'node:path';

  const root = resolve(new URL('..', import.meta.url).pathname);
  const app = join(root, 'admin-app');
  const serviceUrl = process.argv.includes('--service-url') ? process.argv[process.argv.indexOf('--service-url') + 1] : '';
  const CANARY = 'canary-secret-value';
  const env = {                                  // nothing else is inherited: no .env, no CTP_INITIAL_PROJECT_KEY
    PATH: process.env.PATH, HOME: process.env.HOME,
    ENTRY_POINT_URI_PATH: 'contentools', CLOUD_IDENTIFIER: 'gcp-eu',
    CUSTOM_APPLICATION_ID: 'canary-application-id', APPLICATION_URL: 'https://admin-app-canary.example.com',
    CTP_CLIENT_SECRET: CANARY,                   // Connect inherits shared secrets into every app's environment
    ...(serviceUrl ? { CONTENTOOLS_SERVICE_URL: serviceUrl } : {}),
  };
  rmSync(join(app, 'public'), { recursive: true, force: true });
  execFileSync('yarn', ['install', '--frozen-lockfile'], { cwd: app, env, stdio: 'inherit' });
  execFileSync('yarn', ['build'], { cwd: app, env, stdio: 'inherit' });
  // assertions: collect failures in an array, print each, exit 1 if any
  ```
  Assertions (each prints `ok: <name>` or `FAIL: <name>`):
  1. `public/index.html` exists and contains `window.app = {...}`; extract with `/window\.app = (\{.*?\});<\/script>/s` and `JSON.parse` it (the HTML uses `/` escapes, which JSON.parse understands).
  2. `app.entryPointUriPath === 'contentools'`; `app.location === 'gcp-eu'`; `app.mcApiUrl` starts with `https://mc-api.`.
  3. `app.serviceUrl` equals the `--service-url` value when given, else is `undefined` or `''`.
  4. No file under `public/` (recursive, text files) contains `canary-secret-value`.
  5. The CSP meta (`/http-equiv="Content-Security-Policy" content="([^"]*)"/`) does not contain `run.app`, `ct-poc`, `localhost`, `'unsafe-eval'` (third-party hosts that the Application Shell adds by default, such as its feature-flag and error-reporting services, are allowed); print the whole policy so a human can review it.
  6. No file under `public/` contains the words `cms` as a whole word (`/\bcms\b/i`) in `index.html`.
  Done when: `node tools/admin-app-simulate-connect-build.mjs` prints six `ok:` lines (or, for a default that contradicts assertion 5, you record the exact default directive in `design.md` D5 and relax only that assertion).
- [ ] 3.2 Run once with a service URL: `node tools/admin-app-simulate-connect-build.mjs --service-url https://service-abc.europe-west1.gcp.commercetools.app/service`. Expected: assertion 3 `ok` with that exact value.
- [ ] 3.3 Add root script `"check:admin-app-build": "node tools/admin-app-simulate-connect-build.mjs"` (hub, spec A) (only the root `package.json` is touched).
  Done when: `yarn check:admin-app-build` (from ROOT) passes.

Pitfalls: `mc-scripts build` also needs `APPLICATION_URL` to be a valid https URL (it fails with `Invalid application URL: ""` otherwise: that is what Connect provides). If the build fails only here and passes with your `.env`, you found a hidden variable: fix the code/config, not the script. Verification: 3.1-3.2. Rollback: delete the script.

---

## 4. Content Security Policy: start empty, add only what is proven

Context: a CSP (Content Security Policy) tells the browser which hosts the page may load scripts, styles, images and connect to. The source allowed internal Cloud Run hosts and `*.ct-poc.net`, which must never be public. With forward-to the browser only talks to the MC API, which MC allows by default. So we ship **no** CSP override and add entries only when the browser reports a violation. Details: `design.md` D5.

- [ ] 4.1 Confirm the shipped config has no `headers` key: `grep -n "headers" admin-app/custom-application-config.mjs` prints nothing.
- [ ] 4.2 (Part A) Inspect the generated default policy: run task 3.1 and read the printed CSP. Copy it into `design.md` D5 under "Observed default policy (mc-scripts 27.13.0)". Done when: the table exists and shows no internal host.
- [ ] 4.3 (Part B, needs MC login) Open the deployed or `yarn start` app in Chrome; `list_console_messages` with a filter on "Content Security Policy"; each violation line names `Refused to load ... because it violates the following Content Security Policy directive: "<directive> ..."`. For each distinct violation, add the **minimal** value to `headers.csp` in the config using the correct directive key (`connect-src`, `script-src`, `style-src`, `font-src`, `img-src`, `frame-src`, `media-src`), never a wildcard of a cloud provider, never `'unsafe-eval'` unless the console proves it and a note in `questions.md` is added. Record `directive | value | console message | why` in `design.md` D5.
  Done when: reload shows zero CSP violation messages.

Pitfalls: `'unsafe-eval'` in the source `connect-src` was meaningless (it is not a valid connect-src source in practice); `localhost:8080` was only for the old direct calls. If the editor canvas (an iframe) shows a violation, record it; the iframe is same-origin (`srcdoc`) and normally needs nothing.
Rollback: delete the added `headers` block.

---

## 5. Merchant Center registration (human steps, exact fields)

Context: MC will not show or run the app until it is registered. This is a one-time manual step per organization (manual-steps M-03). Registration comes **first** because Connect needs the Application ID, and the real URL comes **last** because it only exists after the first deployment. Source: guide `https://docs.commercetools.com/guides/create-custom-application.md` and the Connect skill `merchant-center-customizations.md` Pattern 5.

- [ ] 5.1 Registration (human, in the Merchant Center): profile icon -> **Manage organizations & teams** -> your organization -> **Custom Applications** tab -> **Configure Custom Applications** (add and verify a contact e-mail once) -> **Add a Custom Application** and enter:
  * Application name: `Contentools`
  * Application URL: `https://example.com` (placeholder, replaced in 6.6)
  * Application entry point URI path: `contentools` (or your `ENTRY_POINT_URI_PATH`; must be unique in the region)
  * Permissions > Default group > OAuth Scopes for View: `view_business_units`; for Manage: `manage_key_value_documents`
  * Main menu: Default link label `Contentools`; Link permissions > Default group: View and Manage on
  * Click **Register Custom Application**. State is **Draft**. Copy the **Custom Application ID** (looks like `cm...:contentools`; the part to use for `CUSTOM_APPLICATION_ID` is exactly what the registration shows as "ID").
  Done when: the ID is stored in your local `.env` as `CUSTOM_APPLICATION_ID` and given to the implementer (never committed).
- [ ] 5.2 Scope mirror check: the scopes and label typed above must equal `custom-application-config.mjs`. Verify with the CLI: `cd admin-app && npx mc-scripts login` (browser) then `CUSTOM_APPLICATION_ID=<id> npx mc-scripts config:sync --dry-run`. Expected: prints the config that would be pushed and no unexpected diff. If the CLI proposes different scopes, decide which side is right and fix the other.
  Done when: dry-run shows no difference, or a recorded decision exists.
- [ ] 5.3 Document in `admin-app/README.md` (group 7) the sentence: "Scopes, menu links and permissions are taken from the registration, not from the deployed bundle. After editing `custom-application-config.mjs`, run `npx mc-scripts config:sync` or edit the registration in the Merchant Center."

Pitfalls: if the form rejects an empty manage scope list, keep `manage_key_value_documents` (`questions.md` Q-L1); an entry point path that exists in the region fails registration with a conflict message: choose another and use it consistently in `.env`, `connect.yaml` default and the README.
Rollback: delete the draft registration in the organization settings.

---

## 6. Deploy (CLI commands, expected output)

Context: Connect builds the repository at a **Git tag**. You create a Connector from the repo URL + tag, publish it, then create a Deployment that supplies configuration values. Because the service URL does not exist before the first deployment, you deploy twice (second time = `redeploy`). Variable values below are placeholders; the `service` keys come from spec H's README table.

Pre-conditions: manual-steps M-05 (CLI login), M-07/M-08 (npm), M-10 not needed here. The repository must be reachable by Connect: owner decision, Connect testing uses **this same repository with git tags** (no private fork). The repository becomes public after the R gate; release-candidate tags `v1.0.0-rc.N` are deployed with `connectorstaged create` / `update` (an HTTPS URL works only for public repositories, so rc deployments happen once the repository is public; before that, only part A and local checks run).

- [ ] 6.1 Login (human or agent with the client): `commercetools auth login --client-credentials --client-id <id> --client-secret <secret> --region <region> --project-key <key>`; the API client needs `manage_connectors`, `manage_connectors_deployments` and `manage_api_clients`. Done when: `commercetools connect deployment list` prints a (possibly empty) list without an authorization error.
- [ ] 6.2 Tag and create the Connector:
  ```bash
  git tag v1.0.0-rc.1 && git push origin v1.0.0-rc.1
  commercetools connect connectorstaged create --key contentools --name "Contentools" \
    --repository-url https://github.com/commercetools/contentools --repository-tag v1.0.0-rc.1 \
    --creator-email <you@example.com> --supported-regions europe-west1.gcp --integration-types other
  ```
  Expected: prints the created staged connector (`key: contentools`). Later versions: `connectorstaged update --key contentools --repository-tag <newtag>`.
- [ ] 6.3 First deployment. Fast path for iteration is a **preview** deployment of the staged connector (runs validations: code analysis, tests, `connect.yaml` check):
  ```bash
  commercetools connect connectorstaged preview --key contentools --deployment-key contentools-preview --region europe-west1.gcp \
    --configuration CLOUD_IDENTIFIER=gcp-eu \
    --configuration admin-app.CUSTOM_APPLICATION_ID=<application id from 5.1> \
    --configuration admin-app.ENTRY_POINT_URI_PATH=contentools \
    --configuration service.<KEY>=<value>        # repeat for every service key from spec H (secured ones too)
  ```
  A **sandbox** or **production** deployment needs a published Connector: `commercetools connect connectorstaged publish --key contentools`, then `commercetools connect deployment create --connector-key contentools --key contentools-sandbox --region europe-west1.gcp --type sandbox --configuration ...` (same `--configuration` flags). Wait for status `Deployed` (up to 15 min): poll `commercetools connect deployment describe --key <deployment-key>`.
  Done when: `describe` shows status `Deployed`. If `Failed`: `commercetools connect deployment logs --key <key> --application admin-app` and read the build log; common causes in Pitfalls.
- [ ] 6.4 Read the URLs: `commercetools connect deployment describe --key <deployment-key>`; note the `url` of application `admin-app` (call it `ADMIN_URL`) and of application `service` (call it `SERVICE_URL`, it ends in `/service`). (The exact output layout is not documented; the Connect API field is `applications[].url` with `applicationName`.) Optional helper `tools/connect-print-urls.mjs` (about 30 lines): runs `describe --key $1`, `JSON.parse` the output if JSON else regex the two URLs, prints `ADMIN_URL=...` and `SERVICE_URL=...`; add only if the CLI prints parseable text.
  Done when: both URLs are noted and `curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health"` prints `200` (path per spec H) .
- [ ] 6.5 Second pass: give the app the service URL. **Send every admin-app key again** (a key omitted on redeploy loses its value):
  ```bash
  commercetools connect deployment redeploy --key contentools-preview \
    --configuration CLOUD_IDENTIFIER=gcp-eu \
    --configuration admin-app.CUSTOM_APPLICATION_ID=<id> \
    --configuration admin-app.ENTRY_POINT_URI_PATH=contentools \
    --configuration admin-app.CONTENTOOLS_SERVICE_URL=$SERVICE_URL \
    --configuration service.<KEY>=<value> ...     # all service keys again
  ```
  Add `--updateConnector` only when the tag changed (otherwise the old build restarts). Wait for `Deployed`.
  Done when: `describe` shows `Deployed` again; the `admin-app` URL did not change.
- [ ] 6.6 Update the registration (human, MC): Organization -> Custom Applications -> `Contentools` -> set **Application URL** to `ADMIN_URL` -> Save. Done when: the registration shows the new URL.
- [ ] 6.7 Install and permit (human, MC): Organization -> Custom Applications -> **Install** -> choose organization/projects; Team permissions: give your team **View** (and **Manage** for editors). Done when: the project's left menu shows **Contentools**.

Pitfalls: (1) `Invalid application URL: ""` in the build log -> Connect did not provide `APPLICATION_URL`; add key `APPLICATION_URL` (required: false) to the `admin-app` block, redeploy, and record it in `design.md` D1 (risk R-L1). (2) `Missing variable ... ENTRY_POINT_URI_PATH` -> the key was not sent. (3) `yarn install --frozen-lockfile` failing in the build log -> `yarn.lock` is stale or points at an unpublished puck rc. (4) A new deployment **key** means a new URL for both apps: repeat 6.4-6.6. (5) Preview/sandbox deployments scale to zero: the first request after idle takes about 15 s. (6) Deploy in the same region as the project.
Verification: B-checks in group 8. Rollback: `commercetools connect deployment delete --key <key>` (then the registration still exists; deleting the draft registration is a separate MC step).

---

## 7. README "Deploy" section (admin-app)

- [ ] 7.1 Append to `admin-app/README.md` (K wrote the dev part) a section **Deploy** containing, as Markdown: (a) the configuration table `Key | Where set | Kind | Required | Meaning` with rows `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `CONTENTOOLS_SERVICE_URL`, `CLOUD_IDENTIFIER` (shared) and a line "Provided by Connect: `APPLICATION_URL`"; (b) the sequence table from `design.md` D6 with the exact commands from group 6 (placeholders in angle brackets); (c) the **Scopes** table: scope, why, who needs it (`view_business_units`: business-unit list; `manage_key_value_documents`: backs the Manage permission); (d) the sentence from 5.3; (e) **Failure behaviour**: "fails closed: without a valid https service URL the app shows a notice and sends no request; every write is authorized by the service from the forwarded permission claim"; (f) a statement that `CONNECT_SERVICE_URL` is **not** available to MC applications and why the two-pass deployment exists; (g) troubleshooting table from the Pitfalls above; (h) the "unsupported" banner sentence consistent with the root README (spec P owns final wording).
  Done when: `grep -c "CONTENTOOLS_SERVICE_URL" admin-app/README.md` is at least `3` and the section contains the words `redeploy`, `Application URL`, `config:sync`.

---

## 8. Verification

### A. Automatable (no Merchant Center login)
- [ ] A1 `node tools/check-admin-app-connect.mjs` -> `admin-app connect.yaml ok`.
- [ ] A2 `commercetools connect validate .` -> no `admin-app` error.
- [ ] A3 `yarn check:admin-app-build` -> all `ok:` lines (config placeholders, no secret canary, service URL reaches `window.app`, CSP free of internal hosts).
- [ ] A4 `cd admin-app && yarn install --frozen-lockfile && yarn test` -> Jest passes with Connect-style extra flags: `yarn test --coverage --collectCoverageFrom='src/**/*.{ts,tsx}' --coverageReporters=text` exits 0.
- [ ] A5 `commercetools connect application build` and `commercetools connect application test` run inside `admin-app` context if the CLI supports the folder (it wraps the same `yarn build`/`npm run test`); record the output. If the CLI refuses an MC app, note it in `questions.md`.
- [ ] A6 Static grep gate: `grep -rniE "cms|ct-poc|run\.app|commercetools-demo|multitenant|localhost" admin-app connect.yaml --exclude-dir=node_modules --exclude-dir=public --exclude=yarn.lock` prints nothing (except `localhost` inside `admin-app/README.md` dev instructions, which is allowed; exclude that file in the command).
- [ ] A7 Local serve smoke (no login needed to see the shell redirect): `cd admin-app && yarn start:prod:local` then `mcp__chrome-devtools__new_page http://localhost:3001` -> expect MC login redirect or the shell's login page (proves the bundle loads; `list_console_messages` has no `ReferenceError`).

### B. Needs a logged-in Merchant Center session (owner-assisted; M-04) - best effort
Start by opening Merchant Center in Chrome; when the login prompt appears, ask the owner to log in and wait for their confirmation. Prerequisite line to record in the evidence: "Merchant Center session available (M-04)". Evidence screenshots go to `plans/evidence/l/<id>.png`.
- [ ] B1 `navigate_page https://mc.<region>.commercetools.com/<project>/contentools`; `wait_for` "Pages"; `take_snapshot`; the main menu shows **Contentools**.
- [ ] B2 `list_network_requests`: calls go to `https://mc-api.<region>.commercetools.com/proxy/forward-to` with `X-Forward-To` starting with `SERVICE_URL`; response 200.
- [ ] B3 `evaluate_script`: `() => window.app.serviceUrl` equals `SERVICE_URL`; `() => Object.keys(window.app).filter(k => /secret|token|key/i.test(k))` returns `[]`.
- [ ] B4 Decode the exchange token seen by the service (service debug log or a temporary echo route in a local run): `user_permissions` contains `canManageContentools` for an editor and only `canViewContentools` for a viewer.
- [ ] B5 View-only user: create a page -> 403 -> translated notice.
- [ ] B6 CSP: `list_console_messages` -> zero CSP violations (task 4.3).
- [ ] B7 German UI (`de` user language) -> German sidebar labels.
- [ ] B8 Negative: redeploy without `CONTENTOOLS_SERVICE_URL` (or set it empty) -> the app shows the "service not configured" notice and `list_network_requests` shows no `/proxy/forward-to` call.
- [ ] B9 Sanity of the two-pass claim: confirm `window.app` has **no** `CONNECT_SERVICE_URL` property (`evaluate_script: () => 'CONNECT_SERVICE_URL' in window.app` -> `false`).

---

## Definition of Done (mapped to `specs/**`)

| Scenario | Evidence |
| --- | --- |
| connect-deployment: Validation passes | A2 |
| connect-deployment: Forbidden fields absent | A1 |
| connect-deployment: One declaration (`CLOUD_IDENTIFIER`) | task 1.2 command |
| connect-deployment: No literals / Build with only Connect-provided variables | task 2.1 grep, A3 |
| connect-deployment: Value reaches the browser / Empty value tolerated | A3 (3.2), B3, B8 |
| connect-deployment: Secret canary | A3 assertion 4 |
| connect-deployment: Scope list | B1 + file review; `grep -n "view_\|manage_" admin-app/custom-application-config.mjs` shows exactly two scopes |
| connect-deployment: Default policy | A3 assertion 5, 4.2 |
| connect-deployment: Menu link | B1 |
| connect-deployment: Lockfile in sync | A4 |
| mc-registration: Runbook is complete / URL lookup | README review (7.1), task 6.4 |
| mc-registration: Dry-run sync | task 5.2 |
| mc-registration: Claim names | B4 |
| mc-registration: Automatable part / Login-gated part | group 8 structure; evidence under `plans/evidence/l/` |
| mc-registration: Redeploy keeps values | task 6.5 + `describe` check |

Connect skill checklist items covered by L: MC `applicationType` with no stray `endpoint`/`securedConfiguration`/`APPLICATION_URL` (1.1, 1.3); `${env:}` placeholders, no hard-coded per-project values (2.1); `oAuthScopes` limited to UI use and permission-gated menu (2.1, D4); register-first/update-URL-last in the project's region with matching `cloudIdentifier` (group 6); tested through the shell (K tests, A4).
Final checklist: [ ] all boxes ticked or marked "owner-assisted pending"; [ ] `questions.md`/`manual.md` handed to the coordinator.
