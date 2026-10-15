import { createSessionAuthVerifier } from '@commercetools-backend/express';
import type { CloudIdentifier } from './cloud-identifier';

export interface McSession {
  userId: string;
  projectKey: string;
  userPermissions?: string[];
}

type Headers = Record<string, string | string[] | undefined>;

interface VerifiableRequest {
  headers: Headers;
  originalUrl: string;
  session?: McSession;
}

export class McAuthError extends Error {
  constructor(
    public readonly reason: 'invalid' | 'unavailable',
    public readonly code: string
  ) {
    super(code);
    this.name = 'McAuthError';
  }
}

const UNAVAILABLE = new Set([
  'ERR_JOSE_GENERIC',
  'ERR_JWKS_TIMEOUT',
  'NETWORK',
]);

const codeOf = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string') return code;
  // the library throws plain Errors for missing headers
  return error instanceof TypeError ? 'NETWORK' : 'MISSING_INPUT';
};

export type McVerifier = (input: {
  headers: Headers;
  originalUrl: string;
}) => Promise<McSession>;

export function createMcVerifier(opts: {
  issuer: CloudIdentifier;
  audienceOrigin: string;
}): McVerifier {
  const verifiers = (
    ['forward-url-full-path', 'forward-url-origin'] as const
  ).map((audiencePolicy) =>
    createSessionAuthVerifier<VerifiableRequest>({
      audience: opts.audienceOrigin,
      issuer: opts.issuer,
      audiencePolicy,
      getRequestUrl: (r) => r.originalUrl,
    })
  );
  return async (input) => {
    let code = 'UNKNOWN';
    let unavailable = false;
    for (const verify of verifiers) {
      // the library writes `.session` on the object it receives: use a fresh one per attempt
      const req: VerifiableRequest = {
        headers: input.headers,
        originalUrl: input.originalUrl,
      };
      try {
        await verify(req);
        if (req.session) return req.session;
        code = 'NO_SESSION';
      } catch (error) {
        code = codeOf(error);
        if (UNAVAILABLE.has(code)) unavailable = true;
      }
    }
    throw new McAuthError(unavailable ? 'unavailable' : 'invalid', code);
  };
}
