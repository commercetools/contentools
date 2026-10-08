## Context

Specs B-N each carry their own tests. Q is the only place where the assembled system is exercised on a
real commercetools sandbox project, and the only place where the Merchant Center and MCP paths are
proved together. It produces tooling and an evidence bundle; it changes no product code.
There is no CI in this repository (owner decision: Connect builds and deploys, no GitHub Actions):
the acceptance run is executed by hand (or by the implementing agent) and its evidence is a local folder.

The release flow (spec R) has no private fork: the repository is created public with the first push and the Connect deployment is tested from that same repository by tag. Q therefore has two phases: phase 1 (local scenarios) before R publishes anything, phase 2 (deployed run, MC checks, redeploy, rotation: AC-11, AC-13 deployed part, AC-14) after R's `v1.0.0-rc.N` tag.

## Goals / Non-Goals

Goals: reproducible scripted checks; a UI journey driven through the Chrome DevTools connector; a short
owner-assisted MC checklist; clear PASS/FAIL/WAIVED rules; cleanup that provably leaves the project empty.
Non-goals: load/performance testing; browser matrix; testing commercetools itself; automating Merchant Center login.

## Decisions

### D-1 Scenario catalogue (IDs are used in RESULTS.md)

| ID | Scenario | How | Needs | Automatable |
| --- | --- | --- | --- | --- |
| AC-01 | Health, warm-up | script | running service | yes |
| AC-02 | Negative auth matrix (18 cases): missing header, non-Bearer scheme, malformed token, forged `alg:none`, unknown signing key, expired, wrong static token, token only in query string, and the protected reads of spec E's policy (draft list, templates, product search, datasource list, media library, datasource resolve unless `PUBLIC_DATASOURCE_RESOLVE=true`) plus writes without a token; error body `{message, statusCode, correlationId}`; configuration reads and published reads stay public | script + `forge-jwt.mjs` | service | yes |
| AC-03 | Page lifecycle: create, 404 before publish, update, preview, publish, public read, slug query, edit, draft vs published, revert, versions, MAX_VERSIONS pruning, BU isolation, bad JSON (no stack), delete | script | service + sandbox project | yes |
| AC-04 | Content items lifecycle | script | same | yes |
| AC-05 | Templates | script | same | yes |
| AC-06 | Configuration documents, 8 keys, full CRUD | script | same | yes |
| AC-07 | Datasources, product search, content-type import | script | same (+ products in the project for a non-empty search) | yes |
| AC-08 | Media upload + library | script (`E2E_MEDIA=1`) | storage backend (M-02) | yes, optional |
| AC-09 | CORS preflight from a disallowed origin; `x-project-key` ignored | script | service | yes |
| AC-10 | Playground UI journey (create, edit, publish, render, version history, revert, theme, template, datasource, media) | Chrome DevTools connector | service + playground | yes |
| AC-11 | (phase 2) Merchant Center app (load, list, create/edit/publish, theme, content manager, forwarded session JWT accepted, permission denial) | owner-assisted; Chrome connector on the owner's logged-in profile | deployed sandbox service (https) or tunnel; registered app (M-03); M-04 | no (login) |
| AC-12 | MCP: initialize, tools/list, tools/call (list, create, read), unauthenticated refusal, no legacy tools | `mcp-check.sh` + an MCP client | running mcp app | yes |
| AC-13 | Connect local: `connect validate`, build + start each app via the CLI, `postDeploy` twice (idempotent) | CLI | Connect CLI | yes |
| AC-14 | Connect deployed (phase 2, after R's rc tag; stages the connector from the public repository by tag): deploy to sandbox, health, redeploy with changed config, broken tag keeps old code serving | CLI | M-05, M-08 | partly; optional |
| AC-15 | Cleanup + redaction check | `cleanup.mjs`, grep | - | yes |

### D-2 Isolation
The service used for the acceptance run overrides every container env with the prefix `contentools-test-`
(`PUCK_PAGE_CONTAINER=contentools-test-puck-page`, and so on; names listed in explore section 3, re-verified at task 1.3).
The business unit key is `contentools-acceptance` (and `contentools-acceptance-other` for the isolation check).
`cleanup.mjs` refuses any container without the prefix and any project whose key differs from `E2E_ALLOW_PROJECT_KEY`
(both guards were exercised in the scratchpad: each exits 2). Media files have no delete route: use a dedicated test
bucket or prefix (M-02) and remove it by hand.

### D-3 Where the Merchant Center checks run
MC `forward-to` accepts only https targets, so `http://localhost:8080` can never be reached through the Merchant Center.
The gateway has two audience policies: `forward-url-full-path` (default; `aud` = origin + forwarded path) and `forward-url-origin` (`aud` = origin).
Per spec E (design 1b) the admin app sends `forward-url-origin` and the service accepts `aud` = origin of `CONNECT_SERVICE_URL` (it also accepts the full-path form).
AC-11 therefore runs against the **deployed sandbox service**; the documented fallback is an https tunnel (ngrok or cloudflared) to the local service with
`CONNECT_SERVICE_URL` set to the tunnel URL ending in `/service`. Running `admin-app` locally (`yarn start` in `admin-app/`, http://localhost:3001) is fine for the UI side.

### D-4 Chrome journey: drive Puck honestly, fall back when needed
Primary: drag a Hero from the component list to the canvas with the connector `drag` tool. Puck uses pointer sensors that
synthetic drags sometimes do not trigger. Fallback: create the page body with `PUT` (script) and perform the editing steps
(change field text, publish, history, revert) in the UI. A fallback is recorded in RESULTS.md notes as "drag: fallback".

### D-5 Pass rules
PASS = all assertions met. FAIL blocks. WAIVED needs the owner's written reason in RESULTS.md (for example: no media backend,
MC login unavailable). SKIPPED only for AC-08 and AC-14. A defect is fixed in the owning spec's code, the affected scenario is
re-run in full, and RESULTS.md keeps both attempts.

### D-6 No CI
Scripts live in `tools/e2e/` (published, no secrets) and are invoked by hand; `yarn test:e2e` (spec B, jest) is the finer-grained sibling.
Alternative rejected: a scheduled workflow (owner decision, and it would need a sandbox secret).

### D-7 Tooling language
bash + curl + jq for the walkthrough (readable transcript, nothing to install on macOS/Linux); Node 22 without dependencies for cleanup and token forging.
Alternative rejected: another jest suite (one exists in B; the value here is an independent black-box pass with a human-readable transcript).

## Risks

* The script encodes today's response shapes and codes (create 201, delete 204, versions and lists as JSON arrays). Spec F may change a detail: update the script in this change and tell F's owner. Expected statuses for datasource test, content-type import and media upload are assumptions to confirm at task 3.3.
* Component name `Hero` in the test data may change in spec I.
* Sandbox cold start (~15 s): AC-01 is the warm-up.
* Evidence leakage: redaction function plus the grep check in AC-15.
## Appendix A - `tools/e2e/acceptance.sh`

Verified: `bash -n` clean; executed against a stub server (88 pass, 14 expected fails because the stub is naive), transcripts written, no token leaked.

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
# Freely available, AS IS and UNSUPPORTED. See LICENSE.
#
# Scripted API walkthrough (spec Q). Usage:
#   BASE_URL=http://localhost:8080/service SERVICE_API_TOKEN=... tools/e2e/acceptance.sh
# Needs: bash, curl, jq. Writes redacted transcripts + results.tsv to $EVIDENCE_DIR/api.
set -uo pipefail
: "${BASE_URL:?set BASE_URL, e.g. http://localhost:8080/service}"
: "${SERVICE_API_TOKEN:?set SERVICE_API_TOKEN}"
BU_A="${E2E_BU:-contentools-acceptance}"; BU_B="${BU_A}-other"
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
OUT="${EVIDENCE_DIR:-plans/evidence/q/$RUN_ID}/api"; mkdir -p "$OUT"
TSV="$OUT/results.tsv"; printf 'id\tstatus\texpected\tactual\tname\n' > "$TSV"
PASS=0; FAIL=0; STATUS=""; BODY="$OUT/.last-body.json"

redact() { sed -E "s/Bearer [A-Za-z0-9._~+\/=-]+/Bearer <redacted>/g; s/$(printf '%s' "$SERVICE_API_TOKEN" | sed 's/[][\/.^$*]/\\&/g')/<redacted>/g"; }
record() { # record <id> <PASS|FAIL> <expected> <actual> <name>
  printf '%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" >> "$TSV"
  if [ "$2" = PASS ]; then PASS=$((PASS+1)); echo "PASS $1 $5"; else FAIL=$((FAIL+1)); echo "FAIL $1 $5 (expected $3, got $4)"; fi
}
# call <id> <expected-status> <METHOD> <path> <auth: tok|none|literal header value> [json-body] [extra curl args...]
call() {
  local id=$1 want=$2 method=$3 path=$4 auth=$5 data=${6:-} ; shift $(( $# < 6 ? $# : 6 ))
  local args=(-sS -o "$BODY" -w '%{http_code}' -X "$method" "$BASE_URL$path")
  case "$auth" in tok) args+=(-H "Authorization: Bearer $SERVICE_API_TOKEN");; none) ;; *) args+=(-H "Authorization: $auth");; esac
  [ -n "$data" ] && args+=(-H 'Content-Type: application/json' --data "$data")
  STATUS=$(curl "${args[@]}" "$@" 2>>"$OUT/curl-errors.log" || echo 000)
  { echo "# $id $method $path (auth=${auth%% *}) -> $STATUS"; [ -s "$BODY" ] && { jq . "$BODY" 2>/dev/null || cat "$BODY"; }; echo; } | redact >> "$OUT/transcript.txt"
  if [ "$STATUS" = "$want" ]; then record "$id" PASS "$want" "$STATUS" "$method $path"; else record "$id" FAIL "$want" "$STATUS" "$method $path"; fi
}
# check <id> <name> <jq-expression on last body>  (expression must output true)
check() { if jq -e "$3" "$BODY" >/dev/null 2>&1; then record "$1" PASS true true "$2"; else record "$1" FAIL true false "$2"; fi; }
nostack() { if grep -qiE 'stack|\.ts:[0-9]+|node_modules' "$BODY"; then record "$1" FAIL none leaked "no stack trace"; else record "$1" PASS none none "no stack trace"; fi; }

