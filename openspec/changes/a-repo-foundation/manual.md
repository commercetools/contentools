# Manual steps discovered by A

| ID | Step | Needed before |
| -- | ---- | ------------- |
| M-A1 | Run `corepack enable` once on the implementer's machine so the Yarn 4 version in `puck/package.json` (`packageManager: yarn@4.5.1`) is available. | Any `yarn` command in `puck/` (spec I) |
| M-A2 | Ensure the presales plugin (skill `commercetools-labs-publish`) is installed locally, or set `LABS_PUBLISH_DIR` to a folder with `ossify.mjs`/`gate.mjs`. | A task 6.1, R |
