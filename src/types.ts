// Configuration types
export interface CtxPilotConfig {
  pinned: string[];
  include: string[];
  exclude: string[];
  tokenBudget: number;
  maxContextPercentage: number;
}

// Section detected within a file
export interface Section {
  title: string;
  lineStart: number;
  lineEnd: number;
  preview: string;     // First ~100 chars for search preview
  tokens: number;      // Estimated token count
  keywords: string[];  // Extracted keywords for search
}

// Index entry for a single file
export interface FileIndex {
  path: string;
  mtime: string;       // ISO timestamp
  hash: string;        // Content hash for change detection
  sections: Section[];
}

// Complete project index
export interface ProjectIndex {
  version: string;
  lastUpdated: string;
  files: FileIndex[];
}

// Search result with relevance score
export interface ScoredSection {
  file: string;
  section: Section;
  score: number;
}

// Options for search
export interface SearchOptions {
  maxResults?: number;
  maxTokens?: number;
}

// Options for indexing
export interface IndexOptions {
  force?: boolean;
}

// Parser function signature
export type SectionParser = (content: string, filePath: string) => Section[];

// Input received by the hook
export interface HookInput {
  prompt: string;
  transcript_path?: string;
}