TITLE="Acceptance $RUN_ID"
DATA1=$(jq -nc --arg t "$TITLE v1" '{content:[{type:"Hero",props:{id:"Hero-acc",title:$t,subtitle:"v1"}}],root:{props:{}}}')
DATA2=$(jq -nc --arg t "$TITLE v2" '{content:[{type:"Hero",props:{id:"Hero-acc",title:$t,subtitle:"v2"}}],root:{props:{}}}')
DATA3=$(jq -nc --arg t "$TITLE v3" '{content:[{type:"Hero",props:{id:"Hero-acc",title:$t,subtitle:"v3"}}],root:{props:{}}}')

echo "== AC-01 health / negative auth"
call AC01-01 200 GET /health none
call AC02-01 401 POST "/$BU_A/puck-pages" none '{"value":{"name":"x","slug":"/x"}}'; nostack AC02-01s
check AC02-01c "error body has message, statusCode 401 and correlationId" '(.message|type=="string") and .statusCode==401 and (.correlationId|type=="string")'
call AC02-02 401 POST "/$BU_A/puck-pages" "Basic abc" '{"value":{"name":"x","slug":"/x"}}'
call AC02-03 401 POST "/$BU_A/puck-pages" "Bearer not-a-jwt" '{"value":{"name":"x","slug":"/x"}}'
call AC02-04 401 POST "/$BU_A/puck-pages" "Bearer $(node "$(dirname "$0")/forge-jwt.mjs" none)" '{"value":{"name":"x","slug":"/x"}}'
call AC02-05 401 POST "/$BU_A/puck-pages" "Bearer $(node "$(dirname "$0")/forge-jwt.mjs" unknown-key)" '{"value":{"name":"x","slug":"/x"}}'
call AC02-06 401 POST "/$BU_A/puck-pages" "Bearer $(node "$(dirname "$0")/forge-jwt.mjs" expired)" '{"value":{"name":"x","slug":"/x"}}'
call AC02-07 401 POST "/$BU_A/puck-pages" "Bearer wrong-static-token-$RUN_ID" '{"value":{"name":"x","slug":"/x"}}'
call AC02-08 401 POST "/$BU_A/puck-pages?access_token=$SERVICE_API_TOKEN" none '{"value":{"name":"x","slug":"/x"}}'
call AC02-09 401 GET "/$BU_A/preview/puck-pages/does-not-exist" none
call AC02-10 401 DELETE "/$BU_A/puck-pages/does-not-exist" none
call AC02-11 401 PUT "/$BU_A/configuration/theme" none '{"value":{}}'
call AC02-12 401 POST "/$BU_A/upload-file" none
# protected-by-policy reads (spec E table): drafts, templates, product search, datasource management
call AC02-13 401 GET "/$BU_A/puck-pages" none
call AC02-14 401 GET "/$BU_A/puck-templates" none
call AC02-15 401 GET "/products/search?text=a" none
call AC02-16 401 GET "/datasource" none
call AC02-17 401 GET "/$BU_A/media-library" none
call AC02-18 401 POST "/datasource/products-by-sku/test" none '{"params":{"skus":["x"]}}'   # public only when PUBLIC_DATASOURCE_RESOLVE=true (default off)

