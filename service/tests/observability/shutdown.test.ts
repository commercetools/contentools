/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createShutdown } from '../../src/observability/shutdown';

describe('graceful shutdown', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('closes the server and exits 0 once it is closed', () => {
    const exit = jest.fn();
    const log = jest.fn();
    let onClosed: () => void = () => undefined;
    const server = {
      close: jest.fn((cb: () => void) => {
        onClosed = cb;
      }),
    };
    createShutdown({ server, exit, log })('SIGTERM');
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('shutting down', { signal: 'SIGTERM' });
    expect(exit).not.toHaveBeenCalled();
    onClosed();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('forces exit 1 after the timeout when requests do not finish', () => {
    jest.useFakeTimers();
    const exit = jest.fn();
    const server = { close: jest.fn() };
    createShutdown({ server, exit, log: jest.fn(), timeoutMs: 10_000 })(
      'SIGTERM'
    );
    jest.advanceTimersByTime(9_999);
    expect(exit).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
