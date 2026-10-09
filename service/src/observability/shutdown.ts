/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export interface ClosableServer {
  close(callback: () => void): unknown;
}

export interface ShutdownOptions {
  server: ClosableServer;
  exit: (code: number) => void;
  log: (message: string, meta: Record<string, unknown>) => void;
  /** Longest wait for in-flight requests before a forced exit with code 1. */
  timeoutMs?: number;
}

/** Stops accepting connections, waits for in-flight requests, then exits 0 (or 1 after the timeout). */
export function createShutdown({
  server,
  exit,
  log,
  timeoutMs = 10_000,
}: ShutdownOptions): (signal: string) => void {
  return (signal) => {
    log('shutting down', { signal });
    server.close(() => exit(0));
    setTimeout(() => exit(1), timeoutMs).unref();
  };
}
