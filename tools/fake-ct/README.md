# fake-ct

A standalone, in-memory imitation of the commercetools endpoints the Contentools service uses (OAuth token, custom
objects, product search). It shares its implementation with the jest tests: `service/tests/support/fake-ct-store.ts`.

Start it with `yarn dev:fake-ct` from the repo root (port 8099, override with `FAKE_CT_PORT`), then point the service at
it with `CTP_API_URL=http://localhost:8099 CTP_AUTH_URL=http://localhost:8099`. Data lives in memory only. Needs Node 22.6+.
