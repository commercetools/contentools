/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

const awsConstructed = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    constructor() {
      awsConstructed();
    }
    async send(): Promise<Record<string, never>> {
      return {};
    }
  }
  const command = class {};
  return {
    S3Client,
    PutObjectCommand: command,
    ListObjectsV2Command: command,
    HeadObjectCommand: command,
    DeleteObjectCommand: command,
    HeadBucketCommand: command,
  };
});

import { createMediaRuntime } from '../../src/media/runtime';

const awsEnv = {
  MEDIA_STORAGE_PROVIDER: 'aws',
  MEDIA_AWS_BUCKET: 'b',
  MEDIA_AWS_ACCESS_KEY_ID: 'id',
  MEDIA_AWS_SECRET_ACCESS_KEY: 's',
};

describe('createMediaRuntime', () => {
  beforeEach(() => awsConstructed.mockClear());

  it('builds no SDK client until the first use, then memoizes it', async () => {
    const runtime = createMediaRuntime(awsEnv);
    expect(awsConstructed).not.toHaveBeenCalled();
    const [a, b] = [await runtime.getProvider(), await runtime.getProvider()];
    expect(a).toBe(b);
    expect(a?.id).toBe('aws');
    expect(awsConstructed).toHaveBeenCalledTimes(1);
  });

  it('returns null for the default provider and never touches an SDK', async () => {
    const runtime = createMediaRuntime({});
    expect(await runtime.getProvider()).toBeNull();
    expect(awsConstructed).not.toHaveBeenCalled();
  });

  it('fails fast on invalid configuration', () => {
    expect(() => createMediaRuntime({ MEDIA_STORAGE_PROVIDER: 'aws' })).toThrow(
      'MEDIA_AWS_BUCKET'
    );
  });
});
