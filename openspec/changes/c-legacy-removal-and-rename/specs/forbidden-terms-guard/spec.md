## ADDED Requirements

### Requirement: Guard script
`tools/check-forbidden-terms.mjs` SHALL scan the files returned by `tools/lib/files.mjs` (git when available, filesystem walk otherwise) for the terms: cms, `demo`/`demos` as words, commercetools-demo, ct-poc, poc (word), pre-sales/presales, multitenant, contenttools, `run.app`, `Cloud Run`, `gcloud`, sellertools, frontend.site, firestore, x-project-key, authenticate-project, refresh-jwt, validateProject (all case-insensitive except validateProject), and exit 1 listing `path:line: [term] text` for every hit.

#### Scenario: Hit reported
- **WHEN** a tracked `.ts` file contains the word `Firestore`
- **THEN** the guard exits 1 and prints that file, line and `[firestore]`

### Requirement: Names and manifests are scanned too
The guard SHALL match the terms against every file and folder NAME in the path (for example `components/cms/`, `samples/CMS/`, `cms-api-postman-collection.json`), and against `package.json` text such as `description` fields ("Puck CMS integration"), not only against source text.

#### Scenario: Folder name caught
- **WHEN** a file exists at `puck/packages/puck-editor/src/components/cms/FooterBlock.tsx`
- **THEN** the guard reports a `[cms]` hit for that path (tolerated only while `puck/` is a pending prefix)

#### Scenario: Description caught
- **WHEN** a `package.json` has `"description": "TypeScript types for the Puck CMS integration"`
- **THEN** the guard reports a `[cms]` hit on that line

### Requirement: Firestore is forbidden outright
The term `firestore` SHALL be forbidden in every file under the repository root except files explicitly allow-listed in `tools/forbidden-allow.txt` (intended only for a migration note in `docs/`), and the allow-list MUST be empty at the end of spec C.

#### Scenario: Dependency removed
- **WHEN** the guard runs on the final tree
- **THEN** `@google-cloud/firestore`, `GCP_FIRESTORE_*` and `firestore.utils` produce no hits

### Requirement: Excluded paths
The guard SHALL skip `openspec/`, `plans/`, `.claude/`, lockfiles, binary files, `tools/check-forbidden-terms.mjs` and `tools/test/check-forbidden-terms.test.mjs`.

#### Scenario: Planning docs may quote the words
- **WHEN** `openspec/changes/c-legacy-removal-and-rename/explore.md` contains `commercetools-demo`
- **THEN** the guard does not report it

### Requirement: Pending list shrinks, never rots
`tools/forbidden-pending.txt` SHALL list, one path (or `dir/` prefix) per line with a `# owner-spec` comment, the files that still contain tenant-related terms and are owned by D, E, J, K or M; hits in listed files are tolerated, but a listed path with no hit or no file MUST fail the guard as "stale pending entry", and a hit in an unlisted file MUST fail it.

#### Scenario: Stale entry fails
- **WHEN** a pending path no longer contains any forbidden term
- **THEN** the guard exits 1 with `stale pending entry: <path>`

### Requirement: Final state is empty
At the completion of spec O the pending list MUST be empty; the guard reports `forbidden-terms: OK (0 hits, 0 pending)`.

#### Scenario: Strict flag
- **WHEN** `node tools/check-forbidden-terms.mjs --require-empty-pending` runs while the pending list has entries
- **THEN** it exits 1 with `pending list must be empty in strict mode`

#### Scenario: Release candidate
- **WHEN** `yarn check:forbidden` is run on the release tree
- **THEN** it prints `forbidden-terms: OK (0 hits, 0 pending)`
