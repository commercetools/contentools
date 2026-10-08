import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Page key');
const contentItemKey = z.string().describe('Content item key on the page');
const componentType = z.string().describe('Component type');
const rowId = z.string().describe('Row ID');
const cellId = z.string().describe('Cell ID');
const contentItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  key: z.string().optional(),
  businessUnitKey: z.string().optional(),
  name: z.string(),
  properties: z.record(z.string(), z.any()).default({}),
});
const updates = contentItemSchema.partial().describe('Full content item fields to update on the component. It must contain all fields, not just the ones that are being updated.');

export const pageComponentTools: Tool[] = [
  {
    method: 'add_page_component',
    name: 'Add Page Component',
    description: 'Add a content item component to a page at the given row and cell.',
    parameters: z.object({
      businessUnitKey: bu,
      key,
      componentType,
      rowId,
      cellId,
    }),
    actions: { page_component: { create: true } },
  },
  {
    method: 'move_page_component',
    name: 'Move Page Component',
    description: 'Move a content item component to another row/cell.',
    parameters: z.object({
      businessUnitKey: bu,
      key,
      contentItemKey,
      sourceRowId: z.string(),
      sourceCellId: z.string(),
      targetRowId: z.string(),
      targetCellId: z.string(),
    }),
    actions: { page_component: { update: true } },
  },
  {
    method: 'update_page_component',
    name: 'Update Page Component',
    description: 'Update a content item component on a page.',
    parameters: z.object({ businessUnitKey: bu, key, contentItemKey, updates }),
    actions: { page_component: { update: true } },
  },
  {
    method: 'remove_page_component',
    name: 'Remove Page Component',
    description: 'Remove a content item component from a page.',
    parameters: z.object({ businessUnitKey: bu, key, contentItemKey }),
    actions: { page_component: { update: true } },
  },
];
