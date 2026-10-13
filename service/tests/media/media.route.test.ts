/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import express, { type Express } from 'express';
import request from 'supertest';
import { resetConfigurationForTests } from '../../src/config/env';
import { loadMediaConfig, type MediaConfig } from '../../src/media/config';
import { createMediaService } from '../../src/media/media.service';
import { resetAuthenticatorForTests } from '../../src/middleware/auth.middleware';
import {
  errorMiddleware,
  notFoundMiddleware,
} from '../../src/middleware/error.middleware';
import { requestContext } from '../../src/observability/request-context';
import { createMediaRouter } from '../../src/routes/media.route';
import { resetLoggerForTests } from '../../src/utils/logger.utils';
import { makeApp } from '../support/app';
import { PNG } from './support/png';
import {
  createMemoryProvider,
  type MemoryProvider,
} from './support/memory-provider';

const TOKEN = `Bearer ${process.env.SERVICE_API_TOKEN}`;

function build(
  env: Record<string, string> = {},
  provider: MemoryProvider | null = createMemoryProvider()
): { app: Express; provider: MemoryProvider | null; config: MediaConfig } {
  resetConfigurationForTests();
  resetAuthenticatorForTests();
  resetLoggerForTests();
  const config = loadMediaConfig(env);
  const service = createMediaService({
    config,
    getProvider: async () => provider,
  });
  const app = express();
  app.use(requestContext, express.json());
  app.use(
    '/service',
    createMediaRouter({
      service,
      limits: { maxUploadBytes: config.maxUploadBytes },
      allowedMimeTypes: config.allowedMimeTypes,
    })
  );
  app.use(notFoundMiddleware, errorMiddleware);
  return { app, provider, config };
}

const upload = (app: Express, bu = 'main-bu') =>
  request(app).post(`/service/${bu}/upload-file`).set('Authorization', TOKEN);

