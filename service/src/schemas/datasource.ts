import { z } from 'zod';

export const datasourceValue = z
  .object({
    name: z.string().min(1),
    key: z.string().optional(),
    params: z
      .array(
        z
          .object({
            key: z.string(),
            type: z.string(),
            required: z.boolean().optional(),
          })
          .loose()
      )
      .optional(),
  })
  .loose();

export const testBody = z.object({
  params: z.record(z.string(), z.unknown()).default({}),
});

export type DatasourceValue = z.infer<typeof datasourceValue>;
