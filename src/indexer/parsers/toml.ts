import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// TOML section patterns
// [section]
// [[array.of.tables]]
const SECTION_PATTERN = /^\[{1,2}([^\]]+)\]{1,2}$/;

interface TableSection {
  name: string;
  lineIndex: number;
  isArray: boolean;
}

export function parseTOML(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const tableSections: TableSection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // Skip comments
    if (trimmedLine.startsWith('#')) {
      continue;
    }

    const match = trimmedLine.match(SECTION_PATTERN);
    if (match) {
      tableSections.push({
        name: match[1].trim(),
        lineIndex: i,
        isArray: trimmedLine.startsWith('[['),
      });
    }
  }

  if (tableSections.length === 0) {
    const fullContent = content.trim();
    if (!fullContent) return [];

    return [{
      title: 'Config',
      lineStart: 1,
      lineEnd: lines.length,
      preview: fullContent.slice(0, 100),
      tokens: estimateTokens(fullContent),
      keywords: extractKeywords(fullContent),
    }];
  }

  const sections: Section[] = [];

  for (let i = 0; i < tableSections.length; i++) {
    const table = tableSections[i];
    const nextTable = tableSections[i + 1];
    const endLine = nextTable ? nextTable.lineIndex : lines.length;
    const sectionLines = lines.slice(table.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: `[${table.name}]`,
        lineStart: table.lineIndex + 1,
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
