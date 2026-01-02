import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// For YAML/JSON, we detect top-level keys as sections

export function parseStructured(content: string, filePath: string): Section[] {
  const isJson = filePath.endsWith('.json');

  if (isJson) {
    return parseJson(content);
  } else {
    return parseYaml(content);
  }
}

function parseJson(content: string): Section[] {
  try {
    const parsed = JSON.parse(content);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      // Not an object with keys, treat as single section
      return [{
        title: 'Document',
        lineStart: 1,
        lineEnd: content.split('\n').length,
        preview: content.slice(0, 100),
        tokens: estimateTokens(content),
        keywords: extractKeywords(content),
      }];
    }

    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      return [];
    }

    // Create a section for each top-level key
    return keys.map(key => {
      const value = JSON.stringify(parsed[key], null, 2);
      return {
        title: key,
        lineStart: 1, // JSON doesn't have easy line mapping
        lineEnd: 1,
        preview: value.slice(0, 100),
        tokens: estimateTokens(value),
        keywords: extractKeywords(`${key} ${value}`),
      };
    });
  } catch {
    // Invalid JSON, treat as single section
    return [{
      title: 'Document',
      lineStart: 1,
      lineEnd: content.split('\n').length,
      preview: content.slice(0, 100),
      tokens: estimateTokens(content),
      keywords: extractKeywords(content),
    }];
  }
}

function parseYaml(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  const topLevelKeys: Array<{ key: string; lineIndex: number }> = [];

  // Find top-level keys (no leading whitespace, ends with :)
  const topLevelKeyPattern = /^(\w[\w-]*)\s*:/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(topLevelKeyPattern);
    if (match) {
      topLevelKeys.push({
        key: match[1],
        lineIndex: i,
      });
    }
  }

  if (topLevelKeys.length === 0) {
    const fullContent = content.trim();
    if (!fullContent) return [];

    return [{
      title: 'Document',
      lineStart: 1,
      lineEnd: lines.length,
      preview: fullContent.slice(0, 100),
      tokens: estimateTokens(fullContent),
      keywords: extractKeywords(fullContent),
    }];
  }

  for (let i = 0; i < topLevelKeys.length; i++) {
    const key = topLevelKeys[i];
    const nextKey = topLevelKeys[i + 1];

    const endLine = nextKey ? nextKey.lineIndex : lines.length;
    const sectionLines = lines.slice(key.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: key.key,
        lineStart: key.lineIndex + 1,
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
