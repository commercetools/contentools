# @commercetools-labs/contentools-api

> commercetools-labs reference code. MIT, AS IS and UNSUPPORTED. See the
> [repository](https://github.com/commercetools/contentools) for [SUPPORT.md](https://github.com/commercetools/contentools/blob/main/SUPPORT.md).

API client and React hooks for the Contentools content API: a React-free `createPuckClient`, a provider, hooks for pages, content items, templates, datasources and the media library.

## Install

```bash
yarn add @commercetools-labs/contentools-api react
```

## Usage

```tsx
import { PuckApiProvider, createPuckClient, listPuckPagesApi, usePuckPages } from '@commercetools-labs/contentools-api';

const connection = {
  baseURL: 'https://<your-service-host>/service',
  businessUnitKey: 'my-business-unit',
  jwtToken: token, // or getAuthHeaders / fetcher; not needed for published reads
};

// React: hooks read the client from the provider
<PuckApiProvider {...connection}>{children}</PuckApiProvider>;

// Anywhere else (server code, scripts): one React-free client
const client = createPuckClient(connection);
const pages = await listPuckPagesApi(client);
```

Connection props: `baseURL`, `businessUnitKey`, optional `locale`, `jwtToken`, `getAuthHeaders`, `fetcher`, `publicDatasourceResolve`. Errors are `PuckHttpError` (`PuckAuthError` for 401 and 403 or a missing auth source). See the [Authentication section of the puck README](https://github.com/commercetools/contentools/blob/main/puck/README.md#authentication).

## API

| Export | Kind | What it does |
| --- | --- | --- |
| `PuckApiProvider`, `PuckApiContext`, `usePuckApiContext`, `usePuckApiContextOptional`, `usePuckClient` | component, hooks | Provides one client to the tree; props are `PuckConnection` plus `children` |
| `createPuckClient`, `fetcherFromFetch`, `PuckClient` | function | React-free client; adapt anything fetch-shaped with `fetcherFromFetch` |
| `PuckHttpError`, `PuckAuthError` | class | Rejection types (`status`, `body`, `serverMessage`, `code`, `correlationId`; `authCode` for auth errors) |
| `PUCK_AUTH_POLICY` | const | Which operations need credentials |
| `usePuckPages`, `usePuckPage`, `usePuckStateManagement` | hooks | Pages, a single page with auto-save, publish and revert |
| `usePuckContents`, `usePuckContent`, `usePuckTemplates` | hooks | Content items and templates |
| `useMediaLibrary` | hook | Media library with cursor pagination and a `notConfigured` state |
| `resolveDatasourceApi` and the raw `*Api` functions (`listPuckPagesApi`, `getPublishedPuckPageApi`, `publishPuckPageApi`, ...) | function | One function per service route; take the client as first argument |

## Peer dependencies

- `react` `>=19.0.0`

Part of [Contentools](https://github.com/commercetools/contentools). Package list: [puck/README.md](https://github.com/commercetools/contentools/blob/main/puck/README.md).
