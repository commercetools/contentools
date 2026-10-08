import { z } from 'zod';
import type { Tool } from '../../types/tools';

export const proxyTools: Tool[] = [
  {
    method: 'get_proxy_script',
    name: 'Get Proxy Script',
    description: 'Fetch an external script via the proxy to avoid CORS. Returns the script content.',
    parameters: z.object({
      url: z.string().describe('URL of the script to fetch'),
    }),
    actions: { proxy: { read: true } },
  },
];
