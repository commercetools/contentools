## Context

A delivered the tree (479 files). Before the architectural specs start (D single tenant, I puck workspace, K admin app, M MCP) the
dead legacy surface and the forbidden names must go, otherwise every later diff mixes mechanical noise with design changes.
The owner decisions that frame C: Q-02 (drop all legacy), no GitHub Actions (old `.github` is dropped, not replaced), Firestore is gone
entirely, no "cms" anywhere.

## Goals / Non-Goals

**Goals**: delete exactly the legacy surface (explore.md section 2/3) with proof that nothing kept uses it; rename forbidden identifiers in one pass; ship a guard that keeps the tree clean and makes the remaining tenant/Firestore work visible.
**Non-Goals**: removing multi-tenancy itself (D/E/J/K/M), changing runtime behaviour of kept routes, upgrading dependencies, rewriting READMEs (P), choosing the final CSP (L).

## Decisions

1. **Order inside C: guard and proof first, deletion second.** The guard gives a measurable baseline and the call-site script proves the "keep" list before anything is deleted. Rejected: delete first and rely on compile errors (would not catch runtime calls from the UI, which are string URLs, not imports).
2. **Delete, not deprecate** (Q-02). The old `deprecationMiddleware` is deleted with the routes.
3. **Keep `POST /content-type/import` in `content-type.route.ts`** (the file name stays; D/F may rename). It is the only caller of `secure-transpiler` and `samples`, and puck-api calls it (`configuration.api.ts:81`).
4. **C covers `service/` and `mcp/` only (coordinator decision after drafting I/J).** The scope rename and the `cms` directory rename inside `puck/` belong to spec I (one coherent puck diff with versions/exports); the admin-app renames belong to K. C hands over the exact work list (tasks.md Section 6) and keeps `puck/` and `admin-app/` as pending prefixes. Rejected: a repo-wide scripted rename in C (conflicts with I's commits, and K deletes half of the admin-app files anyway).
5. **Directory names** (applied by C for the service, by I for puck): `components/cms` -> `components/blocks` (built-in content block components), `service/src/samples/CMS` -> `samples/content-types` (sample content types imported by `content-type/import`). Alternatives (`components/content`, `samples/blocks`) rejected as ambiguous with `puck-contents`.
6. **Env var `CMS_API_URL` -> `CONTENTOOLS_SERVICE_URL`** (applied by K), by analogy with the sibling labs repo (`SEARCH_CONFIG_SERVICE_URL`). L fills it from the Connect service URL. Recorded as Q-C1.
7. **Guard design**: a terms list + a *pending file list* with owners. A term hit in an unlisted file fails; a listed file without hits also fails (stale), so ownership is explicit and the list can only shrink. Rejected: a simple allow-everything-for-now (would rot) and failing hard on tenant terms now (C could never be green because D/E/J/K/M have not run).
8. **Firestore** gets the same treatment as the other terms but with an *empty* allow list required at C's end (owner: gone entirely). The datasource store is the one non-obvious dependency (`routes/datasource.route.ts` uses `projects/<pk>/datasources`); D must move it to a custom-object container. Until then the file is pending-D.
9. **Dead code is deleted in C when an import-graph walk proves it unreachable** (even if not strictly "legacy", e.g. `utils/distance.ts`), so D does not have to wonder. `validators/env.validators.ts` is the one exception (kept as a model for D's env validation).
10. **MCP pruning is limited to deleting legacy tools; no rewiring.** Auth (`projectKey`, `x-project-key`) in `functions.ts`/`types/auth.ts` stays for M.

## Risks / Trade-offs

- [A kept file secretly calls a legacy route] -> `check-legacy-route-calls` over every front-end tree + import-graph walk + curl 404 checks.
- [Pending list becomes a dumping ground] -> stale-entry failure + owner comment + O requires it empty.
- [Replacing `CMS_API_URL` collides with K/L naming] -> Q-C1; K/L may rename in one commit since the name appears in 8 places only.

## Migration Plan

1. guard + proof scripts, 2. proof of usage, 3. service, 4. MCP, 5. hand-over notes for puck/admin-app, 6. pending list, 7. verify. Rollback = redo A's copy for the touched tree (idempotent) and re-apply tasks selectively.

## File layout produced (changes only)

```
tools/check-forbidden-terms.mjs        tools/forbidden-pending.txt   tools/forbidden-allow.txt (empty)
tools/check-legacy-route-calls.mjs     tools/test/{check-forbidden-terms,check-legacy-route-calls}.test.mjs
service/src/samples/content-types/*    (was samples/CMS)
(puck/ untouched: spec I renames components/cms -> blocks)
```

## Open Questions

Q-C1 (env var name), Q-C2 (`GET /datasource` public?) in questions.md.
