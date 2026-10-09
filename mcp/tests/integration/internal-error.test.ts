/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
import request from 'supertest';
import { H, makeTestApp, rpc } from '../support/app';

jest.mock('../../src/mcp/server', () => ({
  createContentoolsMcpServer: () => {
    throw new Error('secret internal detail');
  },
}));

test('unexpected failures answer a generic 500 without a stack or detail', async () => {
  const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  try {
    const r = await request(makeTestApp()).post('/mcp').set(H).send(rpc('tools/list'));
    expect(r.status).toBe(500);
    expect(r.body).toEqual({
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal server error' },
      id: null,
    });
    expect(r.text).not.toContain('secret internal detail');
    expect(r.text).not.toContain('at ');
  } finally {
    stderr.mockRestore();
    stdout.mockRestore();
  }
});
