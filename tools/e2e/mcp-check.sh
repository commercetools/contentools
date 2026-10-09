#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
# Freely available, AS IS and UNSUPPORTED. See LICENSE.
#
# MCP smoke check over stateless Streamable HTTP (spec Q, AC-12). Needs bash, curl, jq.
#   MCP_URL=http://localhost:8081/mcp MCP_TOKEN=<MCP_ACCESS_TOKEN> tools/e2e/mcp-check.sh
# Optional round trip (needs MCP_ENABLE_WRITES=true on the server): also set
#   BASE_URL=http://localhost:8080/service SERVICE_API_TOKEN=<service token> E2E_BU=contentools-acceptance
# The script then creates a page through the create tool, reads it back through the service, deletes it through the delete tool.
set -uo pipefail
: "${MCP_URL:?set MCP_URL}" "${MCP_TOKEN:?set MCP_TOKEN}"
BU="${E2E_BU:-contentools-acceptance}"
RUN_ID="${RUN_ID:-$(date +%Y%m%d-%H%M%S)}"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
fail=0
ok() { echo "PASS $*"; }
bad() { echo "FAIL $*"; fail=1; }
# rpc <auth-token-or-empty> <json>  -> prints the JSON-RPC message (SSE "data:" frames are unwrapped), status in $TMP/code
rpc() {
  local tok=$1 data=$2 args=(-sS -o "$TMP/body" -w '%{http_code}' -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream')
  [ -n "$tok" ] && args+=(-H "Authorization: Bearer $tok")
  curl "${args[@]}" --data "$data" "$MCP_URL" > "$TMP/code" 2>/dev/null || echo 000 > "$TMP/code"
  if grep -q '^data:' "$TMP/body" 2>/dev/null; then sed -n 's/^data: *//p' "$TMP/body" | head -1; else cat "$TMP/body"; fi
}
code() { cat "$TMP/code"; }

init=$(rpc "$MCP_TOKEN" '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"acceptance","version":"1"}}}')
echo "$init" | jq -e '.result.serverInfo' >/dev/null 2>&1 && ok "initialize ($(echo "$init" | jq -r '.result.serverInfo.name'))" || bad "initialize: $(code) ${init:0:200}"

tools=$(rpc "$MCP_TOKEN" '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')
names=$(echo "$tools" | jq -r '.result.tools[]?.name' 2>/dev/null)
n=$(printf '%s\n' "$names" | grep -c . || true)
[ "$n" -gt 0 ] && ok "tools/list ($n names)" || bad "tools/list: $(code)"
printf '%s\n' "$names" | grep -iqE 'authenticate|project_?key|proxy|content_?item|compile_upload|grid' && bad "legacy tool names present" || ok "no legacy tools"

rpc "" '{"jsonrpc":"2.0","id":3,"method":"tools/list"}' >/dev/null
c=$(code); { [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "unauthenticated call refused ($c)" || bad "unauthenticated call not refused: $c"
rpc "wrong-token-$RUN_ID-wrong-token-wrong" '{"jsonrpc":"2.0","id":3,"method":"tools/list"}' >/dev/null
c=$(code); { [ "$c" = 401 ] || [ "$c" = 403 ]; } && ok "wrong token refused ($c)" || bad "wrong token not refused: $c"

if [ "${MCP_EXPECT_SERVICE_REJECT:-0}" != 1 ]; then
  r=$(rpc "$MCP_TOKEN" "$(jq -nc --arg bu "$BU" '{jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"list_puck_pages",arguments:{businessUnitKey:$bu}}}')")
  echo "$r" | jq -e '.result and ((.result.isError // false) == false)' >/dev/null 2>&1 && ok "tools/call list_puck_pages" || bad "tools/call list_puck_pages: $(code) ${r:0:200}"
fi

if [ "${MCP_EXPECT_SERVICE_REJECT:-0}" = 1 ]; then
  # negative mode: the MCP app was started with a wrong service credential, so a write must come back as a tool error
  NAME="MCP-neg $RUN_ID"
  r=$(rpc "$MCP_TOKEN" "$(jq -nc --arg bu "$BU" --arg n "$NAME" '{jsonrpc:"2.0",id:7,method:"tools/call",params:{name:"create_puck_page",arguments:{businessUnitKey:$bu,value:{name:$n,slug:"/mcp-neg",puckData:{content:[],root:{props:{}}}}}}}')")
  echo "$r" | jq -e '.result.isError == true' >/dev/null 2>&1 && ok "create_puck_page returns a tool error ($(echo "$r" | jq -r '.result.content[0].text' | cut -c1-60))" || bad "create_puck_page did not fail: ${r:0:200}"
  if [ -n "${BASE_URL:-}" ] && [ -n "${SERVICE_API_TOKEN:-}" ]; then
    left=$(curl -sS -H "Authorization: Bearer $SERVICE_API_TOKEN" "$BASE_URL/$BU/puck-pages" | jq --arg n "$NAME" '[.[]? | select(.value.name == $n)] | length')
    [ "$left" = 0 ] && ok "no page was created" || bad "a page was created ($left)"
  fi
elif [ -n "${BASE_URL:-}" ] && [ -n "${SERVICE_API_TOKEN:-}" ] && printf '%s\n' "$names" | grep -qx create_puck_page; then
  NAME="MCP $RUN_ID"; SLUG="/mcp-$RUN_ID"
  r=$(rpc "$MCP_TOKEN" "$(jq -nc --arg bu "$BU" --arg n "$NAME" --arg s "$SLUG" '{jsonrpc:"2.0",id:5,method:"tools/call",params:{name:"create_puck_page",arguments:{businessUnitKey:$bu,value:{name:$n,slug:$s,puckData:{content:[],root:{props:{}}}}}}}')")
  if echo "$r" | jq -e '(.result.isError // false) == false' >/dev/null 2>&1; then ok "tools/call create_puck_page"; else bad "create_puck_page: ${r:0:300}"; fi
  list=$(curl -sS -H "Authorization: Bearer $SERVICE_API_TOKEN" "$BASE_URL/$BU/puck-pages")
  key=$(echo "$list" | jq -r --arg n "$NAME" '[.[]? | select(.value.name == $n)][0].key // empty')
  [ -n "$key" ] && ok "page created by the tool is readable through the service" || bad "page created by the tool not found through the service"
  if [ -n "$key" ]; then
    r=$(rpc "$MCP_TOKEN" "$(jq -nc --arg bu "$BU" --arg k "$key" '{jsonrpc:"2.0",id:6,method:"tools/call",params:{name:"delete_puck_page",arguments:{businessUnitKey:$bu,key:$k}}}')")
    gone=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $SERVICE_API_TOKEN" "$BASE_URL/$BU/preview/puck-pages/$key")
    [ "$gone" = 404 ] && ok "tools/call delete_puck_page (page gone: $gone)" || bad "delete_puck_page: page still answers $gone"
  fi
else
  echo "SKIP create/read/delete round trip (set BASE_URL and SERVICE_API_TOKEN, start the server with MCP_ENABLE_WRITES=true)"
fi
exit $fail
