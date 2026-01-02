import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// XML top-level element pattern
// Matches opening tags at the start of a line (after optional whitespace)
const TOP_ELEMENT_PATTERN = /^<(\w+)(?:\s|>)/;

interface Element {
  name: string;
  lineIndex: number;
}

export function parseXML(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const elements: Element[] = [];
  let depth = 0;
  let rootFound = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // Skip XML declaration, comments, and processing instructions
    if (trimmedLine.startsWith('<?') || trimmedLine.startsWith('<!') || trimmedLine.startsWith('-->')) {
      continue;
    }

    const match = trimmedLine.match(TOP_ELEMENT_PATTERN);
    if (match) {
      if (!rootFound) {
        rootFound = true;
        depth = 1;
      } else if (depth === 1) {
        // Direct children of root
        elements.push({
          name: match[1],
          lineIndex: i,
        });
      }

      // Track depth (simplified - doesn't handle all edge cases)
      if (!trimmedLine.includes('/>') && !trimmedLine.includes('</')) {
        depth++;
      }
    }

    // Track closing tags
    if (trimmedLine.includes('</')) {
      depth = Math.max(1, depth - 1);
    }
  }

  if (elements.length === 0) {
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

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const nextElement = elements[i + 1];
    const endLine = nextElement ? nextElement.lineIndex : lines.length;
    const sectionLines = lines.slice(element.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: `<${element.name}>`,
        lineStart: element.lineIndex + 1,
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
