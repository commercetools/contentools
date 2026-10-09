/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { setupApiTest } from '../support/api';
import { withLogs } from './support';

const accessLines = (records: Record<string, unknown>[]) =>
  records.filter((r) => r.message === 'request');

// The app is built first: `withLogs` then replaces the (lazily created) logger and attaches its capture.
describe('access log', () => {
  it('writes exactly one line with the route template, status, duration and business unit', async () => {
    const { http, auth } = setupApiTest();
    await withLogs('info', async (logs) => {
      const res = await http
        .post('/service/main-bu/puck-pages?token=sentinel-query')
        .set(auth)
        .send({ note: 'sentinel-body' });
      await new Promise((resolve) => setTimeout(resolve, 30));
      const lines = accessLines(logs.records());
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        method: 'POST',
        route: '/service/:businessUnitKey/puck-pages',
        status: res.status,
        businessUnitKey: 'main-bu',
        correlationId: res.headers['x-correlation-id'],
      });
      expect(typeof lines[0]?.durationMs).toBe('number');
      expect(logs.text()).not.toContain('sentinel-body');
      expect(logs.text()).not.toContain('sentinel-query');
    });
  });

  it('never logs a token, also when authentication fails', async () => {
    const { http } = setupApiTest();
    await withLogs('debug', async (logs) => {
      const res = await http
        .get('/service/main-bu/puck-pages')
        .set('Authorization', 'Bearer sentinel-token');
      expect(res.status).toBe(401);
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(accessLines(logs.records())).toHaveLength(1);
      expect(logs.text()).not.toContain('sentinel-token');
    });
  });

  it('writes JSON lines with level, message and timestamp', async () => {
    const { http } = setupApiTest();
    await withLogs('info', async (logs) => {
      await http.get('/service/health');
      await new Promise((resolve) => setTimeout(resolve, 30));
      const [line] = accessLines(logs.records());
      expect(line).toHaveProperty('level');
      expect(line).toHaveProperty('message');
      expect(line).toHaveProperty('timestamp');
    });
  });

  it('emits no info lines when LOG_LEVEL is warn', async () => {
    const { http } = setupApiTest();
    await withLogs('warn', async (logs) => {
      await http.get('/service/health');
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(logs.records().filter((r) => r.level === 'info')).toEqual([]);
    });
  });
});
