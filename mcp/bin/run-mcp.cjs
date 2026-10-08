#!/usr/bin/env node
'use strict';
/**
 * Run the MCP server directly (no yarn/npm wrapper).
 * Use this with the MCP Inspector so stdout is only JSON-RPC.
 *
 * Example:
 *   node bin/run-mcp.cjs --baseUrl=... --projectKey=... --businessUnitKey=default
 */
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'src', 'modelcontextprotocol', 'index.ts');
const tsxBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
);

const child = spawn(
  tsxBin,
  [scriptPath, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    cwd: root,
    env: process.env,
    shell: false,
  }
);

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
