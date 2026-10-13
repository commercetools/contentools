# @commercetools-labs/contentools-mcp

> Unsupported: this is a commercetools-labs project, provided AS IS without support. See [LICENSE](https://github.com/commercetools/contentools/blob/main/LICENSE).

Tools for the Contentools content service (Puck pages, content items, templates, configuration, datasources, media, product search) for AI agents. One tool catalog (44 tools: 24 read, 20 write), four entry points:

| Import | For |
| ------ | --- |
| `@commercetools-labs/contentools-mcp/ai-sdk` | Vercel AI SDK (`ai`) |
| `@commercetools-labs/contentools-mcp/langchain` | LangChain (`@langchain/core`) |
| `@commercetools-labs/contentools-mcp/mcp` | your own MCP server, any transport |
| `contentools-mcp` (bin) | MCP over stdio, e.g. `npx -y @commercetools-labs/contentools-mcp` |
| `@commercetools-labs/contentools-mcp` | the framework-neutral core (`ALL_TOOLS`, `selectTools`, `runTool`, `ContentoolsClient`) to build your own adapter |

All of them call the Contentools content service over HTTP with a bearer token; none of them talk to commercetools directly.

## Install

```bash
npm i @commercetools-labs/contentools-mcp zod ai            # AI SDK
npm i @commercetools-labs/contentools-mcp zod @langchain/core  # LangChain
npm i @commercetools-labs/contentools-mcp zod @modelcontextprotocol/sdk  # MCP server / stdio
```

`zod` is a peer dependency (`^3.25.0 || ^4.0.0`) so the tool schemas share your zod instance. `ai` (`^6 || ^7`), `@langchain/core` (`^0.3 || ^1`) and `@modelcontextprotocol/sdk` (`>=1.27 <2`) are optional peers: install only the one you use. Node 20 or newer.

## AI SDK

```ts
import { generateText, stepCountIs } from 'ai';
import { createAiSdkTools } from '@commercetools-labs/contentools-mcp/ai-sdk';

const tools = createAiSdkTools({
  baseUrl: 'https://service-xxxx.europe-west1.gcp.commercetools.app/service',
  token: process.env.SERVICE_API_TOKEN!,
});

const { text } = await generateText({
  model, // any AI SDK model
  tools,
  stopWhen: stepCountIs(5),
  prompt: 'List the pages and summarise them.',
});
```

## LangChain

```ts
import { createLangChainTools } from '@commercetools-labs/contentools-mcp/langchain';

const tools = createLangChainTools({ baseUrl, token: process.env.SERVICE_API_TOKEN! });
// pass `tools` to createReactAgent / bindTools, or call one directly:
await tools.find((t) => t.name === 'get_puck_page')!.invoke({ key: 'home' });
```

## MCP server and stdio

Your own server (any transport):

```ts
import { createContentoolsMcpServer } from '@commercetools-labs/contentools-mcp/mcp';
import { ContentoolsClient, selectTools } from '@commercetools-labs/contentools-mcp';

const server = createContentoolsMcpServer({
  tools: selectTools({ groups: 'all', enableWrites: false }),
  client: new ContentoolsClient({ baseUrl, token, timeoutMs: 15000 }),
  ctx: { defaultBusinessUnitKey: 'default' },
});
```

stdio, for example in an MCP client configuration:

```json
{
  "mcpServers": {
    "contentools": {
      "command": "npx",
      "args": ["-y", "@commercetools-labs/contentools-mcp"],
      "env": {
        "CONTENT_SERVICE_URL": "https://service-xxxx.europe-west1.gcp.commercetools.app/service",
        "SERVICE_API_TOKEN": "<token>"
      }
    }
  }
}
```

| Variable | Required | Meaning |
| -------- | -------- | ------- |
| `CONTENT_SERVICE_URL` | yes | Content service base URL, ending in `/service` |
| `SERVICE_API_TOKEN` | yes | Bearer token for the content service |
| `MCP_ENABLE_WRITES` | no | `true` registers the 20 write tools (default off) |
| `MCP_TOOL_GROUPS` | no | Comma list of groups, default all |
| `DEFAULT_BUSINESS_UNIT_KEY` | no | Default `default` |
| `MCP_REQUEST_TIMEOUT_MS` | no | Default `15000` |

## Options (AI SDK and LangChain)

| Option | Default | Meaning |
| ------ | ------- | ------- |
| `baseUrl` | required | Content service URL (`http(s)://.../service`) |
| `token` | required | Bearer token; sent only to `baseUrl` |
| `defaultBusinessUnitKey` | `'default'` | Used when a tool call has no `businessUnitKey` |
| `groups` | `'all'` | `'all'` or a list: `pages`, `contents`, `templates`, `configuration`, `datasources`, `products`, `media`, `content-types` |
| `enableWrites` | `false` | Expose the 20 write tools |
| `timeoutMs` | `15000` | Per-request timeout |
| `fetch` | global `fetch` | Inject a custom `fetch` (tests, proxies) |

## Security

* The token is sent only to `baseUrl` and is never part of tool input or output. Do not ship it to a browser: run these tools server-side.
* Writes are off by default (least privilege). Enable them only for agents that should edit content.
* Tool inputs are strict: unknown arguments (for example a `token` or `projectKey`) are rejected.

## Error behaviour

Service errors (`Service returned 404: ...`) and validation errors (`Invalid input: ...`) are returned to the model as text so an agent loop can recover; the AI SDK adapter and the MCP server never throw for them. LangChain validates the schema before calling the tool, so a schema failure throws a `ToolInputParsingException`.

## Migrating from the previous internal package

| Before | Now |
| ------ | --- |
| `new ...Agent({ authConfig })` | `createAiSdkTools({ baseUrl, token })` or `createLangChainTools({ baseUrl, token })` |
| `projectKey`, `jwtToken`, tenant parameters | removed: single project, credentials only in the client options |
| Legacy grid-page, content-item and proxy tools | removed |
| Tool names | new catalog of 44 tools, see the table in the Connect app README |
| `list_media` with `page` | cursor pagination: `limit`, `cursor`, `extensions`; the result carries `pagination.nextCursor` and `hasMore` |

The same tools are also served over Streamable HTTP by the Connect `mcp` application; see [`mcp/README.md`](https://github.com/commercetools/contentools/blob/main/mcp/README.md) in the repository.
