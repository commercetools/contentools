#!/usr/bin/env node
/**
 * Content Tools MCP server – run with:
 *   pnpm run mcp   (not for MCP Inspector – use the bin below)
 *   node bin/run-mcp.cjs   (for MCP Inspector; no yarn banner on stdout)
 *   npx tsx src/modelcontextprotocol/index.ts
 *
 * Pass configuration via CLI or env:
 *   --baseUrl=URL     BASE_URL
 *   --projectKey=KEY  PROJECT_KEY
 *   --businessUnitKey=KEY  BUSINESS_UNIT_KEY (optional)
 *   --jwtToken=TOKEN  JWT_TOKEN (optional, for mutate routes)
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createContentToolsMcpServer } from './agent.js';
import type { AuthConfig } from '../types/auth.js';

function parseArgs(args: string[]): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 2) {
        const key = arg.slice(2, eq);
        const value = arg.slice(eq + 1);
        out[key] = value;
      }
    }
  }
  return out;
}

function getAuthConfig(): AuthConfig {
  const env = process.env as Record<string, string | undefined>;
  const argv = parseArgs(process.argv.slice(2));
  const baseUrl = argv.baseUrl ?? env.BASE_URL;
  const projectKey = argv.projectKey ?? env.PROJECT_KEY;
  const businessUnitKey = argv.businessUnitKey ?? env.BUSINESS_UNIT_KEY;
  const jwtToken = argv.jwtToken ?? env.JWT_TOKEN;

  if (!baseUrl || !projectKey) {
    console.error(
      'Content Tools MCP: missing required config. Set --baseUrl and --projectKey (or BASE_URL and PROJECT_KEY).'
    );
    process.exit(1);
  }

  return {
    baseUrl,
    projectKey,
    businessUnitKey,
    jwtToken,
  };
}

async function main() {
  const authConfig = getAuthConfig();
  const server = createContentToolsMcpServer(authConfig);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Content Tools MCP server running on stdio');
}

main().catch((err) => {
  console.error('Content Tools MCP error:', err);
  process.exit(1);
});
