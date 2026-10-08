import { z } from 'zod';
import type { Tool } from '../../types/tools';

const bu = z.string().optional().describe('Business unit key (default from context)');
const key = z.string().describe('Page key');
const query = z.string().describe('Query string for filtering');
const contentItemSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  key: z.string().optional(),
  businessUnitKey: z.string().optional(),
  name: z.string(),
  properties: z.record(z.string(), z.any()).default({}),
});
const gridCellSchema = z.object({
  id: z.string(),
  contentItemKey: z.string().nullable(),
  colSpan: z.number(),
});
const gridRowSchema = z.object({
  id: z.string(),
  cells: z.array(gridCellSchema),
});
const layoutSchema = z.object({
  rows: z.array(gridRowSchema),
});
const pageSchema = z.object({
  key: z.string(),
  name: z.string(),
  route: z.string(),
  layout: layoutSchema,
  components: z.array(contentItemSchema),
});
const pageCreateSchema = z.object({
  name: z.string(),
  route: z.string(),
});

export const pageTools: Tool[] = [
  {
    method: 'get_pages',
    name: 'Get Pages',
    description: 'List all pages for a business unit.',
    parameters: z.object({ businessUnitKey: bu }),
    actions: { page: { read: true } },
  },
  {
    method: 'get_page',
    name: 'Get Page',
    description: 'Get a page by key (with states).',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { page: { read: true } },
  },
  {
    method: 'create_page',
    name: 'Create Page',
    description: 'Create a new page.',
    parameters: z.object({ businessUnitKey: bu, value: pageCreateSchema }),
    actions: { page: { create: true } },
  },
  // {
  //   method: 'update_page',
  //   name: 'Update Page',
  //   description: 'Update a page by key.',
  //   parameters: z.object({ businessUnitKey: bu, key, value: pageSchema }),
  //   actions: { page: { update: true } },
  // },
  {
    method: 'delete_page',
    name: 'Delete Page',
    description: 'Delete a page by key.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { page: { update: true } },
  },
  {
    method: 'query_published_pages',
    name: 'Query Published Pages',
    description: 'Query published pages with a query string.',
    parameters: z.object({ businessUnitKey: bu, query }),
    actions: { page: { read: true } },
  },
  {
    method: 'query_preview_pages',
    name: 'Query Preview Pages',
    description: 'Query preview (draft + published) pages with a query string.',
    parameters: z.object({ businessUnitKey: bu, query }),
    actions: { page: { read: true } },
  },
  {
    method: 'get_published_page',
    name: 'Get Published Page',
    description: 'Get the published version of a page by key.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { page: { read: true } },
  },
  {
    method: 'get_preview_page',
    name: 'Get Preview Page',
    description: 'Get the preview version of a page by key.',
    parameters: z.object({ businessUnitKey: bu, key }),
    actions: { page: { read: true } },
  },
];
