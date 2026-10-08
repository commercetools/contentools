import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Content item key');
const query = z.string().describe('Query string for filtering');
const contentItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  key: z.string().optional(),
  businessUnitKey: z.string().optional(),
  name: z.string(),
  properties: z.record(z.string(), z.any()).default({}),
});

export const contentItemTools: Tool[] = [
  {
    method: 'get_content_items',
    name: 'Get Content Items',
    description: 'List all content items for a business unit.',
    parameters: z.object({ businessUnitKey: bu }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'get_content_items_by_type',
    name: 'Get Content Items by Type',
    description: 'List content items filtered by content type.',
    parameters: z.object({ businessUnitKey: bu, contentType: z.string().describe('Content type key') }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'get_content_item',
    name: 'Get Content Item',
    description: 'Get a content item by key (draft).',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'get_published_content_item',
    name: 'Get Published Content Item',
    description: 'Get the published version of a content item by key.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'get_preview_content_item',
    name: 'Get Preview Content Item',
    description: 'Get the preview (draft or published) content item by key.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'query_published_content_items',
    name: 'Query Published Content Items',
    description: 'Query published content items with a query string.',
    parameters: z.object({ businessUnitKey: bu, query }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'query_preview_content_items',
    name: 'Query Preview Content Items',
    description: 'Query preview (draft + published) content items with a query string.',
    parameters: z.object({ businessUnitKey: bu, query }),
    actions: { content_item: { read: true } },
  },
  {
    method: 'create_content_item',
    name: 'Create Content Item',
    description: 'Create a new content item.',
    parameters: z.object({ businessUnitKey: bu, value: contentItemSchema }),
    actions: { content_item: { create: true } },
  },
  {
    method: 'update_content_item',
    name: 'Update Content Item',
    description: 'Update an existing content item by key.',
    parameters: z.object({ businessUnitKey: bu, key, value: contentItemSchema }),
    actions: { content_item: { update: true } },
  },
  {
    method: 'delete_content_item',
    name: 'Delete Content Item',
    description: 'Delete a content item by key.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item: { update: true } },
  },
];
