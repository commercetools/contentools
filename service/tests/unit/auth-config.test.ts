import { deriveCloudIdentifier } from '../../src/auth/cloud-identifier';
import {
  ConfigurationError,
  readConfiguration,
  type Env,
} from '../../src/config/env';

const valid: Env = {
  CTP_API_URL: 'https://api.test.local',
  CTP_AUTH_URL: 'https://auth.test.local',
  CTP_PROJECT_KEY: 'p',
  CTP_CLIENT_ID: 'id',
  CTP_CLIENT_SECRET: 'secret',
};
const TOKEN = 'a'.repeat(40);

const failure = (env: Env): ConfigurationError => {
  try {
    readConfiguration(env);
  } catch (e) {
    return e as ConfigurationError;
  }
  throw new Error('expected readConfiguration to throw');
};

describe('deriveCloudIdentifier', () => {
  it.each([
    ['https://api.australia-southeast1.gcp.commercetools.com', 'gcp-au'],
    ['https://api.europe-west1.gcp.commercetools.com', 'gcp-eu'],
    ['https://api.us-central1.gcp.commercetools.com', 'gcp-us'],
    ['https://api.eu-central-1.aws.commercetools.com', 'aws-eu'],
    ['https://api.us-east-2.aws.commercetools.com', 'aws-us'],
  ])('maps %s', (url, id) => expect(deriveCloudIdentifier(url)).toBe(id));

  it('returns undefined for unknown hosts and garbage', () => {
    expect(deriveCloudIdentifier('https://api.test.local')).toBeUndefined();
    expect(deriveCloudIdentifier('not a url')).toBeUndefined();
  });
});

describe('auth configuration', () => {
  it('builds the Merchant Center settings', () => {
    const c = readConfiguration({
      ...valid,
      CONNECT_SERVICE_URL: 'https://service.test.local/service',
      CLOUD_IDENTIFIER: 'gcp-eu',
    });
    expect(c.auth.mc).toEqual({
      issuer: 'gcp-eu',
      audienceOrigin: 'https://service.test.local',
    });
  });

  it('disables Merchant Center verification without CONNECT_SERVICE_URL', () => {
    expect(
      readConfiguration({ ...valid, CLOUD_IDENTIFIER: 'gcp-eu' }).auth.mc
    ).toBeUndefined();
  });

  it('derives the issuer from CTP_API_URL', () => {
    const c = readConfiguration({
      ...valid,
      CTP_API_URL: 'https://api.europe-west1.gcp.commercetools.com',
      CONNECT_SERVICE_URL: 'https://service.test.local/service',
    });
    expect(c.auth.mc?.issuer).toBe('gcp-eu');
  });

  it('has no Merchant Center settings when the region cannot be resolved', () => {
    const c = readConfiguration({
      ...valid,
      CONNECT_SERVICE_URL: 'https://service.test.local/service',
    });
    expect(c.auth.mc).toBeUndefined();
  });

  it.each(['short', 'aaa.bbb.ccc'])(
    'rejects weak SERVICE_API_TOKEN %s without echoing it',
    (bad) => {
      const err = failure({ ...valid, SERVICE_API_TOKEN: bad });
      expect(err.message).toContain('SERVICE_API_TOKEN');
      expect(err.message).not.toContain(bad);
    }
  );

  it('rejects a three-segment token of sufficient length', () => {
    const bad = `${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`;
    const err = failure({ ...valid, SERVICE_API_TOKEN: bad });
    expect(err.message).toContain('SERVICE_API_TOKEN');
    expect(err.message).not.toContain(bad);
  });

  it('accepts a strong SERVICE_API_TOKEN', () => {
    expect(
      readConfiguration({ ...valid, SERVICE_API_TOKEN: TOKEN }).auth
        .serviceToken
    ).toBe(TOKEN);
  });

  it('parses CORS origins', () => {
    const c = readConfiguration({
      ...valid,
      CORS_ALLOWED_ORIGINS: 'http://localhost:5173, https://shop.example',
    });
    expect(c.auth.corsOrigins).toEqual([
      'http://localhost:5173',
      'https://shop.example',
    ]);
    expect(
      readConfiguration({ ...valid, CORS_ALLOWED_ORIGINS: '*' }).auth
        .corsOrigins
    ).toBe('all');
    expect(readConfiguration(valid).auth.corsOrigins).toEqual([]);
  });

  it.each(['localhost:5173', 'https://a.example/', 'https://a.example/path'])(
    'rejects CORS entry %s',
    (bad) => {
      const err = failure({ ...valid, CORS_ALLOWED_ORIGINS: bad });
      expect(err.message).toContain('CORS_ALLOWED_ORIGINS');
    }
  );

  it('validates MC_REQUIRED_PERMISSION', () => {
    expect(
      failure({ ...valid, MC_REQUIRED_PERMISSION: 'manage' }).message
    ).toContain('MC_REQUIRED_PERMISSION');
    const c = readConfiguration({
      ...valid,
      CONNECT_SERVICE_URL: 'https://service.test.local/service',
      CLOUD_IDENTIFIER: 'gcp-eu',
      MC_REQUIRED_PERMISSION: 'canManageContentools',
    });
    expect(c.auth.mc?.requiredPermission).toBe('canManageContentools');
  });

  it('defaults public resolve to off with 120 per minute', () => {
    expect(readConfiguration(valid).auth.publicResolve).toEqual({
      enabled: false,
      maxPerMinute: 120,
    });
    const c = readConfiguration({
      ...valid,
      PUBLIC_DATASOURCE_RESOLVE: 'true',
      PUBLIC_RESOLVE_MAX_PER_MINUTE: '5',
    });
    expect(c.auth.publicResolve).toEqual({ enabled: true, maxPerMinute: 5 });
  });
});
