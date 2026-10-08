# Browser verification playbooks

Scripted checks driven through the Chrome DevTools connector (agent tools named `mcp__chrome-devtools__*`). They run
against the fake commercetools server, so no sandbox project is needed. Only the Merchant Center playbook (05) needs a
human login.

| File | Purpose |
| ---- | ------- |
| `01-start-stack.md` | start fake-ct, service and playground |
| `02-playground-smoke.md` | load the playground, create a page, check network and console |
| `03-editor-drag-drop.md` | open the editor, drag a component, publish |
| `04-renderer-ssr.md` | render the published page in the playground renderer |
| `05-mc-app-owner-assisted.md` | custom application inside Merchant Center (owner logs in) |

## Conventions

* **Evidence**: save screenshots and notes to `plans/evidence/<spec-id>/<playbook>-<step>.png`. That folder is git-ignored;
  never commit evidence. Record the outcome of every run in the implementation log.
* **Never screenshot secrets**: tokens, client secrets, cookies. Redact or crop; do not paste header values into notes.
* **Snapshots**: `mcp__chrome-devtools__take_snapshot` returns an accessibility tree where every element has a `uid`.
  Take a fresh snapshot after every navigation or large DOM change, then pass those `uid` values to `click`, `fill`
  and `drag`. A uid from an older snapshot may be stale.
* **Viewport**: `mcp__chrome-devtools__resize_page` to 1440x900 first.
* **After `new_page`** the new tab may not be selected: call `mcp__chrome-devtools__select_page` if snapshots show the wrong page.
* **Connector detached**: when the `mcp__chrome-devtools__*` tools are unavailable, do not simulate the run. Record
  "browser verification not run: connector detached" and rely on the automated tests.