echo "== AC-03 page lifecycle"
call AC03-01 201 POST "/$BU_A/puck-pages" tok "$(jq -nc --arg s "/acc-$RUN_ID" --argjson d "$DATA1" '{value:{name:"Acceptance page",slug:$s,puckData:$d}}')"
PAGE=$(jq -r .key "$BODY"); check AC03-01k "key returned" '.key|startswith("puck-page-")'
call AC03-02 404 GET "/$BU_A/published/puck-pages/$PAGE" none   # not published yet
call AC03-03 404 POST "/$BU_A/published/puck-pages/query" none "$(jq -nc --arg q "slug = \"/acc-$RUN_ID\"" '{query:$q}')"   # slug query also 404 before publish
call AC03-04 200 PUT "/$BU_A/puck-pages/$PAGE" tok "$(jq -nc --arg s "/acc-$RUN_ID" --argjson d "$DATA2" '{value:{name:"Acceptance page",slug:$s,puckData:$d}}')"
call AC03-05 200 GET "/$BU_A/preview/puck-pages/$PAGE" tok; check AC03-05c "preview shows v2" '.. | .title? // empty | select(endswith("v2"))'
call AC03-06 200 PUT "/$BU_A/puck-pages/$PAGE/states/published?clearDraft=true" tok
call AC03-07 200 GET "/$BU_A/published/puck-pages/$PAGE" none; check AC03-07c "published shows v2" '.. | .title? // empty | select(endswith("v2"))'
call AC03-08 200 POST "/$BU_A/published/puck-pages/query" none "$(jq -nc --arg q "slug = \"/acc-$RUN_ID\"" '{query:$q}')"
call AC03-09 200 PUT "/$BU_A/puck-pages/$PAGE" tok "$(jq -nc --arg s "/acc-$RUN_ID" --argjson d "$DATA3" '{value:{name:"Acceptance page",slug:$s,puckData:$d}}')"
call AC03-10 200 GET "/$BU_A/published/puck-pages/$PAGE" none; check AC03-10c "published still v2" '.. | .title? // empty | select(endswith("v2"))'
call AC03-11 200 GET "/$BU_A/preview/puck-pages/$PAGE" tok; check AC03-11c "preview shows draft v3" '.. | .title? // empty | select(endswith("v3"))'
call AC03-12 200 DELETE "/$BU_A/puck-pages/$PAGE/states/draft" tok
call AC03-13 200 GET "/$BU_A/preview/puck-pages/$PAGE" tok; check AC03-13c "preview back to v2" '.. | .title? // empty | select(endswith("v2"))'
call AC03-14 200 GET "/$BU_A/puck-pages/$PAGE/versions" tok; check AC03-14c "versions listed" 'length >= 1'
call AC03-15 200 GET "/$BU_A/puck-pages/$PAGE/states" tok
call AC03-16 200 GET "/$BU_A/puck-pages" tok; check AC03-16c "listed in A" "[.[]?.key] | index(\"$PAGE\") != null"
call AC03-17 200 GET "/$BU_B/puck-pages" tok; check AC03-17c "absent from B (isolation)" "[.[]?.key] | index(\"$PAGE\") == null"
call AC03-18 400 POST "/$BU_A/puck-pages" tok '{ bad json'; nostack AC03-18s
for i in 1 2 3 4 5 6; do call "AC03-19.$i" 200 PUT "/$BU_A/puck-pages/$PAGE" tok "$(jq -nc --arg s "/acc-$RUN_ID" --argjson d "$DATA3" '{value:{name:"Acceptance page",slug:$s,puckData:$d}}')"; done
call AC03-20 200 GET "/$BU_A/puck-pages/$PAGE/versions" tok; check AC03-20c "versions <= MAX_VERSIONS (${MAX_VERSIONS:-5})" "length <= ${MAX_VERSIONS:-5}"
call AC03-21 204 DELETE "/$BU_A/puck-pages/$PAGE" tok
call AC03-22 404 GET "/$BU_A/preview/puck-pages/$PAGE" tok

