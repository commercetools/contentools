import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  AuthenticateProjectRequest,
  AuthenticateProjectResponse,
  AuthenticatedRequest,
} from '../types/service.types';
import { storeProject } from '../utils/firestore.utils';
import { getJwtSecret, getJwtExpiration } from '../utils/secrets.utils';
import CustomError from '../errors/custom.error';
import { logger } from '../utils/logger.utils';
import { regionToCloudIdentifier } from '../utils/region';

/**
 * Validate CommerceTools credentials by attempting authentication
 */
async function validateCommerceToolsCredentials(
  projectKey: string,
  clientId: string,
  clientSecret: string,
  region: string,
  scope: string
): Promise<boolean> {
  try {
    // Determine auth URL based on region
    const authUrl = `https://auth.${regionToCloudIdentifier(region)}.commercetools.com/oauth/token`;

    // Prepare Basic Auth credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    );

    // Attempt to get OAuth token
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(
        `CT auth failed for project ${projectKey}: ${response.status} - ${errorText}`
      );
      return false;
    }

    const data = await response.json();

    // Validate we got an access token
    if (!data.access_token) {
      logger.warn(
        `CT auth response missing access_token for project ${projectKey}`
      );
      return false;
    }

    logger.info(
      `CT credentials validated successfully for project ${projectKey}`
    );
    return true;
  } catch (error) {
    logger.error(
      `Error validating CT credentials for project ${projectKey}`,
      error
    );
    return false;
  }
}

/**
 * Authenticate a CommerceTools project and issue JWT
 */
export async function authenticateProject(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const {
      ct_client_id,
      ct_client_secret,
      ct_project_key,
      ct_region,
      ct_scope,
    } = req.body as AuthenticateProjectRequest;

    // Validate required fields
    if (!ct_client_id || !ct_client_secret || !ct_project_key) {
      throw new CustomError(
        400,
        'ct_client_id, ct_client_secret, and ct_project_key are required'
      );
    }

    const region = ct_region || 'gcp-us';
    const scope = ct_scope || `view_project_settings:${ct_project_key}`;

    // Validate credentials with CommerceTools
    const isValid = await validateCommerceToolsCredentials(
      ct_project_key,
      ct_client_id,
      ct_client_secret,
      region,
      scope
    );

    if (!isValid) {
      throw new CustomError(401, 'Invalid CommerceTools credentials');
    }

    // Store project in Firestore (or update if exists)
    await storeProject({
      projectKey: ct_project_key,
      clientId: ct_client_id,
      clientSecret: ct_client_secret,
      region: regionToCloudIdentifier(region),
      scope,
      isActive: true,
    });

    // Generate JWT token
    const jwtSecret = getJwtSecret();
    const jwtExpiration = getJwtExpiration();

    const payload = {
      sub: ct_project_key, // Subject: project key
      iss: 'multitenant-contentools', // Issuer
      aud: 'multitenant-contentools', // Audience
      iat: Math.floor(Date.now() / 1000), // Issued at
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiration as any,
    });

    const response: AuthenticateProjectResponse = {
      token,
      expiresIn: jwtExpiration,
      projectKey: ct_project_key,
    };

    logger.info(`Project authenticated successfully: ${ct_project_key}`);
    res.status(200).json(response);
  } catch (error: any) {
    if (error instanceof CustomError) {
      res.status(error.statusCode as number).json({
        message: error.message,
        statusCode: error.statusCode,
      });
    } else {
      logger.error('Authentication error', error);
      res.status(500).json({
        message: 'Authentication failed',
        statusCode: 500,
      });
    }
  }
}

/**
 * Refresh JWT token
 * Requires validateJwtIgnoreExpiry middleware
 */
export async function refreshJwt(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !req.user.projectKey) {
      throw new CustomError(401, 'Invalid authentication');
    }

    const projectKey = req.user.projectKey;

    // Generate new JWT token
    const jwtSecret = getJwtSecret();
    const jwtExpiration = getJwtExpiration();

    const payload = {
      sub: projectKey,
      iss: 'multitenant-contentools',
      aud: 'multitenant-contentools',
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiration as any,
    });

    const response: AuthenticateProjectResponse = {
      token,
      expiresIn: jwtExpiration,
      projectKey,
    };

    logger.info(`JWT refreshed for project: ${projectKey}`);
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode as number).json({
        message: error.message,
        statusCode: error.statusCode,
      });
    } else {
      logger.error('Token refresh error', error);
      res.status(500).json({
        message: 'Token refresh failed',
        statusCode: 500,
      });
    }
  }
}

/**
 * Health check endpoint
 */
export async function health(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'multitenant-contentools',
  });
}
