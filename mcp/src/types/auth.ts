/**
 * Authentication and context for the Content Tools API.
 * All API calls use baseUrl with x-project-key and optionally Authorization: Bearer jwtToken.
 */
export type AuthConfig = {
  baseUrl: string;
  projectKey: string;
  businessUnitKey?: string;
  jwtToken?: string;
};
