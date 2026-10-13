/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  checkCustomObjects,
  checkProductSearch,
  checkScopes,
  checkStorage,
  checkToken,
  type CheckResult,
} from './checks';
import { LifecycleError, readLifecycleEnv } from './env';

const print = (
  stream: 'out' | 'err',
  record: Record<string, unknown>
): void => {
  const line = `${JSON.stringify({ msg: 'post-deploy', ...record })}\n`;
  (stream === 'out' ? process.stdout : process.stderr).write(line);
};

async function run(): Promise<void> {
  const results: CheckResult[] = [];
  const flush = (): void => results.forEach((r) => print('out', { ...r }));
  try {
    const env = readLifecycleEnv(process.env);
    const { accessToken, scope } = await checkToken(env);
    results.push({ check: 'token', status: 'ok' });
    results.push(checkScopes(scope, env.projectKey));
    results.push(await checkCustomObjects(env, accessToken));
    results.push(await checkProductSearch(env, accessToken));
    results.push(await checkStorage(process.env));
    flush();
  } catch (e) {
    flush();
    const err =
      e instanceof LifecycleError
        ? e
        : new LifecycleError('unexpected', 'unexpected failure');
    print('err', { check: err.check, status: 'failed', reason: err.reason });
    process.exitCode = 1;
  }
}

void run();
