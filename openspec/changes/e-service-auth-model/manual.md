# Manual steps discovered by e-service-auth-model

* M-E1 (spec K/Q, owner-assisted, relates to M-04): verify the real forward-to flow in a logged-in Merchant Center session: the service must be reachable by an `https` URL (Connect-deployed, or a tunnel such as ngrok for local runs; the gateway refuses `http://` targets) and `CONNECT_SERVICE_URL` must be set to that URL ending in `/service`. Confirm in Chrome DevTools network tab that the call goes to `mc-api.<region>.commercetools.com/proxy/forward-to` with `X-Forward-To`, and that PUT/DELETE and JSON bodies arrive at the service.
* M-E2: operator step at install: generate `SERVICE_API_TOKEN` (`openssl rand -hex 24`) only if MCP/scripts/storefront-preview need it; store it in Connect `securedConfiguration`.