echo "== AC-04 content items"
call AC04-01 201 POST "/$BU_A/puck-contents" tok "$(jq -nc --argjson d "$DATA1" '{value:{name:"Acceptance content",contentType:"banner",puckData:$d}}')"
CONTENT=$(jq -r .key "$BODY")
call AC04-02 200 PUT "/$BU_A/puck-contents/$CONTENT/states/published?clearDraft=true" tok
call AC04-03 200 GET "/$BU_A/published/puck-contents/$CONTENT" none
call AC04-04 200 GET "/$BU_A/puck-contents/$CONTENT/versions" tok
call AC04-05 204 DELETE "/$BU_A/puck-contents/$CONTENT" tok

echo "== AC-05 templates"
call AC05-01 201 POST "/$BU_A/puck-templates" tok "$(jq -nc --argjson d "$DATA1" '{value:{name:"Acceptance template",kind:"page",puckData:$d}}')"
TPL=$(jq -r .key "$BODY")
call AC05-02 200 GET "/$BU_A/puck-templates?kind=page" tok; check AC05-02c "template listed" "[.[]?.key] | index(\"$TPL\") != null"
call AC05-03 200 GET "/$BU_A/puck-templates/$TPL" tok
call AC05-04 204 DELETE "/$BU_A/puck-templates/$TPL" tok

