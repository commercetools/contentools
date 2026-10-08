import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../types/service.types';
import { getJwtSecret } from '../utils/secrets.utils';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';

/**
 * Extracts the Bearer token from the Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new CustomError(401, 'Authorization header missing');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new CustomError(
      401,
      'Invalid authorization format. Expected: Bearer <token>'
    );
  }

  const token = authHeader.substring(7);
  if (!token) {
    throw new CustomError(401, 'JWT token missing');
  }

  return token;
}

/**
 * Validates decoded JWT claims (issuer, audience, subject)
 */
function validateDecodedClaims(decoded: JwtPayload): void {
  if (!decoded.sub) {
    throw new CustomError(
      401,
      'Invalid token: missing project key (sub claim)'
    );
  }

  const expectedIssuer = process.env.JWT_ISSUER || 'multitenant-contentools';
  const expectedAudience =
    process.env.JWT_AUDIENCE || 'multitenant-contentools';

  if (decoded.iss && decoded.iss !== expectedIssuer) {
    throw new CustomError(401, 'Invalid token issuer');
  }

  if (decoded.aud && decoded.aud !== expectedAudience) {
    throw new CustomError(401, 'Invalid token audience');
  }
}

/**
 * Converts JWT errors to CustomError for consistent error handling
 */
function handleJwtError(error: unknown, next: NextFunction): void {
  if (error instanceof jwt.TokenExpiredError) {
    next(new CustomError(401, 'JWT token has expired'));
  } else if (error instanceof jwt.JsonWebTokenError) {
    next(new CustomError(401, `Invalid JWT token: ${error.message}`));
  } else if (error instanceof CustomError) {
    next(error);
  } else {
    logger.error('JWT validation error', error);
    next(new CustomError(401, 'JWT validation failed'));
  }
}

/**
 * Middleware to validate JWT token from Authorization header
 */
export function validateJwt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    validateDecodedClaims(decoded);

    req.user = {
      projectKey: decoded.sub,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    logger.debug(`JWT validated for project: ${decoded.sub}`);
    next();
  } catch (error) {
    handleJwtError(error, next);
  }
}

/**
 * Middleware to validate JWT token ignoring expiration (for refresh)
 */
export function validateJwtIgnoreExpiry(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const jwtSecret = getJwtSecret();

    const decoded = jwt.verify(token, jwtSecret, {
      ignoreExpiration: true,
    }) as JwtPayload;

    if (!decoded.sub) {
      throw new CustomError(401, 'Invalid token: missing project key');
    }

    req.user = {
      projectKey: decoded.sub,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    handleJwtError(error, next);
  }
}
