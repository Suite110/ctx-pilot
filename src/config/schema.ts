import { z } from 'zod';

export const ConfigSchema = z.object({
  pinned: z.array(z.string()).default([]),
  include: z.array(z.string()).default(['**/*.md']),
  exclude: z.array(z.string()).default([]),
  // Optional domain-specific settings
  domainStopwords: z.array(z.string()).optional(),
});

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;
