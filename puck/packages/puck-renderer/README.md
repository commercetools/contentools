> **UNSUPPORTED - commercetools-labs.** Freely available, AS IS and UNSUPPORTED. See [LICENSE](https://github.com/commercetools/contentools/blob/main/LICENSE). Not covered by commercetools support.

# @commercetools-labs/puck-renderer

Lightweight Puck page renderer for storefronts.

```bash
npm install @commercetools-labs/puck-renderer
```

Part of [Contentools](https://github.com/commercetools/contentools). Usage, peer dependencies and the connection API are documented in the [puck README](https://github.com/commercetools/contentools/blob/main/puck/README.md).

## Connect

```tsx
import { PuckRenderer } from '@commercetools-labs/puck-renderer';

// Published content is public: no token needed.
<PuckRenderer
  baseURL="https://your-service.example.com/service"
  businessUnitKey="your-business-unit-key"
  pageKey="home"
/>;
```

For preview (`mode="preview"`) pass `jwtToken`, `getAuthHeaders` or `fetcher`. For server side rendering use `loadPuckData(client, { type: 'page', slug: '/home', mode: 'published' })` with a client from `createPuckClient` and render the result with `PuckDataRenderer`.