echo "== AC-06 configuration documents"
call AC06-pub 200 GET "/$BU_A/configuration/theme" none   # configuration reads are public (spec E)
call AC06-pub-all 200 GET "/$BU_A/configuration" none
for k in theme header footer facet site-metadata category-listing translations b2b-account-menu-links; do
  call "AC06-$k-c" 201 POST "/$BU_A/configuration/$k" tok '{"value":{"acceptance":"v1"}}'
  call "AC06-$k-r" 200 GET "/$BU_A/configuration/$k" tok
  call "AC06-$k-u" 200 PUT "/$BU_A/configuration/$k" tok '{"value":{"acceptance":"v2"}}'
  call "AC06-$k-d" 204 DELETE "/$BU_A/configuration/$k" tok
done

echo "== AC-07 datasources, product search, content-type import"
call AC07-01 201 POST "/datasource/acceptance-ds" tok '{"value":{"name":"Acceptance datasource","key":"acceptance-ds","params":[]}}'
call AC07-02 200 GET "/datasource" tok
call AC07-03 200 POST "/datasource/products-by-sku/test" tok '{"params":{"skus":["acceptance-no-such-sku"]}}'   # built-in datasource; body {params}
call AC07-04 204 DELETE "/datasource/acceptance-ds" tok
call AC07-05 200 GET "/products/search?text=a&limit=5&locale=en-US" tok
call AC07-06 200 POST "/$BU_A/content-type/import" tok '{}'
call AC07-07 200 POST "/content-type/import" tok '{}'

