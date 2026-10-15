import type { Request, RequestHandler } from 'express';
import { SERVICE_MOUNT } from '../routes/mount';
import { getLogger } from '../utils/logger.utils';

const segments = (path: string): string[] => path.split('/').filter(Boolean);

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Express resets `baseUrl` and `params` once a request leaves a router, so by the time the response has
 * finished only the route's own path is left. The mount point is a constant, so the full template is rebuilt.
 */
function describeRoute(req: Request): {
  route: string;
  businessUnitKey?: string;
} {
  const template: unknown = req.route?.path;
  if (typeof template !== 'string') return { route: '<unmatched>' };
  const actual = segments(req.originalUrl.split('?')[0] ?? '');
  const mount = segments(SERVICE_MOUNT);
  const underMount =
    mount.every((s, i) => actual[i] === s) &&
    !template.startsWith(`${SERVICE_MOUNT}/`);
  const route = underMount ? `${SERVICE_MOUNT}${template}` : template;
  const index = segments(route).indexOf(':businessUnitKey');
  const value = index >= 0 ? actual[index] : undefined;
  return { route, ...(value && { businessUnitKey: decodeSegment(value) }) };
}

export const accessLog: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    getLogger().info('request', {
      method: req.method,
      ...describeRoute(req),
      status: res.statusCode,
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      source: req.get('x-source') ?? 'unknown',
    });
  });
  next();
};
