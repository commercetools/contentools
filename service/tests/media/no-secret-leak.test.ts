import { loadMediaConfig } from '../../src/media/config';
import { createMediaService } from '../../src/media/media.service';
import { StorageUnavailableError } from '../../src/media/errors';
import { createMemoryProvider } from './support/memory-provider';

const SECRETS = ['S3CR3T-AWS-KEY', 'S3CR3T-CLOUDINARY', 'S3CR3T-GCP-BLOB'];

describe('secret hygiene', () => {
  it('configuration errors never contain credential values', () => {
    const envs = [
      {
        MEDIA_STORAGE_PROVIDER: 'aws',
        MEDIA_AWS_SECRET_ACCESS_KEY: SECRETS[0] as string,
        MEDIA_MAX_UPLOAD_BYTES: '1',
      },
      {
        MEDIA_STORAGE_PROVIDER: 'cloudinary',
        MEDIA_CLOUDINARY_API_SECRET: SECRETS[1] as string,
        MEDIA_ALLOWED_MIME_TYPES: 'video/mp4',
      },
      {
        MEDIA_STORAGE_PROVIDER: 'gcp',
        MEDIA_GCP_BUCKET: 'b',
        MEDIA_GCP_SERVICE_ACCOUNT_KEY_B64: SECRETS[2] as string,
      },
    ];
    for (const env of envs) {
      let message = '';
      try {
        loadMediaConfig(env);
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).not.toBe('');
      for (const s of SECRETS) expect(message).not.toContain(s);
    }
  });

  it('error objects from the service carry no storage text', async () => {
    const provider = createMemoryProvider();
    provider.failPutWith(new Error(`denied ${SECRETS[0]}`));
    const service = createMediaService({
      config: loadMediaConfig({}),
      getProvider: async () => provider,
    });
    const err = await service
      .upload({
        businessUnitKey: 'a',
        file: {
          buffer: Buffer.from('89504e470d0a1a0a', 'hex'),
          originalname: 'a.png',
          mimetype: 'image/png',
        },
      })
      .catch((e: unknown) => e);
    expect(JSON.stringify(err)).not.toContain(SECRETS[0]);
    expect((err as Error).message).not.toContain(SECRETS[0]);
    expect(
      new StorageUnavailableError('aws', 'AccessDenied').message
    ).not.toContain(SECRETS[0]);
  });
});
