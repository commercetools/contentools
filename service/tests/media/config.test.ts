/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { loadMediaConfig } from '../../src/media/config';
import { MediaConfigError } from '../../src/media/errors';

const keyJson = JSON.stringify({
  client_email: 'svc@example.iam.test',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
  project_id: 'p',
});
const keyB64 = Buffer.from(keyJson).toString('base64');

const messageOf = (env: Record<string, string>): string => {
  try {
    loadMediaConfig(env);
  } catch (e) {
    expect(e).toBeInstanceOf(MediaConfigError);
    return (e as Error).message;
  }
  throw new Error('expected failure');
};

describe('loadMediaConfig', () => {
  it('defaults to none with the documented limits', () => {
    const c = loadMediaConfig({});
    expect(c.provider).toBe('none');
    expect(c.pathPrefix).toBe('contentools/media');
    expect(c.maxUploadBytes).toBe(10485760);
    expect([...c.allowedMimeTypes]).toContain('image/png');
    expect(c.allowedMimeTypes.has('image/svg+xml')).toBe(false);
    expect(c.publicBaseUrl).toBeNull();
  });

  it('treats empty strings as unset (Connect defaults)', () => {
    expect(
      loadMediaConfig({ MEDIA_STORAGE_PROVIDER: '', MEDIA_PATH_PREFIX: '' })
        .provider
    ).toBe('none');
  });

  it('rejects an unknown provider naming the key', () => {
    expect(messageOf({ MEDIA_STORAGE_PROVIDER: 'gcp-typo' })).toContain(
      'MEDIA_STORAGE_PROVIDER'
    );
  });

  it('requires the gcp keys and names them', () => {
    const m = messageOf({ MEDIA_STORAGE_PROVIDER: 'gcp' });
    expect(m).toContain('MEDIA_GCP_BUCKET');
    expect(m).toContain('MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64');
  });

  it('builds the gcp config and never echoes a bad key', () => {
    const c = loadMediaConfig({
      MEDIA_STORAGE_PROVIDER: 'GCP',
      MEDIA_GCP_BUCKET: 'b',
      MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64: keyB64,
    });
    expect(c.provider).toBe('gcp');
    const secret = 'not-base64-json-SECRET';
    const m = messageOf({
      MEDIA_STORAGE_PROVIDER: 'gcp',
      MEDIA_GCP_BUCKET: 'b',
      MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64: secret,
    });
    expect(m).toContain('MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64');
    expect(m).not.toContain(secret);
  });

  it('ignores gcp keys when the provider is aws', () => {
    const c = loadMediaConfig({
      MEDIA_STORAGE_PROVIDER: 'aws',
      MEDIA_AWS_BUCKET: 'b',
      MEDIA_AWS_ACCESS_KEY_ID: 'id',
      MEDIA_AWS_SECRET_ACCESS_KEY: 'secret',
      MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64: '!!!',
    });
    expect(c).toMatchObject({
      provider: 'aws',
      region: 'us-east-1',
      endpoint: null,
    });
  });

  it('normalizes the endpoint, prefix and base url', () => {
    const c = loadMediaConfig({
      MEDIA_STORAGE_PROVIDER: 'aws',
      MEDIA_AWS_BUCKET: 'b',
      MEDIA_AWS_ACCESS_KEY_ID: 'id',
      MEDIA_AWS_SECRET_ACCESS_KEY: 's',
      MEDIA_AWS_ENDPOINT: 'http://localhost:9000/',
      MEDIA_PATH_PREFIX: '/a/b/',
      MEDIA_PUBLIC_BASE_URL: 'https://cdn.example.com/',
    });
    expect(c).toMatchObject({
      endpoint: 'http://localhost:9000',
      pathPrefix: 'a/b',
      publicBaseUrl: 'https://cdn.example.com',
    });
  });

  it('enforces the upload size ceiling and floor', () => {
    expect(messageOf({ MEDIA_MAX_UPLOAD_BYTES: '104857600' })).toContain(
      'MEDIA_MAX_UPLOAD_BYTES'
    );
    expect(messageOf({ MEDIA_MAX_UPLOAD_BYTES: '100' })).toContain('26214400');
    expect(
      loadMediaConfig({ MEDIA_MAX_UPLOAD_BYTES: '26214400' }).maxUploadBytes
    ).toBe(26214400);
  });

  it('validates prefix, base url and mime list', () => {
    expect(messageOf({ MEDIA_PATH_PREFIX: 'a//b' })).toContain(
      'MEDIA_PATH_PREFIX'
    );
    expect(messageOf({ MEDIA_PATH_PREFIX: '../x' })).toContain(
      'MEDIA_PATH_PREFIX'
    );
    expect(messageOf({ MEDIA_PUBLIC_BASE_URL: 'ftp://x' })).toContain(
      'MEDIA_PUBLIC_BASE_URL'
    );
    expect(messageOf({ MEDIA_ALLOWED_MIME_TYPES: 'oops' })).toContain(
      'MEDIA_ALLOWED_MIME_TYPES'
    );
  });

  it('rejects video types for cloudinary', () => {
    const m = messageOf({
      MEDIA_STORAGE_PROVIDER: 'cloudinary',
      MEDIA_CLOUDINARY_CLOUD_NAME: 'c',
      MEDIA_CLOUDINARY_API_KEY: 'k',
      MEDIA_CLOUDINARY_API_SECRET: 's',
      MEDIA_ALLOWED_MIME_TYPES: 'image/png,video/mp4',
    });
    expect(m).toContain('cloudinary');
    expect(m).toContain('MEDIA_ALLOWED_MIME_TYPES');
  });

  it('collects all problems in one error', () => {
    const m = messageOf({
      MEDIA_STORAGE_PROVIDER: 'aws',
      MEDIA_MAX_UPLOAD_BYTES: '5',
    });
    expect(m).toContain('MEDIA_AWS_BUCKET');
    expect(m).toContain('MEDIA_MAX_UPLOAD_BYTES');
  });
});
