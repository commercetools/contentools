import { z } from 'zod';

export const queryBody = z.object({
  query: z
    .string({ error: 'query is required in request body' })
    .min(1, 'query is required in request body')
    .max(512),
});
