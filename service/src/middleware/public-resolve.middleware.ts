import type { RequestHandler } from 'express';
import { getConfiguration } from '../config/env';
import CustomError from '../errors/custom.error';

export const BUILT_IN_DATASOURCE_KEYS = [
  'product-by-sku',
  'products-by-sku',
] as const;

let windowStart = 0;
let count = 0;

export const resetPublicResolveForTests = (): void => {
  windowStart = 0;
  count = 0;
};

/** Place BEFORE the auth gate on POST /datasource/:key/test. Skips to the next route (the protected one) when the request is not eligible. */
export const publicResolveGuard: RequestHandler = (req, res, next) => {
  const { enabled, maxPerMinute } = getConfiguration().auth.publicResolve;
  const key = req.params.key ?? '';
  if (
    !enabled ||
    !(BUILT_IN_DATASOURCE_KEYS as readonly string[]).includes(key)
  ) {
    next('route');
    return;
  }
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    count = 0;
  }
  count += 1;
  if (count > maxPerMinute) {
    res.setHeader(
      'Retry-After',
      String(Math.max(1, Math.ceil((windowStart + 60_000 - now) / 1000)))
    );
    next(new CustomError(429, 'Too many requests'));
    return;
  }
  next();
};
