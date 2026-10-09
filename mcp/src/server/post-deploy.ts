/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import { ContentoolsClient, ServiceError } from '../core';
import { loadConfig } from './config';

/**
 * Read-only, idempotent deploy-time probe.
 * Step 0: GET <service>/health (public). Unreachable -> warn, exit 0.
 * Step 1: authenticated GET of a page that does not exist. 404 means the credentials were accepted;
 * 401/403 -> exit 1; network error or 5xx -> warn, exit 0.
 */
export async function run(env: NodeJS.ProcessEnv): Promise<number> {
  const config = loadConfig(env);
  const client = new ContentoolsClient({
    baseUrl: config.serviceUrl,
    token: config.serviceToken,
    timeoutMs: config.timeoutMs,
  });
  const reachable = async (path: string): Promise<boolean | 'skip'> => {
    try {
      await client.execute({ method: 'GET', path });
      return true;
    } catch (e) {
      if (e instanceof ServiceError && e.status < 500 && e.status !== 502) return true;
      return 'skip';
    }
  };

  if ((await reachable('/health')) === 'skip') {
    console.warn('service not reachable yet; skipped');
    return 0;
  }

  try {
    await client.execute({
      method: 'GET',
      path: `/${encodeURIComponent(config.defaultBusinessUnitKey)}/preview/puck-pages/__contentools_mcp_probe__`,
    });
    console.log('service credentials accepted');
    return 0;
  } catch (e) {
    if (e instanceof ServiceError) {
      if (e.status === 404) {
        console.log('service credentials accepted');
        return 0;
      }
      if (e.status === 401 || e.status === 403) {
        console.error(
          `service rejected SERVICE_API_TOKEN (${e.status}); it must equal the service application's SERVICE_API_TOKEN`
        );
        return 1;
      }
    }
    console.warn('service not reachable yet; skipped');
    return 0;
  }
}

if (require.main === module) {
  run(process.env).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : 'post-deploy failed');
      process.exit(1);
    }
  );
}
