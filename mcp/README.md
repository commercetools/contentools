# @commercetools-labs/contentools-mcp

Contentools MCP exposes the Contentools service API as tools for the AI SDK, LangChain and the Model Context Protocol.

## Installation

```bash
yarn add @commercetools-labs/contentools-mcp ai zod
# For LangChain: yarn add @langchain/core
```

## Usage

Configure the agent with `baseUrl` (e.g. your deployed service URL), `projectKey`, optional `businessUnitKey` and `jwtToken`. Mutating routes require `jwtToken`.

### AI SDK

```ts
import { ContentoolsAgent } from '@commercetools-labs/contentools-mcp/ai-sdk';

const agent = new ContentoolsAgent({
  authConfig: {
    baseUrl: 'https://<your-connect-service-url>/service',
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
import { ContentoolsAgent } from '@commercetools-labs/contentools-mcp/langchain';

const agent = new ContentoolsAgent({ authConfig: { baseUrl, projectKey } });
const tools = agent.getTools();
```

## Exports

- `@commercetools-labs/contentools-mcp/ai-sdk` – ContentoolsAgent and types
- `@commercetools-labs/contentools-mcp/langchain` – ContentoolsAgent and types

Tools for configuration documents, datasources, media files and content-type import. Optional `configuration.actions` can restrict which tools are enabled.

## Inspector

```shell
npx @modelcontextprotocol/inspector node bin/run-mcp.cjs --baseUrl=http://localhost:8080/service --projectKey=xxx --businessUnitKey=1
```