echo "== AC-08 media (skipped unless E2E_MEDIA=1)"
if [ "${E2E_MEDIA:-0}" = 1 ]; then
  PNG="$OUT/pixel.png"; printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==' | base64 -d > "$PNG"
  call AC08-01 200 POST "/$BU_A/upload-file" tok "" -F "file=@$PNG;type=image/png"
  URL=$(jq -r '.url // .value.url // empty' "$BODY"); [ -n "$URL" ] && { c=$(curl -s -o /dev/null -w '%{http_code}' "$URL"); [ "$c" = 200 ] && record AC08-02 PASS 200 200 "uploaded file fetchable" || record AC08-02 FAIL 200 "$c" "uploaded file fetchable"; }
  call AC08-03 200 GET "/$BU_A/media-library?extensions=png&page=1&limit=20" tok
else echo "SKIP AC-08 (set E2E_MEDIA=1 with a configured storage backend)"; fi

echo "== AC-09 CORS and project header"
code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$BASE_URL/$BU_A/puck-pages" -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST')
hdr=$(curl -s -D - -o /dev/null -X OPTIONS "$BASE_URL/$BU_A/puck-pages" -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' | tr -d '\r' | grep -i '^access-control-allow-origin' || true)
[ -z "$hdr" ] && record AC09-01 PASS none none "disallowed origin gets no ACAO header (status $code)" || record AC09-01 FAIL none "$hdr" "disallowed origin gets no ACAO header"
call AC09-02 401 POST "/$BU_A/puck-pages" none '{"value":{"name":"x","slug":"/x"}}' -H 'x-project-key: some-other-project'

echo; echo "RESULT pass=$PASS fail=$FAIL (details: $TSV, transcript: $OUT/transcript.txt)"
rm -f "$BODY"; [ "$FAIL" -eq 0 ]
```

## Appendix B - `tools/e2e/forge-jwt.mjs`

Prints deliberately invalid tokens (verified: `none` gives a 3-part token with empty signature).

```js
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
// Freely available, AS IS and UNSUPPORTED. See LICENSE.
// node forge-jwt.mjs none|unknown-key|expired|wrong-issuer|wrong-audience  -> prints a (deliberately invalid) JWT
import { createHmac } from 'node:crypto';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const kind = process.argv[2] ?? 'unknown-key';
const now = Math.floor(Date.now() / 1000);
const claims = { sub: 'forged', iss: kind === 'wrong-issuer' ? 'https://evil.example' : 'https://mc-api.europe-west1.gcp.commercetools.com',
  aud: kind === 'wrong-audience' ? 'https://not-this-service.example' : 'https://service.example', iat: now - 7200, exp: kind === 'expired' ? now - 3600 : now + 3600 };
if (kind === 'none') { console.log(`${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.`); }
else { const h = b64({ alg: 'HS256', typ: 'JWT', kid: 'forged-kid' }); const p = b64(claims);
  console.log(`${h}.${p}.${createHmac('sha256', 'not-a-real-secret').update(`${h}.${p}`).digest('base64url')}`); }
```

## Appendix C - `tools/e2e/cleanup.mjs`

Guards verified: wrong project key exits 2; non-prefixed container exits 2.

```js
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
// Freely available, AS IS and UNSUPPORTED. See LICENSE.
//
// Delete every custom object in the acceptance containers. Usage (Node 22, no dependencies):
//   CTP_PROJECT_KEY=... CTP_CLIENT_ID=... CTP_CLIENT_SECRET=... CTP_API_URL=... CTP_AUTH_URL=... \
//   E2E_ALLOW_PROJECT_KEY=<same project key> CONTAINERS=contentools-test-puck-page,... \
//   node tools/e2e/cleanup.mjs [--dry-run]
// Refuses to run unless every container name starts with "contentools-test-" and the project key equals E2E_ALLOW_PROJECT_KEY.
const env = (k) => { const v = process.env[k]; if (!v) { console.error(`missing ${k}`); process.exit(2); } return v; };
const project = env('CTP_PROJECT_KEY');
if (env('E2E_ALLOW_PROJECT_KEY') !== project) { console.error('E2E_ALLOW_PROJECT_KEY does not match CTP_PROJECT_KEY: refusing'); process.exit(2); }
const containers = env('CONTAINERS').split(',').map((c) => c.trim()).filter(Boolean);
const bad = containers.filter((c) => !c.startsWith('contentools-test-'));
if (bad.length) { console.error(`refusing: container(s) without the contentools-test- prefix: ${bad.join(', ')}`); process.exit(2); }
const dry = process.argv.includes('--dry-run');
const api = env('CTP_API_URL').replace(/\/$/, ''); const auth = env('CTP_AUTH_URL').replace(/\/$/, '');
const tok = await fetch(`${auth}/oauth/token`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${env('CTP_CLIENT_ID')}:${env('CTP_CLIENT_SECRET')}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
if (!tok.ok) { console.error(`token request failed: ${tok.status}`); process.exit(1); }
const headers = { Authorization: `Bearer ${(await tok.json()).access_token}` };
let deleted = 0, remaining = 0;
for (const c of containers) {
  for (;;) {
    const r = await fetch(`${api}/${project}/custom-objects/${encodeURIComponent(c)}?limit=100`, { headers });
    if (!r.ok) { console.error(`list ${c}: ${r.status}`); process.exit(1); }
    const { results } = await r.json();
    if (!results.length) break;
    for (const o of results) {
      if (dry) { console.log(`would delete ${c}/${o.key}`); remaining++; continue; }
      const d = await fetch(`${api}/${project}/custom-objects/${encodeURIComponent(c)}/${encodeURIComponent(o.key)}`, { method: 'DELETE', headers });
      if (!d.ok) { console.error(`delete ${c}/${o.key}: ${d.status}`); process.exit(1); }
      deleted++;
    }
    if (dry) break;
  }
}
console.log(dry ? `dry run: ${remaining} object(s) listed` : `deleted ${deleted} object(s); containers empty`);
```

## Appendix D - `tools/e2e/mcp-check.sh`

Syntax-checked only; the session-id handling follows the Streamable HTTP convention and must be confirmed against spec M's server (task 6.1).

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
# Freely available, AS IS and UNSUPPORTED. See LICENSE.
# MCP smoke check over Streamable HTTP. Needs MCP_URL (e.g. http://localhost:8081/mcp) and MCP_TOKEN (the credential the MCP app expects).
set -uo pipefail
: "${MCP_URL:?}" "${MCP_TOKEN:?}"
H=(-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream')
rpc() { curl -sS -D "$TMP/h" "${H[@]}" ${SID:+-H "Mcp-Session-Id: $SID"} ${AUTH:+-H "Authorization: Bearer $MCP_TOKEN"} --data "$1" "$MCP_URL"; }
TMP=$(mktemp -d); AUTH=1; fail=0
body=$(rpc '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"acceptance","version":"1"}}}')
SID=$(grep -i '^mcp-session-id' "$TMP/h" | awk '{print $2}' | tr -d '\r')
echo "$body" | grep -q '"result"' && echo "PASS initialize" || { echo "FAIL initialize: ${body:0:200}"; fail=1; }
rpc '{"jsonrpc":"2.0","method":"notifications/initialized"}' >/dev/null
tools=$(rpc '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')
echo "$tools" | grep -q 'tools' && echo "PASS tools/list ($(echo "$tools" | grep -o '"name"' | wc -l) names)" || { echo "FAIL tools/list"; fail=1; }
echo "$tools" | grep -iqE 'authenticate|project_?key|proxy|content_?item' && { echo "FAIL legacy tool names present"; fail=1; } || echo "PASS no legacy tools"
AUTH=; unauth=$(rpc '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"x","arguments":{}}}'); code=$(head -1 "$TMP/h" | awk '{print $2}')
{ [ "$code" = 401 ] || [ "$code" = 403 ] || echo "$unauth" | grep -qi 'unauthor\|auth'; } && echo "PASS unauthenticated call refused ($code)" || { echo "FAIL unauthenticated call not refused: $code"; fail=1; }
exit $fail
```

## Appendix E - RESULTS.md template

```markdown
# Acceptance run <run-id>  (date, tree state, service host only, sandbox project, who ran it)
| ID | Status | Evidence | Notes |
| -- | ------ | -------- | ----- |
| AC-01 | PASS | api/results.tsv | |
...
Defects found: <id -> owning spec -> fixed, re-run id>
Waivers: <id: reason, approved by, date>
Decision: LOCAL ACCEPTED | FULL ACCEPTED | NOT ACCEPTED
```
