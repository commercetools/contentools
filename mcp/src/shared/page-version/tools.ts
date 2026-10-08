import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Page key');

export const pageVersionTools: Tool[] = [
  {
    method: 'get_page_versions',
    name: 'Get Page Versions',
    description: 'List versions for a page.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { page_version: { read: true } },
  },
];
