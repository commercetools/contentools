# Manual steps discovered by spec K

| ID | Step | When |
| -- | ---- | ---- |
| M-K1 | When the agent reaches a "B" check in tasks.md group 9 it opens Merchant Center in Chrome and asks the owner to log in (a login prompt appears in the browser; SSO/2FA is done by the owner, then the owner says "logged in"). Same as M-04. | tasks 9 B1-B8 |
| M-K2 | Live-verify what the MC gateway does with `PUT`, JSON bodies, `multipart/form-data` and large uploads through `/proxy/forward-to` (not documented). Report the outcome (and any size limit) back; fallback if PUT is blocked: have puck/service accept `POST` with `x-http-method-override` (needs E/J change). | tasks 9 B3, B4 |
| M-K3 | Create a second MC team with view-only permission for the custom application to test the 403 path. | tasks 9 B7 |
| M-K4 | Start an https tunnel (ngrok / cloudflared account may be required) for local end-to-end runs. | tasks group 8 |
| M-K5 | Publish `@commercetools-labs/puck-*@1.0.0-rc.N` (M-08) so Connect can build `admin-app`; the tarball script only covers local development. | before L deploy |
