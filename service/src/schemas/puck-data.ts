import { z } from 'zod';

// Loose on purpose: Puck evolves and valid editor output must not be rejected.
const component = z
  .object({ type: z.string(), props: z.record(z.string(), z.unknown()) })
  .loose();

export const puckData = z
  .object({
    content: z.array(component),
    root: z.object({}).loose(),
    zones: z.record(z.string(), z.array(component)).optional(),
  })
  .loose();
