# New owner questions (spec H)

| ID | Question | Recommended default (assumed in the specs) | Affects |
| -- | -------- | ------------------------------------------ | ------- |
| Q-H1 | The brief's locked decision lists `CTP_REGION` as an injected variable, but Connect injects `CTP_API_URL` and `CTP_AUTH_URL` (docs: connect/modify-connector) and no region. OK to read the two URLs directly (spec D's client builder) and drop `CTP_REGION`? | Yes; local `.env` sets the two URLs. | D, H, B |
| Q-H2 | `postDeploy` **fails** (exit 1) on bad credentials, missing scope or misconfigured/unreachable storage, and only **warns** when Product Search is inactive. Prefer warn-and-continue for everything? | Fail on the listed errors (a deployed-but-broken content service is worse); warn for Product Search. | H |
| Q-H3 | Maximum upload size: default 10 MiB, ceiling 25 MiB (512 MB container). The Connect gateway's own request-body limit is undocumented. Is there a hard requirement for bigger media (video)? | No; verify the gateway limit in the first sandbox deployment and lower the default if needed. | G, H |
| Q-H4 | Is Product Search activated in the owner's sandbox project? The picker and the SKU datasources need it (it also deactivates itself after 30 days without calls). | Assume yes in the sandbox; `postDeploy` warns otherwise. | H, Q |
| Q-H5 | The `service` app inherits the generated API client for the whole `connect.yaml` (`inheritAs` is top-level). OK that `admin-app` and `mcp` (specs L, M) share the same two scopes and may not widen them? | Yes. | H, L, M |
| Q-H6 | `SERVICE_API_TOKEN` is declared per app (service, mcp). Hoist it to `inheritAs.configuration` so one value feeds both? It would also reach admin-app. | Keep per app (least exposure). | H, M |
| Q-H7 | Package manager: Yarn 1 classic for service, admin-app and mcp (owner decision, shared with spec D; Q-D4 closed). Lifecycle commands in `connect.yaml` are `yarn connector:post-deploy` and `yarn connector:pre-undeploy`. | Decided. | D, H, L, M |
