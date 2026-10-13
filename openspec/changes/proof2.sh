#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
# Freely available, AS IS and UNSUPPORTED. See LICENSE.
#
# Anonymous clone proof. Usage:
#   tools/release/anonymous-proof.sh <clone-url> <expected-commit-prefix> [workdir]
# Runs with an empty HOME, no git credential helper and no npm configuration, so nothing
# private can be used. Writes one log per step to <workdir>/logs and prints PASS/FAIL lines.
# SKIP_BUILDS=1 only checks clone, hash and commit count (used to test this script).
set -uo pipefail
URL="${1:?clone url}"; WANT="${2:?expected commit prefix (8 chars) from the final gate run}"
WORK="${3:-$(mktemp -d)}"; LOGS="$WORK/logs"; mkdir -p "$LOGS"
FAKEHOME="$WORK/home"; mkdir -p "$FAKEHOME"
export HOME="$FAKEHOME" XDG_CONFIG_HOME="$FAKEHOME/.config" GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export npm_config_userconfig=/dev/null npm_config_globalconfig=/dev/null
unset NPM_TOKEN NODE_AUTH_TOKEN GH_TOKEN GITHUB_TOKEN YARN_NPM_AUTH_TOKEN
fail=0
step() { # step <name> <dir> <command...>
  local name=$1 dir=$2; shift 2
  if (cd "$dir" && "$@") > "$LOGS/$name.log" 2>&1; then echo "PASS $name"; else echo "FAIL $name (see $LOGS/$name.log)"; fail=1; fi
}
git clone --quiet "$URL" "$WORK/clone" > "$LOGS/clone.log" 2>&1 || { echo "FAIL clone"; exit 1; }
C="$WORK/clone"
head=$(git -C "$C" rev-parse HEAD); count=$(git -C "$C" rev-list --count HEAD)
[ "${head:0:${#WANT}}" = "$WANT" ] && echo "PASS commit $WANT matches gated commit" || { echo "FAIL commit $head != $WANT"; fail=1; }
[ "$count" = 1 ] && echo "PASS single commit" || { echo "FAIL $count commits"; fail=1; }
if [ "${SKIP_BUILDS:-0}" != 1 ]; then
  command -v corepack >/dev/null && corepack enable >/dev/null 2>&1 || true
  for app in service admin-app mcp; do   # npm projects (own package-lock.json)
    step "$app-install"   "$C/$app" npm ci
    step "$app-lint"      "$C/$app" npm run lint --if-present
    step "$app-typecheck" "$C/$app" npm run typecheck --if-present
    step "$app-test"      "$C/$app" npm test
    step "$app-build"     "$C/$app" npm run build
  done
  step puck-install   "$C/puck" yarn install --immutable
  step puck-lint      "$C/puck" yarn lint
  step puck-typecheck "$C/puck" yarn typecheck
  step puck-build     "$C/puck" yarn build
  step puck-test      "$C/puck" yarn test
  step playground-build "$C/puck/playground" yarn build
  step root-docs-check "$C" node tools/check-docs-lint.mjs
  command -v commercetools >/dev/null && step connect-validate "$C" commercetools connect validate
fi
echo; [ "$fail" -eq 0 ] && echo "ANONYMOUS PROOF: PASS (logs in $LOGS)" || echo "ANONYMOUS PROOF: FAIL (logs in $LOGS)"
exit $fail
