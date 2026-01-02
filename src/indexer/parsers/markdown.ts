import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

const HEADER_REGEX = /^(#{1,3})\s+(.+)$/;

interface HeaderMatch {
  level: number;
  title: string;
  lineIndex: number;
}

export function parseMarkdown(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const headers: HeaderMatch[] = [];

  // Find all headers (levels 1-3)
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(HEADER_REGEX);
    if (match) {
      headers.push({
        level: match[1].length,
        title: match[2].trim(),
        lineIndex: i,
      });
    }
  }

  if (headers.length === 0) {
    // No headers, treat entire file as single section
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

    // Section ends at next same-or-higher level header, or end of file
    let endLine: number;
    if (nextHeader) {
      // Find the next header that is same level or higher (smaller number)
      let endIndex = i + 1;
      while (endIndex < headers.length && headers[endIndex].level > header.level) {
        endIndex++;
      }
      endLine = endIndex < headers.length
        ? headers[endIndex].lineIndex
        : lines.length;
    } else {
      endLine = lines.length;
    }

    // Extract section content
    const sectionLines = lines.slice(header.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: header.title,
        lineStart: header.lineIndex + 1, // 1-based
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
