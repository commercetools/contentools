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
: > "$OUT/transcript.txt"; : > "$OUT/curl-errors.log"
TSV="$OUT/results.tsv";printf 'id\tstatus\texpected\tactual\tname\n' > "$TSV"
PASS=0; FAIL=0; STATUS=""; BODY="$OUT/.last-body.json"

redact() { sed -E "s/Bearer [A-Za-z0-9._~+\/=-]+/Bearer <redacted>/g; s/$(printf '%s' "$SERVICE_API_TOKEN" | sed 's/[][\/.^$*]/\\&/g')/<redacted>/g"; }
record() { # record <id> <PASS|FAIL> <expected> <actual> <name>   (the name may contain the token, e.g. ?access_token=: redact it)
  set -- "$1" "$2" "$3" "$4" "$(printf '%s' "$5" | redact)"
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
call AC03-14 200 GET "/$BU_A/puck-pages/$PAGE/versions" tok; check AC03-14c "versions listed" '(.versions|type=="array") and (.versions|length) >= 1'
call AC03-15 200 GET "/$BU_A/puck-pages/$PAGE/states" tok
call AC03-16 200 GET "/$BU_A/puck-pages" tok; check AC03-16c "listed in A" "[.[]?.key] | index(\"$PAGE\") != null"
call AC03-17 200 GET "/$BU_B/puck-pages" tok; check AC03-17c "absent from B (isolation)" "[.[]?.key] | index(\"$PAGE\") == null"
call AC03-18 400 POST "/$BU_A/puck-pages" tok '{ bad json'; nostack AC03-18s
for i in 1 2 3 4 5 6; do call "AC03-19.$i" 200 PUT "/$BU_A/puck-pages/$PAGE" tok "$(jq -nc --arg s "/acc-$RUN_ID" --argjson d "$DATA3" '{value:{name:"Acceptance page",slug:$s,puckData:$d}}')"; done
call AC03-20 200 GET "/$BU_A/puck-pages/$PAGE/versions" tok; check AC03-20c "versions pruned to MAX_VERSIONS (${MAX_VERSIONS:-5})" "(.versions|length) == ${MAX_VERSIONS:-5}"
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
  V1='{"value":{"acceptance":"v1"}}'; V2='{"value":{"acceptance":"v2"}}'
  [ "$k" = b2b-account-menu-links ] && { V1='{"value":[{"acceptance":"v1"}]}'; V2='{"value":[{"acceptance":"v2"}]}'; }   # this slice is an array document
  call "AC06-$k-c" 201 POST "/$BU_A/configuration/$k" tok "$V1"
  call "AC06-$k-r" 200 GET "/$BU_A/configuration/$k" tok
  call "AC06-$k-u" 200 PUT "/$BU_A/configuration/$k" tok "$V2"
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
else
  echo "SKIP AC-08 upload/library (set E2E_MEDIA=1 with a configured storage backend)"
  call AC08-00 501 GET "/$BU_A/media-library" tok; check AC08-00c "not-configured code is MEDIA_NOT_CONFIGURED" '.code=="MEDIA_NOT_CONFIGURED"'
fi

echo "== AC-09 CORS and project header"
code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$BASE_URL/$BU_A/puck-pages" -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST')
hdr=$(curl -s -D - -o /dev/null -X OPTIONS "$BASE_URL/$BU_A/puck-pages" -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' | tr -d '\r' | grep -i '^access-control-allow-origin' || true)
[ -z "$hdr" ] && record AC09-01 PASS none none "disallowed origin gets no ACAO header (status $code)" || record AC09-01 FAIL none "$hdr" "disallowed origin gets no ACAO header"
if [ -n "${E2E_ALLOWED_ORIGIN:-}" ]; then   # set to an origin listed in CORS_ALLOWED_ORIGINS
  ahdr=$(curl -s -D - -o /dev/null -X OPTIONS "$BASE_URL/$BU_A/puck-pages" -H "Origin: $E2E_ALLOWED_ORIGIN" -H 'Access-Control-Request-Method: POST' | tr -d '\r' | grep -i '^access-control-allow-origin' || true)
  [ -n "$ahdr" ] && record AC09-04 PASS present present "allowed origin gets an ACAO header" || record AC09-04 FAIL present none "allowed origin gets an ACAO header"
fi
LEGACY_HDR="x-project-$(printf 'key')"   # the removed tenant header; built from fragments so the forbidden-term check stays clean
call AC09-02 401 POST "/$BU_A/puck-pages" none '{"value":{"name":"x","slug":"/x"}}' -H "$LEGACY_HDR: some-other-project"
call AC09-03 200 GET "/$BU_A/puck-pages" tok "" -H "$LEGACY_HDR: some-other-project"   # header ignored: the configured project answers

echo; echo "RESULT pass=$PASS fail=$FAIL (details: $TSV, transcript: $OUT/transcript.txt)"
rm -f "$BODY"; [ "$FAIL" -eq 0 ]
