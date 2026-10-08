import { Request } from 'express';

/**
 * Request to authenticate a CommerceTools project
 */
export interface AuthenticateProjectRequest {
  ct_client_id: string;
  ct_client_secret: string;
  ct_project_key: string;
  ct_region?: string;
  ct_scope?: string;
}

/**
 * Response from project authentication
 */
export interface AuthenticateProjectResponse {
  token: string;
  expiresIn: string;
  projectKey: string;
}

/**
 * Encrypted credentials format (after decryption)
 */
export interface DecryptedCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Encrypted credentials as stored/transmitted
 */
export interface EncryptedCredentials {
  encrypted: string; // Base64 encoded
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
}

/**
 * Project data stored in Firestore
 */
export interface Project {
  projectKey: string;
  clientId: string;
  clientSecret: string;
  region: string;
  scope: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
}

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // projectKey
  iss: string; // issuer
  aud: string; // audience
  iat: number; // issued at
  exp: number; // expiration
}

/**
 * Extended Express Request with authenticated user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    projectKey: string;
    iat: number;
    exp: number;
  };
  project?: Project;
}