describe('POST /:businessUnitKey/upload-file', () => {
  it('401 without a token and the provider is not called', async () => {
    const { app, provider } = build();
    const res = await request(app)
      .post('/service/main-bu/upload-file')
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
    expect(provider?.calls).toEqual([]);
    expect(
      (await request(app).get('/service/main-bu/media-library')).status
    ).toBe(401);
    expect(
      (
        await request(app)
          .get('/service/main-bu/media-library')
          .set('Authorization', 'Bearer nope')
      ).status
    ).toBe(401);
    expect(provider?.calls).toEqual([]);
  });

  it('200 stores the file and answers url, key, name, size and type', async () => {
    const { app, provider } = build();
    const res = await upload(app)
      .field('title', 'Logo')
      .attach('file', PNG, { filename: 'Logo.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      contentType: 'image/png',
      size: PNG.length,
      url: expect.any(String),
    });
    expect(res.body.key).toMatch(/^contentools\/media\/main-bu\//);
    expect(provider?.objects.get(res.body.key)?.title).toBe('Logo');
  });

  it('413 over the limit with the error contract body', async () => {
    const { app, provider } = build({ MEDIA_MAX_UPLOAD_BYTES: '1024' });
    const res = await upload(app).attach(
      'file',
      Buffer.concat([PNG, Buffer.alloc(2048)]),
      { filename: 'a.png', contentType: 'image/png' }
    );
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      statusCode: 413,
      code: 'MEDIA_FILE_TOO_LARGE',
      message: expect.any(String),
    });
    expect(res.body.correlationId).toBe(res.headers['x-correlation-id']);
    expect(provider?.calls).toEqual([]);
  });

  it('400 when there is no file part', async () => {
    const { app } = build();
    const res = await upload(app).field('title', 'x');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MEDIA_FILE_REQUIRED');
  });

  it('400 for two files', async () => {
    const { app, provider } = build();
    const res = await upload(app)
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' })
      .attach('file', PNG, { filename: 'b.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MEDIA_FILE_COUNT_EXCEEDED');
    expect(provider?.calls).toEqual([]);
  });

  it('415 for a disallowed declared type, a mismatch, default SVG and a restricted allowlist', async () => {
    const { app } = build();
    const html = await upload(app).attach(
      'file',
      Buffer.from('<html></html>'),
      { filename: 'a.html', contentType: 'text/html' }
    );
    expect([html.status, html.body.code]).toEqual([
      415,
      'MEDIA_TYPE_NOT_ALLOWED',
    ]);
    const lie = await upload(app).attach('file', Buffer.from('<html></html>'), {
      filename: 'photo.png',
      contentType: 'image/png',
    });
    expect([lie.status, lie.body.code]).toEqual([415, 'MEDIA_TYPE_MISMATCH']);
    const svg = await upload(app).attach('file', Buffer.from('<svg/>'), {
      filename: 'a.svg',
      contentType: 'image/svg+xml',
    });
    expect([svg.status, svg.body.code]).toEqual([
      415,
      'MEDIA_TYPE_NOT_ALLOWED',
    ]);
    const strict = build({ MEDIA_ALLOWED_MIME_TYPES: 'image/png' });
    const jpeg = await upload(strict.app).attach(
      'file',
      Buffer.from('ffd8ffe000104a464946', 'hex'),
      { filename: 'a.jpg', contentType: 'image/jpeg' }
    );
    expect([jpeg.status, jpeg.body.code]).toEqual([
      415,
      'MEDIA_TYPE_NOT_ALLOWED',
    ]);
  });

  it('400 for an invalid business unit key and an oversized title', async () => {
    const { app } = build();
    const bu = await upload(app, '%2e%2e').attach('file', PNG, {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect([bu.status, bu.body.code]).toEqual([
      400,
      'MEDIA_INVALID_BUSINESS_UNIT',
    ]);
    const title = await upload(app)
      .field('title', 'x'.repeat(201))
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect([title.status, title.body.code]).toEqual([
      400,
      'MEDIA_INVALID_METADATA',
    ]);
    const huge = await upload(app)
      .field('title', 'x'.repeat(5000))
      .attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect([huge.status, huge.body.code]).toEqual([
      400,
      'MEDIA_INVALID_METADATA',
    ]);
  });

  it('501 when no provider is configured', async () => {
    const { app } = build({}, null);
    const res = await upload(app).attach('file', PNG, {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect([res.status, res.body.code]).toEqual([501, 'MEDIA_NOT_CONFIGURED']);
  });

  it('502 without leaking storage error text', async () => {
    const provider = createMemoryProvider();
    provider.failPutWith(
      new Error('The specified bucket my-private-bucket does not exist')
    );
    const { app } = build({}, provider);
    const res = await upload(app).attach('file', PNG, {
      filename: 'a.png',
      contentType: 'image/png',
    });
    expect([res.status, res.body.code]).toEqual([
      502,
      'MEDIA_STORAGE_UNAVAILABLE',
    ]);
    expect(JSON.stringify(res.body)).not.toContain('my-private-bucket');
  });
});

describe('GET /:businessUnitKey/media-library', () => {
  async function seed(): Promise<{ app: Express }> {
    const { app } = build();
    for (const bu of ['a', 'ab', 'b']) {
      for (let i = 0; i < 3; i++) {
        await upload(app, bu).attach('file', PNG, {
          filename: `f${i}.png`,
          contentType: 'image/png',
        });
      }
    }
    return { app };
  }

  it('isolates business units and paginates with cursors', async () => {
    const { app } = await seed();
    const get = (qs: string, bu = 'a') =>
      request(app)
        .get(`/service/${bu}/media-library${qs}`)
        .set('Authorization', TOKEN);
    const first = await get('?limit=2');
    expect(first.status).toBe(200);
    expect(first.body.files).toHaveLength(2);
    expect(first.body.pagination).toMatchObject({ limit: 2, hasMore: true });
    expect(
      first.body.files.every((f: { key: string }) => f.key.includes('/a/'))
    ).toBe(true);
    const second = await get(
      `?limit=2&cursor=${first.body.pagination.nextCursor}`
    );
    expect(second.body.files).toHaveLength(1);
    expect(second.body.pagination).toEqual({
      limit: 2,
      nextCursor: null,
      hasMore: false,
    });
    const tampered = await get('?cursor=garbage');
    expect([tampered.status, tampered.body.code]).toEqual([
      400,
      'MEDIA_INVALID_CURSOR',
    ]);
    const cross = await get(
      `?cursor=${first.body.pagination.nextCursor}`,
      'ab'
    );
    expect(cross.status).toBe(400);
  });

  it('clamps the limit and validates and applies the extension filter', async () => {
    const { app } = await seed();
    const get = (qs: string) =>
      request(app)
        .get(`/service/a/media-library${qs}`)
        .set('Authorization', TOKEN);
    expect((await get('?limit=1000')).body.pagination.limit).toBe(100);
    const bad = await get('?extensions=png,../x');
    expect([bad.status, bad.body.code]).toEqual([
      400,
      'MEDIA_INVALID_EXTENSIONS',
    ]);
    expect((await get('?extensions=jpg,gif')).body.files).toHaveLength(0);
    expect((await get('?extensions=png')).body.files).toHaveLength(3);
  });
});

describe('wiring in the real application', () => {
  it('serves the media routes behind the gate and no longer has compile-upload', async () => {
    const app = makeApp();
    const anon = await request(app).get('/service/main-bu/media-library');
    expect(anon.status).toBe(401);
    const none = await request(app)
      .get('/service/main-bu/media-library')
      .set('Authorization', TOKEN);
    expect([none.status, none.body.code]).toEqual([
      501,
      'MEDIA_NOT_CONFIGURED',
    ]);
    const removed = await request(app)
      .post('/service/compile-upload')
      .set('Authorization', TOKEN)
      .send({});
    expect(removed.status).toBe(404);
  });
});
