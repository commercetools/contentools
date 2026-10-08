# Human-only steps (spec N)

| ID | Step | Needed before | Details |
| -- | ---- | ------------- | ------- |
| MN-1 | npm account with publish rights on the `@commercetools-labs` scope (same as plans M-07) and `npm login` in the shell that runs the script | real publish (`--publish`) | `npm whoami` must print your user; the scope must exist. No CI is used. |
| MN-2 | Type the confirmation and enter the 2FA OTP when the script and npm ask | real publish | Publishing is outward-facing and irreversible-ish (72 h unpublish window). The script stops and asks. |
| MN-3 | Decide rc vs final | real publish | Default: `1.0.0-rc.0` under `next`, later `1.0.0` (Q-N5). |
