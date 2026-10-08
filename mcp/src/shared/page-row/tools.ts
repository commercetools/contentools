import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Page key');
const rowId = z.string().describe('Row ID');
const cellId = z.string().describe('Cell ID');
const cellSpanUpdatesSchema = z.object({
  colSpan: z.number(),
  shouldRemoveEmptyCell: z.boolean().optional(),
  shouldAddEmptyCell: z.boolean().optional(),
});

export const pageRowTools: Tool[] = [
  {
    method: 'add_page_row',
    name: 'Add Page Row',
    description: 'Add a row to a page.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { page_row: { create: true } },
  },
  {
    method: 'remove_page_row',
    name: 'Remove Page Row',
    description: 'Remove a row from a page.',
    parameters: z.object({ businessUnitKey: bu, key, rowId }),
    actions: { page_row: { update: true } },
  },
  {
    method: 'update_page_cell_span',
    name: 'Update Page Cell Span',
    description: 'Update cell span in a page row.',
    parameters: z.object({ businessUnitKey: bu, key, rowId, cellId, updates: cellSpanUpdatesSchema }),
    actions: { page_row: { update: true } },
  },
];
