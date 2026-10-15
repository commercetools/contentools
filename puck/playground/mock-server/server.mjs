// CLI for the mock service: node mock-server/server.mjs [--port 8080] [--origin http://localhost:5174]
// Environment: MOCK_SERVICE_TOKEN (default dev-token), MOCK_MEDIA=none, MOCK_MEDIA_MAX,
// MOCK_PUBLIC_DATASOURCE_RESOLVE=true.

import { createMockServer } from './index.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const port = Number(option('port', '8080'));
const origin = option('origin', 'http://localhost:5174');
const token = process.env.MOCK_SERVICE_TOKEN ?? 'dev-token';

const server = await createMockServer({ port, origin, token });
console.log(`mock service listening on ${server.url} (token: ${token})`);

process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
