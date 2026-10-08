# Questions for the owner (spec J)

| ID | Question | Recommended default (assumed) | Affects |
| -- | -------- | ----------------------------- | ------- |
| Q-J1 | ANSWERED (spec E section 4, F section 2): public = published page/content reads and queries and all `GET /:bu/configuration/*`; protected = preview, lists/gets with states, templates, media, `/products/search`, datasource management, all writes; `SERVICE_API_TOKEN` accepted on all protected routes. `PUCK_AUTH_POLICY` implements exactly this. | Closed | E, F, J |
| Q-J2 | ANSWERED (spec E D-E10): datasource resolve is public only with `PUBLIC_DATASOURCE_RESOLVE=true` (default false, rate limited); `/products/search` always protected. Published reads embed `resolvedData`, so public rendering needs no call. J: policy `attach` for resolve, `publicDatasourceResolve` connection flag, storefront SSR resolves server-side with a token. | Closed | E, F, J |
| Q-J3 | Does the MC forward-to proxy carry multipart `FormData` uploads (`POST /:bu/upload-file`)? Undocumented. | Test in K with the real MC; fallback: adapter converts to JSON/base64 or uploads straight to storage via a signed URL (G). Puck contract unchanged. | G, K |
| Q-J4 | Next.js App Router consumers need `'use client'` on hook-using exports (`PuckRenderer`, managers). Add directives to the tsup output? | Not in 1.0; document "import from a client component" in the README. | J, P |
| Q-J5 | Keep a deprecated `projectKey` prop that is ignored, to ease migration? | No (first labs release, different scope; clean break). | J |
| Q-J6 | German catalog is machine-translated (design D-14). Acceptable for 1.0? | Yes, flagged "machine translated" in the package README. | J, K, P |
| Q-J7 | ANSWERED (spec E/D error body `{ message, statusCode, correlationId, code?, errors? }`). J parses `code`; the 501 status is the trigger. Open nit for G/E: G names the code `MEDIA_NOT_CONFIGURED`, E's note says `MEDIA_NOT_CONFIGURED`; pick one (client does not depend on it). | Closed; align names in G | E, G, J |
