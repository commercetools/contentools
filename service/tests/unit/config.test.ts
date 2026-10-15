import {
  ConfigurationError,
  readConfiguration,
  type Env,
} from '../../src/config/env';

const valid = {
  CTP_API_URL: 'https://api.test.local/',
  CTP_AUTH_URL: 'https://auth.test.local',
  CTP_PROJECT_KEY: 'p',
  CTP_CLIENT_ID: 'id',
  CTP_CLIENT_SECRET: 'secret',
};

const failure = (env: Env): ConfigurationError => {
  try {
    readConfiguration(env);
  } catch (e) {
    return e as ConfigurationError;
  }
  throw new Error('expected readConfiguration to throw');
};

describe('readConfiguration', () => {
  it('applies defaults for a valid environment', () => {
    const c = readConfiguration(valid);
    expect(c.port).toBe(8080);
    expect(c.maxVersions).toBe(5);
    expect(c.containerPrefix).toBe('');
    expect(c.logLevel).toBe('info');
    expect(c.ctp.apiUrl).toBe('https://api.test.local');
    expect(c.ctp.scopes).toEqual([]);
  });

  it('splits scopes on whitespace', () => {
    const c = readConfiguration({ ...valid, CTP_SCOPE: 'a:p  b:p' });
    expect(c.ctp.scopes).toEqual(['a:p', 'b:p']);
  });

  it('reports every problem in one error', () => {
    const rest: Env = { ...valid };
    delete rest.CTP_PROJECT_KEY;
    const err = failure({
      ...rest,
      CTP_API_URL: 'http://x',
      MAX_VERSIONS: '0',
    });
    expect(err).toBeInstanceOf(ConfigurationError);
    expect(err.message).toContain('CTP_API_URL');
    expect(err.message).toContain('CTP_PROJECT_KEY');
    expect(err.message).toContain('MAX_VERSIONS');
  });

  it('never echoes the secret value', () => {
    const err = failure({
      ...valid,
      CTP_CLIENT_SECRET: 's3cr3t-value',
      CTP_PROJECT_KEY: '',
    });
    expect(String(err.message)).toContain('CTP_PROJECT_KEY');
    expect(String(err.message)).not.toContain('s3cr3t-value');
  });

  it('rejects a bad container prefix', () => {
    expect(
      failure({ ...valid, CONTAINER_PREFIX: 'bad prefix!' }).message
    ).toContain('CONTAINER_PREFIX');
  });

  it('rejects a non numeric MAX_VERSIONS', () => {
    expect(failure({ ...valid, MAX_VERSIONS: 'abc' }).message).toContain(
      'MAX_VERSIONS'
    );
  });

  it('rejects an unknown log level without echoing it', () => {
    const err = failure({ ...valid, LOG_LEVEL: 'verbose-x' });
    expect(err.message).toContain('LOG_LEVEL');
    expect(err.message).not.toContain('verbose-x');
  });
});
