import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Content item key');
const contentItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  key: z.string().optional(),
  businessUnitKey: z.string().optional(),
  name: z.string(),
  properties: z.record(z.string(), z.any()).default({}),
});
const value = contentItemSchema.optional().describe('Content item value when publishing (optional)');
const clearDraft = z.boolean().optional().describe('When true, clear draft after publishing');

export const contentItemStateTools: Tool[] = [
  {
    method: 'get_content_item_states',
    name: 'Get Content Item States',
    description: 'Get draft/published states for a content item.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item_state: { read: true } },
  },
  {
    method: 'create_content_item_published_state',
    name: 'Publish Content Item',
    description: 'Create published state (publish draft). Optionally clear draft.',
    parameters: z.object({ businessUnitKey: bu, key, value, clearDraft }),
    actions: { content_item_state: { update: true } },
  },
  {
    method: 'delete_content_item_draft_state',
    name: 'Delete Content Item Draft State',
    description: 'Delete draft state (revert to published).',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { content_item_state: { update: true } },
  },
];
