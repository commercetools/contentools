# @commercetools-demo/contenttools-mcp

Content Tools MCP exposes the CMS service API as tools for AI SDK, LangChain, and Mastra.

## Installation

```bash
pnpm add @commercetools-demo/contenttools-mcp ai zod
# For LangChain: pnpm add @langchain/core
# For Mastra: pnpm add @mastra/core
```

## Usage

Configure the agent with `baseUrl` (e.g. your deployed service URL), `projectKey`, optional `businessUnitKey` and `jwtToken`. Mutating routes require `jwtToken`.

### AI SDK

```ts
import { ContentToolsAgent } from '@commercetools-demo/contenttools-mcp/ai-sdk';

const agent = new ContentToolsAgent({
  authConfig: {
    baseUrl: 'https://your-service.run.app/service',
    projectKey: 'your-project',
    businessUnitKey: 'default',
    jwtToken: 'your-jwt',
  },
});

const tools = agent.getTools();
// Use with generateText, streamText, etc.
```

### LangChain

```ts
import { ContentToolsAgent } from '@commercetools-demo/contenttools-mcp/langchain';

const agent = new ContentToolsAgent({ authConfig: { baseUrl, projectKey } });
const tools = agent.getTools();
```

### Mastra

```ts
import { ContentToolsAgent } from '@commercetools-demo/contenttools-mcp/mastra';

const agent = new ContentToolsAgent({ authConfig: { baseUrl, projectKey } });
const tools = agent.getTools();
```

## Exports

- `@commercetools-demo/contenttools-mcp/ai-sdk` – ContentToolsAgent and types
- `@commercetools-demo/contenttools-mcp/langchain` – ContentToolsAgent and types
- `@commercetools-demo/contenttools-mcp/mastra` – ContentToolsAgent and types

All CMS service routes (configuration, content types, content items, pages, datasources, file, auth, etc.) are exposed as tools. Optional `configuration.actions` can restrict which tools are enabled.


## Inspector

```shell
npx @modelcontextprotocol/inspector node bin/run-mcp.cjs --baseUrl=http://localhost:8080/service --projectKey=xxx --businessUnitKey=1
```