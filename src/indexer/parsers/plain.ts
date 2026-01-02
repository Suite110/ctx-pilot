import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// Plain text files are treated as a single section

export function parsePlain(content: string, _filePath: string): Section[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const lines = content.split('\n');

  return [{
    title: 'Document',
    lineStart: 1,
    lineEnd: lines.length,
    preview: trimmed.slice(0, 100),
    tokens: estimateTokens(trimmed),
    keywords: extractKeywords(trimmed),
  }];
}
