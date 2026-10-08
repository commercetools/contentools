import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.utils';

/**
 * Runtime deprecation marker for the legacy API surface.
 *
 * The legacy `content-items` API and the legacy grid-based `pages` API have
 * been superseded by the Puck APIs (`puck-contents` / `puck-pages`). The routes
 * remain mounted for backwards compatibility, but every call is flagged so the
 * deprecation is visible to clients and in the logs:
 *   - `Deprecation: true`                       (RFC 8594)
 *   - `Warning: 299 - "... use <successor> ..."`
 *   - `Link: <successor>; rel="successor-version"`
 * and a warning is logged.
 *
 * Matching is done on whole path segments, so `pages` never matches
 * `puck-pages` and `content-items` never matches `puck-contents`.
 */
interface LegacyRule {
  test: RegExp;
  successor: string;
}

const LEGACY_RULES: LegacyRule[] = [
  {
    // Legacy content-items API → Puck content API
    test: /\/content-items(\/|$)/,
    successor: '/:businessUnitKey/puck-contents',
  },
  {
    // Legacy grid-based pages API (pages, page rows/components, page-items) → Puck pages API
    test: /\/(pages|page-items)(\/|$)/,
    successor: '/:businessUnitKey/puck-pages',
  },
];

export function deprecationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const rule = LEGACY_RULES.find((r) => r.test.test(req.path));

  if (rule) {
    res.setHeader('Deprecation', 'true');
    res.setHeader(
      'Warning',
      `299 - "This endpoint is deprecated. Use ${rule.successor} instead."`
    );
    res.setHeader('Link', `<${rule.successor}>; rel="successor-version"`);
    logger.warn(
      `Deprecated endpoint called: ${req.method} ${req.originalUrl} — use ${rule.successor} instead`
    );
  }

  next();
}
