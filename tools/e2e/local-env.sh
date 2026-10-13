# SPDX-License-Identifier: MIT
# Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
# Freely available, AS IS and UNSUPPORTED. See LICENSE.
#
# Source this file (do not execute) to prepare the shell for a local acceptance run (spec Q, phase 1):
#   E2E_ENV_FILE=/path/to/sandbox.env . tools/e2e/local-env.sh
# The env file holds the sandbox API client as E2E_CTP_* variables (see service/e2e/README.md).
# It maps them to the CTP_* names the service expects, generates throw-away SERVICE_API_TOKEN and
# MCP_ACCESS_TOKEN values, and sets an isolating CONTAINER_PREFIX. Values are never printed.
: "${E2E_ENV_FILE:?set E2E_ENV_FILE to the sandbox env file}"
# parse as dotenv (values may contain spaces; the file is not valid shell)
while IFS= read -r _line || [ -n "$_line" ]; do
  case "$_line" in ''|'#'*) continue ;; esac
  _k=${_line%%=*}; _v=${_line#*=}
  _k=${_k#export }; _k=${_k// /}
  case "$_k" in *[!A-Za-z0-9_]*|'') continue ;; esac
  case "$_v" in \"*\") _v=${_v#\"}; _v=${_v%\"} ;; \'*\') _v=${_v#\'}; _v=${_v%\'} ;; esac
  export "$_k=$_v"
done < "$E2E_ENV_FILE"
unset _line _k _v
for k in E2E_CTP_PROJECT_KEY E2E_CTP_CLIENT_ID E2E_CTP_CLIENT_SECRET E2E_CTP_REGION E2E_CTP_SCOPE E2E_ALLOW_PROJECT_KEY; do
  [ -n "${!k:-}" ] || { echo "local-env: missing $k" >&2; return 2 2>/dev/null || exit 2; }
done
[ "$E2E_ALLOW_PROJECT_KEY" = "$E2E_CTP_PROJECT_KEY" ] || { echo "local-env: E2E_ALLOW_PROJECT_KEY must equal E2E_CTP_PROJECT_KEY" >&2; return 2 2>/dev/null || exit 2; }
export CTP_PROJECT_KEY=$E2E_CTP_PROJECT_KEY CTP_CLIENT_ID=$E2E_CTP_CLIENT_ID CTP_CLIENT_SECRET=$E2E_CTP_CLIENT_SECRET CTP_SCOPE=$E2E_CTP_SCOPE
export CTP_API_URL=${E2E_CTP_API_URL:-https://api.$E2E_CTP_REGION.commercetools.com}
export CTP_AUTH_URL=${E2E_CTP_AUTH_URL:-https://auth.$E2E_CTP_REGION.commercetools.com}
export RUN_ID=${RUN_ID:-$(date +%Y%m%d-%H%M%S)}
export CONTAINER_PREFIX=${CONTAINER_PREFIX:-contentools-test-q-$(printf '%s' "$RUN_ID" | tr -d '-')-}
export SERVICE_API_TOKEN=${SERVICE_API_TOKEN:-$(openssl rand -base64 32 | tr -d '\n')}
export MCP_ACCESS_TOKEN=${MCP_ACCESS_TOKEN:-$(openssl rand -base64 32 | tr -d '\n')}
export MAX_VERSIONS=${MAX_VERSIONS:-3}
export PORT=${PORT:-8080}
export BASE_URL=${BASE_URL:-http://localhost:$PORT/service}
export EVIDENCE_DIR=${EVIDENCE_DIR:-$PWD/plans/evidence/q/$RUN_ID}
mkdir -p "$EVIDENCE_DIR/api" "$EVIDENCE_DIR/ui" "$EVIDENCE_DIR/mc" "$EVIDENCE_DIR/mcp" "$EVIDENCE_DIR/connect"
