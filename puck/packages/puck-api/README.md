> **UNSUPPORTED - commercetools-labs.** Freely available, AS IS and UNSUPPORTED. See [LICENSE](https://github.com/commercetools/contentools/blob/main/LICENSE). Not covered by commercetools support.

# @commercetools-labs/puck-api

API client and React hooks for the Puck page content integration.

```bash
npm install @commercetools-labs/puck-api
```

Part of [Contentools](https://github.com/commercetools/contentools). Usage, peer dependencies and the connection API are documented in the [puck README](https://github.com/commercetools/contentools/blob/main/puck/README.md).

## Connect

```tsx
import { PuckApiProvider, createPuckClient, listPuckPagesApi } from '@commercetools-labs/puck-api';

const connection = {
  baseURL: 'https://your-service.example.com/service',
  businessUnitKey: 'your-business-unit-key',
  jwtToken: 'optional-token', // or getAuthHeaders / fetcher
};

// React: hooks read the client from the provider
<PuckApiProvider {...connection}>{children}</PuckApiProvider>;

// Anywhere else (server code, scripts): one React-free client
const client = createPuckClient(connection);
const pages = await listPuckPagesApi(client);
```

Errors are `PuckHttpError` (and `PuckAuthError` for 401/403 or a missing auth source). See the puck README, section Authentication.
