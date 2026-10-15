import { checkScopes, checkStorage } from '../../src/connector/checks';
import { LifecycleError, readLifecycleEnv } from '../../src/connector/env';
import { StorageUnavailableError } from '../../src/media/errors';
import { createStorageProvider } from '../../src/media/provider-factory';

jest.mock('../../src/media/provider-factory');

const mockedFactory = jest.mocked(createStorageProvider);

const AWS_ENV = {
  MEDIA_STORAGE_PROVIDER: 'aws',
  MEDIA_AWS_BUCKET: 'a-bucket',
  MEDIA_AWS_ACCESS_KEY_ID: 'sentinel-id',
  MEDIA_AWS_SECRET_ACCESS_KEY: 'sentinel-secret',
};

describe('checkStorage', () => {
  it('skips when no provider is selected', async () => {
    expect(await checkStorage({})).toEqual({
      check: 'storage',
      status: 'skipped',
    });
    expect(mockedFactory).not.toHaveBeenCalled();
  });

  it('reports ok when the provider answers', async () => {
    mockedFactory.mockResolvedValue({
      checkConnectivity: () => Promise.resolve(),
    } as never);
    expect(await checkStorage(AWS_ENV)).toMatchObject({
      check: 'storage',
      status: 'ok',
    });
  });

  it('fails with the provider name and the sanitized reason only', async () => {
    mockedFactory.mockResolvedValue({
      checkConnectivity: () =>
        Promise.reject(new StorageUnavailableError('aws', 'AccessDenied')),
    } as never);
    const error = await checkStorage(AWS_ENV).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LifecycleError);
    const { check, reason } = error as LifecycleError;
    expect(check).toBe('storage');
    expect(reason).toContain('aws');
    expect(reason).toContain('AccessDenied');
    expect(reason).not.toContain('sentinel');
  });

  it('never echoes an unexpected error message', async () => {
    mockedFactory.mockResolvedValue({
      checkConnectivity: () =>
        Promise.reject(new Error('https://user:sentinel-secret@host')),
    } as never);
    const error = (await checkStorage(AWS_ENV).catch(
      (e: unknown) => e
    )) as LifecycleError;
    expect(error.reason).not.toContain('sentinel');
  });
});

describe('checkScopes', () => {
  it('requires both scopes for the project', () => {
    expect(() =>
      checkScopes('view_products:p manage_key_value_documents:other', 'p')
    ).toThrow('missing scope manage_key_value_documents');
  });
});

describe('readLifecycleEnv', () => {
  it('strips trailing slashes from both URLs', () => {
    const env = readLifecycleEnv({
      CTP_API_URL: 'https://api.example.test///',
      CTP_AUTH_URL: 'https://auth.example.test/',
      CTP_PROJECT_KEY: 'p',
      CTP_CLIENT_ID: 'i',
      CTP_CLIENT_SECRET: 's',
    });
    expect(env.apiUrl).toBe('https://api.example.test');
    expect(env.authUrl).toBe('https://auth.example.test');
  });
});
