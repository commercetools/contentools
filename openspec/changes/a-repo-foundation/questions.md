# Questions raised by A

| ID | Question | Recommended default (A proceeds on it) |
| -- | -------- | -------------------------------------- |
| Q-A1 | Package manager per Connect app. | Settled by the owner: Yarn everywhere (Yarn 1 classic for service, admin-app, mcp with committed `yarn.lock`; Yarn 4.5.1 for puck). |
| Q-A2 | `service/postman/*` (Postman collection/environment, 100% tenant + legacy routes, named `cms-api-*`) is not copied. Regenerate a collection later? | Do not copy; P's API reference replaces it. Optional: F exports a fresh collection from the final route table. |
| Q-A3 | Root scripts are plain package.json scripts, runnable as `yarn x` or `yarn x`. Accept? | Yes; P documents `yarn verify`. |
| Q-A4 | `tools/labs-publish.mjs` wraps the installed presales skill instead of vendoring `ossify`/`gate` (policy.json must not enter the repo). R may need its own `tools/ossify.mjs`/`gate.mjs` names; keep the wrapper. | Keep wrapper; R extends it. |
| Q-A5 | ossify refuses 3 files that merely have a field named `copyright` (FooterBlock x2, footer-block sample). Header added by hand; the labs `gate.mjs` may still flag them. | Hand-add headers (A 6.2a); R checks the gate output and decides. |
