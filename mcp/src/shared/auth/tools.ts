import { z } from 'zod';
import type { Tool } from '../../types/tools';

const authenticateProjectParams = z.object({
  ct_client_id: z.string().describe('CommerceTools API client ID'),
  ct_client_secret: z.string().describe('CommerceTools API client secret'),
  ct_project_key: z.string().describe('CommerceTools project key'),
  ct_region: z.string().optional().describe('Region e.g. gcp-us'),
  ct_scope: z.string().optional().describe('OAuth scope'),
});

const refreshJwtParams = z.object({});

const healthParams = z.object({
  projectKey: z.string().optional().describe('Override project key for this request'),
});

export const authTools: Tool[] = [
  {
    method: 'authenticate_project',
    name: 'Authenticate Project',
    description: 'Authenticate a CommerceTools project and receive a JWT token. Requires ct_client_id, ct_client_secret, ct_project_key.',
    parameters: authenticateProjectParams,
    actions: { auth: { create: true } },
  },
  {
    method: 'refresh_jwt',
    name: 'Refresh JWT',
    description: 'Refresh the JWT token. Requires a valid or expired Bearer token in context.',
    parameters: refreshJwtParams,
    actions: { auth: { update: true } },
  },
  {
    method: 'health',
    name: 'Health Check',
    description: 'Check service health. Requires x-project-key.',
    parameters: healthParams,
    actions: { auth: { read: true } },
  },
];
