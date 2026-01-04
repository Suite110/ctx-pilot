// Configuration types
export interface TeamConfig {
  remote: 'git';
  branch: string;
  path: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  storage: 'local';
}

export interface AuditLogConfig {
  enabled: boolean;
  path: string;
  retention: string;
}

export interface SuggestionsConfig {
  includeRelated: boolean;
  maxRelated: number;
}

export interface SemanticSearchConfig {
  enabled: boolean;
  model: string;
  weight: number;
}

export interface CtxPilotConfig {
  pinned: string[];
  include: string[];
  exclude: string[];
  domainStopwords?: string[];
  minTopics?: number;
  minScore?: number;
  excludeFromSuggestions?: string[];
  // Enterprise features
  team?: TeamConfig;
  analytics?: AnalyticsConfig;
  auditLog?: AuditLogConfig;
  suggestions?: SuggestionsConfig;
  search?: SemanticSearchConfig;
}

// Section in a file (as stored in index)
export interface Section {
  title: string;
  lineStart: number;
  lineEnd: number;
  preview: string;
  keywords: string[];
  tokens?: number;
  source?: 'auto' | 'ai';
  embedding?: number[];
}

// File entry in the index
export interface FileIndex {
  path: string;
  sections: Section[];
  mtime?: string;
  hash?: string;
}

// Complete project index
export interface ProjectIndex {
  version: string;
  lastUpdated: string;
  files: FileIndex[];
}

// Search result
export interface ScoredSection {
  file: string;
  section: Section;
  score: number;
}

// Search options
export interface SearchOptions {
  maxResults?: number;
  useStemming?: boolean;
  useFuzzy?: boolean;
}

// Hook input from stdin
export interface HookInput {
  prompt: string;
}

// Parser function signature
export type SectionParser = (content: string, filePath: string) => Section[];

// Auto-index options
export interface AutoIndexOptions {
  force?: boolean;
  verbose?: boolean;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'missing_pinned' | 'invalid_line_numbers' | 'empty_keywords' | 'orphaned_entry';
  file: string;
  details: string;
}

export interface ValidationWarning {
  type: 'stale_file' | 'large_section';
  file: string;
  details: string;
}
