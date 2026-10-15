import express from 'express';
import request from 'supertest';
import { correlationFormat } from '../../src/observability/log-format';
import { accessLog } from '../../src/observability/access-log';
import {
  currentCorrelationId,
  requestContext,
} from '../../src/observability/request-context';
import {
  notFoundMiddleware,
  errorMiddleware,
} from '../../src/middleware/error.middleware';
import { getLogger } from '../../src/utils/logger.utils';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const makeApp = (): express.Express => {
  const app = express();
  app.use(requestContext, accessLog);
  app.get('/service/health', (_req, res) => {
    res.json({ id: currentCorrelationId() });
  });
  app.use(notFoundMiddleware, errorMiddleware);
  return app;
};

describe('requestContext', () => {
  it('uses a valid incoming id', async () => {
    const res = await request(makeApp())
      .get('/service/health')
      .set('X-Correlation-ID', 'abc12345-test');
    expect(res.headers['x-correlation-id']).toBe('abc12345-test');
    expect(res.body.id).toBe('abc12345-test');
  });

  it('generates a uuid when absent', async () => {
    const res = await request(makeApp()).get('/service/health');
    expect(res.headers['x-correlation-id']).toMatch(UUID);
  });

  it('replaces an invalid id', async () => {
    const res = await request(makeApp())
      .get('/service/health')
      .set('X-Correlation-ID', 'bad id with spaces');
    expect(res.headers['x-correlation-id']).toMatch(UUID);
  });

  it('is undefined outside a request', () => {
    expect(currentCorrelationId()).toBeUndefined();
  });
});

describe('correlationFormat', () => {
  it('adds the id only inside a request context', async () => {
    const outside = correlationFormat.transform({
      level: 'info',
      message: 'm',
    });
    expect(outside).toMatchObject({ message: 'm' });
    expect(outside).not.toHaveProperty('correlationId');

    let inside: unknown;
    const app = express();
    app.use(requestContext);
    app.get('/x', (_req, res) => {
      inside = correlationFormat.transform({ level: 'info', message: 'm' });
      res.end();
    });
    await request(app).get('/x').set('X-Correlation-ID', 'cid-12345678');
    expect(inside).toMatchObject({ correlationId: 'cid-12345678' });
  });
});

describe('accessLog', () => {
  it('logs the route template, or <unmatched> for a 404', async () => {
    const logger = getLogger();
    const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const app = makeApp();
    await request(app).get('/service/health?token=secret');
    await request(app).get('/nope?token=secret');
    const calls = (spy.mock.calls as unknown[][]).map(
      (c) => c[1] as Record<string, unknown>
    );
    expect(calls[0]).toMatchObject({
      route: '/service/health',
      status: 200,
      source: 'unknown',
    });
    expect(calls[1]).toMatchObject({ route: '<unmatched>', status: 404 });
    expect(JSON.stringify(calls)).not.toContain('secret');
    spy.mockRestore();
  });
});
