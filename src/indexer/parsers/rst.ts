import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// reStructuredText uses underlines/overlines for headers
// Common patterns: ===, ---, ~~~, ^^^, etc.
const UNDERLINE_CHARS = /^[=\-~^"'`#*+_]+$/;

interface Header {
  title: string;
  lineIndex: number;
  level: number;
}

export function parseRST(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const headers: Header[] = [];
  const seenChars: string[] = []; // Track char order to determine level

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || '';
    const prevLine = lines[i - 1] || '';

    // Check for underlined header (title on current line, underline on next)
    if (line.trim() && UNDERLINE_CHARS.test(nextLine.trim()) && nextLine.trim().length >= line.trim().length) {
      const underlineChar = nextLine.trim()[0];
      let level = seenChars.indexOf(underlineChar);
      if (level === -1) {
        level = seenChars.length;
        seenChars.push(underlineChar);
      }

      headers.push({
        title: line.trim(),
        lineIndex: i,
        level: level + 1,
      });
    }

    // Check for overlined + underlined header
    if (UNDERLINE_CHARS.test(prevLine.trim()) && UNDERLINE_CHARS.test(nextLine.trim()) &&
        line.trim() && prevLine.trim()[0] === nextLine.trim()[0]) {
      // Skip - already handled by the underline case on previous iteration
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
