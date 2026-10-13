## Why

A labs repository must be published public from the start, from a single clean commit, with a green blocking gate, and must be proven to build for an anonymous cloner. The procedure exists in the publish skill but is generic and partly wrong for this repository (Yarn, several apps, npm packages with workspace dependencies, an admin app whose lockfile needs the packages on the registry, no CI). Publishing is outward-facing and irreversible, so the steps, their exact tool behaviours and the stop-and-ask checkpoints must be written down before anyone runs them.

## What Changes

- Define the release procedure end to end (no private fork): export a clean release tree, `ossify.mjs --apply`, community files, sanitise, local verification, scratch commit + `gate.mjs` pre-flight, npm publish of the puck release candidate (public packages, dependency order), pin and lock `admin-app`, the squashed initial commit by the owner's identity + gate, `gh repo create --public`, push, labs property and topic, tag `v1.0.0-rc.N`, anonymous clone proof, Connect deployment tests from the same repository by tag, fixes as normal commits while the gate stays clean, then the final `1.0.0` publish and `v1.0.0` tag.
- Document exact behaviours and refusals of `ossify.mjs` and `gate.mjs` (including the rule that directories carrying their own LICENSE fail, so `service/LICENSE` must go; the loose "copyright" refusal; refusal to run on a dirty tree).
- Define `--ack` handling for WARN findings and the fix loop (before the first push: recreate the unpublished commit; after it: normal commits while the gate stays clean).
- Define three owner checkpoints (CP-1 `go npm-rc`, CP-2 `go repo`, CP-3 `go final`) tied to manual steps M-06, M-07, M-10.
- Define the anonymous clone proof (fresh HOME, no credentials, every app and puck: install, typecheck, test, build) and the post-launch checks.
- No product code changes; any defect found goes back to the dev tree and the owning spec.

## Capabilities

### New Capabilities
- `publish-procedure`: ordered release steps, gate and ossify requirements, checkpoints and refusals.
- `anonymous-clone-proof`: the proof that the published repository installs, typechecks, tests and builds for anyone, and that npm packages install without credentials.

### Modified Capabilities
<!-- none -->

## Impact

- Creates the public repository `commercetools/contentools` (initial single squashed commit, tags `v1.0.0-rc.N` and `v1.0.0`), sets the org property and topic, publishes `@commercetools-labs/puck-*` release candidates and `1.0.0` (and the MCP package if spec N publishes it) to npm as public packages.
- Depends on O (tooling), I (puck release scripts), P (docs), Q (LOCAL ACCEPTED before the rc, FULL ACCEPTED before the final). Requires M-06, M-07, M-10.
- Uses `/Users/behnam/.claude/plugins/cache/presales-plugin/presales/0.29.4/skills/commercetools-labs-publish/scripts/{ossify,gate}.mjs` and `policy.json` in place; nothing from the policy is copied into the repository.
