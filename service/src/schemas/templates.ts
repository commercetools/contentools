import { z } from 'zod';
import { puckData } from './puck-data';

export const templateCreate = z.object({
  name: z
    .string({ error: 'name is required' })
    .min(1, 'name is required')
    .max(256),
  kind: z.enum(['page', 'content'], {
    error: 'kind must be "page" or "content"',
  }),
  puckData: puckData.optional(),
});

export type TemplateCreate = z.infer<typeof templateCreate>;
