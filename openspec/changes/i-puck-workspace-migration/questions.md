# Questions for the owner (spec I)

| ID | Question | Recommended default (assumed) | Affects |
| -- | -------- | ----------------------------- | ------- |
| Q-I1 | The master plan says i18n "en, de" but the packages ship only `en` and `es` catalogs (`packages/*/src/intl/{en,es}.json`; `puck-editor` has none). Keep `es`, add `de`, or both? | Keep `en` + `es` unchanged; add `de` later with `scripts/translate-messages.mjs --locale de` (machine-translated, flagged as such). Not part of I. | I, K, P |
| Q-I2 | Keep Yarn `4.5.1` (verified green) or move to the current Yarn 4.x? | Keep 4.5.1; upgrading changes the lockfile format risk and is not needed. | I |
| Q-I3 | First publish: straight to `1.0.0` or `1.0.0-rc.0` under tag `next` first (needed anyway so `admin-app` can install from the registry before launch, manual step M-08)? | Publish `1.0.0-rc.0` (`--tag next`) first, `1.0.0` at launch (spec R). | I, L, Q, R |
| Q-I4 | `@measured/puck` is a regular dependency of 7 packages (risk: two copies of Puck in a host app). Convert to a peer dependency? | No change in 1.0 (behaviour-neutral move); revisit after launch. | I, P |
