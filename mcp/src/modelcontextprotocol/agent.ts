import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthConfig } from '../types/auth.js';
import ContentToolsAPI from '../shared/api.js';
import { allTools } from '../shared/tools.js';
import { formatToolOutput } from '../shared/format.js';

const SERVER_NAME = 'contenttools-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Creates an MCP server that exposes Content Tools API as MCP tools.
 * No filtering or transformation; tools are registered with their Zod schemas and call api.run.
 */
export function createContentToolsMcpServer(
  authConfig: AuthConfig,
): McpServer {
  const api = new ContentToolsAPI(authConfig);

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {}
  );

  for (const tool of allTools) {
    server.registerTool(
      tool.method,
      {
        description: tool.description,
        inputSchema: tool.parameters,
      },
      async (args) => {
        const result = await api.run(tool.method, (args ?? {}) as Record<string, unknown>);
        const text = formatToolOutput(result);
        return { content: [{ type: 'text' as const, text }] };
      }
    );
  }

  return server;
}

export default createContentToolsMcpServer;
