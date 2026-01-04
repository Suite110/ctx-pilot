import { z } from 'zod';

export const ConfigSchema = z.object({
  pinned: z.array(z.string()).default([]),
  include: z.array(z.string()).default(['**/*.md']),
  exclude: z.array(z.string()).default([]),
  // Optional domain-specific settings
  domainStopwords: z.array(z.string()).optional(),
  // Smart skip thresholds
  minTopics: z.number().min(0).default(2),
  minScore: z.number().min(0).default(1.0),
  // Negative patterns - indexed but never suggested
  excludeFromSuggestions: z.array(z.string()).optional(),
});

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;
