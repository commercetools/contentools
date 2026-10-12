# Playground

> **UNSUPPORTED - commercetools-labs.** Freely available, AS IS and UNSUPPORTED. See [LICENSE](https://github.com/commercetools/contentools/blob/main/LICENSE). Not covered by commercetools support.

A Vite + React + TypeScript host app that mounts the Contentools components against a service. It is the
**reference wiring**: copy from `src/App.tsx` when you integrate the packages into your own app. It is a
development tool, never deployed and never published.

## Run it

From `puck/` (Yarn 4, `corepack enable`):

```bash
yarn install --immutable
yarn build                                                  # the playground resolves the packages from the workspace
cp playground/.env.example playground/.env
yarn workspace @commercetools-labs/contentools-playground mock    # optional: mock service on http://localhost:8080/service
yarn start:playground                                       # http://localhost:5174
```

To use a real service instead of the mock, start `service/` (port 8080) as described in the repository README, put
its `SERVICE_API_TOKEN` in `VITE_SERVICE_TOKEN` and keep `VITE_BASE_URL=http://localhost:8080/service`. Only one of
the mock and the real service can listen on port 8080.

## Environment (`playground/.env`)

| Variable | Default in `.env.example` | Meaning |
| --- | --- | --- |
| `VITE_BASE_URL` | `http://localhost:8080/service` | Service base URL including `/service` |
| `VITE_BUSINESS_UNIT_KEY` | `main-store` | Business unit that scopes the content (the mock serves `main-store`) |
| `VITE_AUTH_MODE` | `token` | `token` (static bearer), `fetcher` (simulates the Merchant Center proxy transport) or `none` (anonymous: only published rendering works) |
| `VITE_SERVICE_TOKEN` | `dev-token` | Bearer token for `token` mode: the mock default, or your `SERVICE_API_TOKEN` |
| `VITE_LOCALE` | `en-US` | Content locale for locale-aware calls such as product search (UI language: `en`, `de`, `es`) |

Vite bundles every `VITE_` variable into the browser, so use a token like this for local development only.
The mock reads `MOCK_SERVICE_TOKEN` (default `dev-token`), `MOCK_MEDIA=none` (media endpoints answer 501) and
`MOCK_PUBLIC_DATASOURCE_RESOLVE=true`.

## What each tab shows

| Tab | Component |
| --- | --- |
| Pages | `PageManager`: list, create, edit with the Puck editor, preview, publish, version history |
| Content Items | `ContentManager`: standalone content items |
| Renderer | `PuckRenderer` rendering a published page or content item the way a storefront would |
| Theme | `ThemeManager`: design tokens and presets |

If the editor styles leak into the plain-Tailwind elements of the page, or the other way round, the style isolation
described in [../README.md](../README.md#using-tailwind-alongside-the-editor) is broken.
