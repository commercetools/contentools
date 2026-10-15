import express from 'express';
import request from 'supertest';
import { accessLog } from '../../src/observability/access-log';
import { requestContext } from '../../src/observability/request-context';
import { getLogger } from '../../src/utils/logger.utils';
import { withLogs } from './support';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function deep(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  getLogger().info('deep message');
}

async function middle(): Promise<void> {
  await deep();
}

const app = (): express.Express => {
  const a = express();
  a.use(requestContext, accessLog);
  a.get('/service/probe', (_req, res, next) => {
    middle().then(() => res.json({ ok: true }), next);
  });
  return a;
};

describe('correlation id', () => {
  it('keeps a client id, echoes it and puts it on every log line', async () => {
    await withLogs('info', async (logs) => {
      const res = await request(app())
        .get('/service/probe')
        .set('X-Correlation-ID', 'abc12345-test');
      expect(res.headers['x-correlation-id']).toBe('abc12345-test');
      await new Promise((resolve) => setTimeout(resolve, 30));
      const records = logs.records();
      expect(records.length).toBeGreaterThanOrEqual(2);
      for (const r of records) expect(r.correlationId).toBe('abc12345-test');
    });
  });

  it('replaces malformed ids and keeps them out of the logs', async () => {
    const tooLong = 'a'.repeat(129);
    await withLogs('info', async (logs) => {
      for (const bad of ['x y', tooLong, 'short']) {
        const res = await request(app())
          .get('/service/probe')
          .set('X-Correlation-ID', bad);
        expect(res.headers['x-correlation-id']).toMatch(UUID);
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
      const text = logs.text();
      expect(text).not.toContain(tooLong);
      expect(text).not.toContain('"x y"');
      expect(text).not.toContain('"short"');
    });
  });

  it('adds the id to log lines emitted two calls below the handler', async () => {
    await withLogs('info', async (logs) => {
      const res = await request(app()).get('/service/probe');
      const id = res.headers['x-correlation-id'];
      const deepLine = logs.records().find((r) => r.message === 'deep message');
      expect(deepLine?.correlationId).toBe(id);
    });
  });

  it('keeps concurrent requests apart', async () => {
    await withLogs('info', async (logs) => {
      const a = app();
      await Promise.all(
        ['aaaaaaaa-1', 'bbbbbbbb-2', 'cccccccc-3'].map((id) =>
          request(a).get('/service/probe').set('X-Correlation-ID', id)
        )
      );
      const deepLines = logs
        .records()
        .filter((r) => r.message === 'deep message')
        .map((r) => r.correlationId)
        .sort();
      expect(deepLines).toEqual(['aaaaaaaa-1', 'bbbbbbbb-2', 'cccccccc-3']);
    });
  });
});
