import type { Configuration } from '../config/env';

interface DiagnosticsLogger {
  info(message: string, meta?: Record<string, unknown>): unknown;
  warn(message: string, meta?: Record<string, unknown>): unknown;
}

export function logAuthDiagnostics(
  logger: DiagnosticsLogger,
  config: Configuration
): void {
  const { mc, serviceToken } = config.auth;
  logger.info('authentication', {
    merchantCenter: Boolean(mc),
    serviceToken: Boolean(serviceToken),
    requiredPermission: mc?.requiredPermission ?? null,
  });
  if (!mc) {
    logger.warn(
      'Merchant Center token verification is disabled: set CONNECT_SERVICE_URL (provided by Connect) and make CLOUD_IDENTIFIER resolvable'
    );
  }
  if (!mc && !serviceToken) {
    logger.warn(
      'No credential kind is enabled: every protected route will answer 401'
    );
  }
}
