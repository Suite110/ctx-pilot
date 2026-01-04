import { z } from 'zod';

// Team sync configuration
const TeamConfigSchema = z.object({
  remote: z.enum(['git']).default('git'),
  branch: z.string().default('main'),
  path: z.string().default('.context/index.json'),
}).optional();

// Analytics configuration
const AnalyticsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  storage: z.enum(['local']).default('local'),
}).optional();

// Audit log configuration
const AuditLogConfigSchema = z.object({
  enabled: z.boolean().default(false),
  path: z.string().default('.context/audit.log'),
  retention: z.string().default('30d'),
}).optional();

// Suggestions configuration
const SuggestionsConfigSchema = z.object({
  includeRelated: z.boolean().default(false),
  maxRelated: z.number().min(0).max(5).default(2),
}).optional();

// Semantic search configuration
const SemanticSearchConfigSchema = z.object({
  enabled: z.boolean().default(false),
  model: z.string().default('all-MiniLM-L6-v2'),
  weight: z.number().min(0).max(1).default(0.6),
}).optional();

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
  // Enterprise features
  team: TeamConfigSchema,
  analytics: AnalyticsConfigSchema,
  auditLog: AuditLogConfigSchema,
  suggestions: SuggestionsConfigSchema,
  search: SemanticSearchConfigSchema,
});

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;
