import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// AsciiDoc header patterns
// = Title (level 0)
// == Section (level 1)
// === Subsection (level 2), etc.
const HEADER_PATTERN = /^(=+)\s+(.+)$/;

interface Header {
  title: string;
  lineIndex: number;
  level: number;
}

export function parseAsciiDoc(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const headers: Header[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(HEADER_PATTERN);

    if (match) {
      headers.push({
        title: match[2].trim(),
        lineIndex: i,
        level: match[1].length,
      });
    }
  }

  if (headers.length === 0) {
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

  const sections: Section[] = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextHeader = headers[i + 1];
    const endLine = nextHeader ? nextHeader.lineIndex : lines.length;
    const sectionLines = lines.slice(header.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: header.title,
        lineStart: header.lineIndex + 1,
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
