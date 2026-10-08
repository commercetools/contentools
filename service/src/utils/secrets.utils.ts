import CustomError from '../errors/custom.error';

/**
 * Get JWT secret from environment
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new CustomError(500, 'JWT_SECRET is not configured');
  }

  return secret;
}

/**
 * Get JWT expiration time from environment (defaults to 7d)
 */
export function getJwtExpiration(): string {
  return process.env.JWT_EXPIRATION || '7d';
}
