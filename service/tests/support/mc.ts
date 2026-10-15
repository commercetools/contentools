import {
  SignJWT,
  UnsecuredJWT,
  exportJWK,
  generateKeyPair,
  type JWK,
  type KeyLike,
} from 'jose';
import { http, HttpResponse, type RequestHandler } from 'msw';

/**
 * Token-forging kit that simulates the Merchant Center gateway: a local RS256 key pair, a fake
 * JWKS endpoint at the real issuer URL (served by msw) and a signer for exchange tokens.
 * The verifier under test is the real library; only the network is faked.
 */
export const MC_ISSUER = 'https://mc-api.europe-west1.gcp.commercetools.com';
export const MC_LEGACY_ISSUER = 'https://mc-api.commercetools.com';
export const AUDIENCE_ORIGIN = 'https://service.test.local';

export interface SignOptions {
  /** null omits the project claim */
  projectKey?: string | null;
  issuer?: string;
  audience?: string;
  /** string such as '60s', or an absolute epoch second */
  expiresIn?: string | number;
  notBefore?: number;
  permissions?: string[];
  key?: KeyLike;
  kid?: string;
  alg?: 'RS256' | 'HS256';
  subject?: string;
}

export type JwksMode = 'ok' | 'http-500' | 'network-error';

export async function createMcKit() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk: JWK = {
    ...(await exportJWK(publicKey)),
    kid: 'test-key',
    alg: 'RS256',
    use: 'sig',
  };
  let mode: JwksMode = 'ok';

  const jwks = (issuer: string): RequestHandler =>
    http.get(`${issuer}/.well-known/jwks.json`, () => {
      if (mode === 'ok') return HttpResponse.json({ keys: [jwk] });
      if (mode === 'http-500') return new HttpResponse('boom', { status: 500 });
      return HttpResponse.error();
    });

  async function sign(opts: SignOptions = {}): Promise<string> {
    const issuer = opts.issuer ?? MC_ISSUER;
    const claims: Record<string, unknown> = { type: 'exchange' };
    if (opts.projectKey !== null) {
      claims[`${issuer}/claims/project_key`] =
        opts.projectKey ?? 'test-project';
    }
    if (opts.permissions) {
      claims[`${issuer}/claims/user_permissions`] = opts.permissions;
    }
    let jwt = new SignJWT(claims)
      .setProtectedHeader({
        alg: opts.alg ?? 'RS256',
        kid: opts.kid ?? 'test-key',
      })
      .setSubject(opts.subject ?? 'user-1')
      .setIssuer(issuer)
      .setAudience(opts.audience ?? AUDIENCE_ORIGIN)
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? '60s');
    if (opts.notBefore) jwt = jwt.setNotBefore(opts.notBefore);
    const secret =
      opts.alg === 'HS256'
        ? new TextEncoder().encode('x'.repeat(48))
        : (opts.key ?? privateKey);
    return jwt.sign(secret);
  }

  /** `alg: none` token with otherwise correct claims */
  const unsigned = (): string =>
    new UnsecuredJWT({
      [`${MC_ISSUER}/claims/project_key`]: 'test-project',
    })
      .setSubject('user-1')
      .setIssuer(MC_ISSUER)
      .setAudience(AUDIENCE_ORIGIN)
      .setExpirationTime('60s')
      .encode();

  return {
    handlers: [jwks(MC_ISSUER), jwks(MC_LEGACY_ISSUER)],
    setJwksMode: (m: JwksMode): void => {
      mode = m;
    },
    sign,
    unsigned,
    otherKey: async (): Promise<KeyLike> =>
      (await generateKeyPair('RS256')).privateKey,
    /** headers the gateway adds to the forwarded request */
    headers: (version: 'v1' | 'v2' = 'v2'): Record<string, string> => ({
      'x-mc-api-cloud-identifier': 'gcp-eu',
      'x-mc-api-forward-to-version': version,
    }),
  };
}

export type McKit = Awaited<ReturnType<typeof createMcKit>>;
