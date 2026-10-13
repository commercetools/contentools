# Manual steps (spec I)

| ID | Step | When |
| -- | ---- | ---- |
| M-I1 | Make sure the npm scope `@commercetools-labs` exists as an npm organisation and that the publishing maintainer is a member with publish rights (`npm org ls commercetools-labs`). Without the org the first scoped publish fails with E404/E403. | before the first `release:publish --execute` (rc) |
| M-I2 | The maintainer runs `npm login` (2FA enabled) locally, then `node puck/scripts/publish-packages.mjs` (dry run) and `... --execute`. npm asks for the one-time password during each of the 10 publishes (the script cannot and must not automate it). | rc publish (M-08) and final 1.0.0 |
| M-I3 | Confirm that names `@commercetools-labs/puck-*` are free: `npm view @commercetools-labs/puck-types version` should return E404. | before M-I2 |
