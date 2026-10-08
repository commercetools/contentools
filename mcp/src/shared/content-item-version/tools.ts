import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Content item key');

export const contentItemVersionTools: Tool[] = [
  {
    method: 'get_content_item_versions',
    name: 'Get Content Item Versions',
    description: 'List versions for a content item.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item_version: { read: true } },
  },
];
