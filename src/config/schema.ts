import { z } from 'zod';

export const ConfigSchema = z.object({
  pinned: z.array(z.string()).default([]),
  include: z.array(z.string()).default(['**/*.md']),
  exclude: z.array(z.string()).default([]),
  tokenBudget: z.number().min(1000).max(200000).default(32000),
  maxContextPercentage: z.number().min(1).max(100).default(50),
});

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;
