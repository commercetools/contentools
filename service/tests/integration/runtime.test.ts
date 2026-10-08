/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { Writable } from 'node:stream';
import express from 'express';
import { transports } from 'winston';
import request from 'supertest';
import {
  errorMiddleware,
  notFoundMiddleware,
} from '../../src/middleware/error.middleware';
import { requestContext } from '../../src/observability/request-context';
import { accessLog } from '../../src/observability/access-log';
import { makeApp } from '../support/app';
import { resetConfigurationForTests } from '../../src/config/env';
import { getLogger, resetLoggerForTests } from '../../src/utils/logger.utils';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const probeApp = (): express.Express => {
  const app = express();
  app.use(requestContext, accessLog, express.json({ limit: '2mb' }));
  app.post('/echo', (_req, res) => {
    res.json({});
  });
  app.put('/echo', (_req, res) => {
    res.json({});
  });
  app.get('/boom', () => {
    throw new Error('db password is hunter2');
  });
  app.use(notFoundMiddleware, errorMiddleware);
  return app;
};

describe('service runtime', () => {
  it('answers unknown paths with the uniform 404 body', async () => {
    const res = await request(makeApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message: 'Path not found.',
      statusCode: 404,
      correlationId: res.headers['x-correlation-id'],
    });
  });

  const removedPaths = [
    `/service/${['authenticate', 'project'].join('-')}`,
    `/service/${['refresh', 'jwt'].join('-')}`,
  ];

  it.each(removedPaths)('has no %s endpoint', async (path) => {
    const app = makeApp();
    expect((await request(app).post(path)).status).toBe(401);
    const res = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${process.env.SERVICE_API_TOKEN}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Path not found.');
  });

  it.each(['/service/health', '/service/status'])('serves %s', async (path) => {
    const res = await request(makeApp()).get(path);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([
      'service',
      'status',
      'timestamp',
    ]);
    expect(res.body.status).toBe('UP');
    expect(res.body.service).toBe('contentools-service');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('does not send x-powered-by', async () => {
    const res = await request(makeApp()).get('/service/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('echoes a valid correlation id and puts it into error bodies', async () => {
    const res = await request(makeApp())
      .get('/nope')
      .set('X-Correlation-ID', 'abc-123');
    expect(res.headers['x-correlation-id']).toBe('abc-123');
    expect(res.body.correlationId).toBe('abc-123');
  });

  it('generates a uuid and replaces an invalid id', async () => {
    const generated = await request(makeApp()).get('/service/health');
    expect(generated.headers['x-correlation-id']).toMatch(UUID);
    const replaced = await request(makeApp())
      .get('/service/health')
      .set('X-Correlation-ID', 'bad id with spaces');
    expect(replaced.headers['x-correlation-id']).toMatch(UUID);
  });

  it('answers malformed JSON with 400', async () => {
    const res = await request(probeApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid JSON body');
  });

  it('answers an oversized body with 413', async () => {
    const res = await request(probeApp())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(3 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.message).toBe('Payload too large');
  });

  it('hides unexpected exception details', async () => {
    const res = await request(probeApp()).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
    expect(res.body.stack).toBeUndefined();
  });

  it('never logs bodies, tokens or query strings', async () => {
    const original = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'debug';
    resetConfigurationForTests();
    resetLoggerForTests();
    const chunks: string[] = [];
    const sink = new transports.Stream({
      stream: new Writable({
        write(chunk, _enc, done) {
          chunks.push(String(chunk));
          done();
        },
      }),
    });
    const logger = getLogger();
    logger.add(sink);
    try {
      await request(probeApp())
        .put('/echo?q=qs-secret')
        .set('Authorization', 'Bearer top-secret')
        .send({ value: { secret: 'zzz' } });
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      logger.remove(sink);
      process.env.LOG_LEVEL = original;
      resetConfigurationForTests();
      resetLoggerForTests();
    }
    const logged = chunks.join('');
    expect(logged).toContain('"route"');
    expect(logged).toContain('correlationId');
    expect(logged).not.toContain('zzz');
    expect(logged).not.toContain('top-secret');
    expect(logged).not.toContain('qs-secret');
  });
});
