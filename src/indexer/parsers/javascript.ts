import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// Patterns to detect JavaScript/TypeScript declarations
const PATTERNS = [
  /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  /^(?:export\s+)?class\s+(\w+)/,
  /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/,
  /^(?:export\s+)?interface\s+(\w+)/,
  /^(?:export\s+)?type\s+(\w+)\s*=/,
  /^(?:export\s+)?enum\s+(\w+)/,
];

interface Declaration {
  name: string;
  lineIndex: number;
  type: string;
}

function getDeclarationType(line: string): string {
  if (/function/.test(line)) return 'function';
  if (/class/.test(line)) return 'class';
  if (/interface/.test(line)) return 'interface';
  if (/type\s+\w+\s*=/.test(line)) return 'type';
  if (/enum/.test(line)) return 'enum';
  return 'const';
}

export function parseJavaScript(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const declarations: Declaration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    for (const pattern of PATTERNS) {
      const match = trimmedLine.match(pattern);
      if (match) {
        declarations.push({
          name: match[1],
          lineIndex: i,
          type: getDeclarationType(trimmedLine),
        });
        break;
      }
    }
  }

  if (declarations.length === 0) {
    // No declarations found, treat entire file as single section
    const fullContent = content.trim();
    if (!fullContent) return [];

    return [{
      title: 'Module',
      lineStart: 1,
      lineEnd: lines.length,
      preview: fullContent.slice(0, 100),
      tokens: estimateTokens(fullContent),
      keywords: extractKeywords(fullContent),
    }];
  }

  const sections: Section[] = [];

  for (let i = 0; i < declarations.length; i++) {
    const decl = declarations[i];
    const nextDecl = declarations[i + 1];

    // Section ends at next declaration or end of file
    const endLine = nextDecl ? nextDecl.lineIndex : lines.length;

    // Extract section content
    const sectionLines = lines.slice(decl.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: `${decl.type} ${decl.name}`,
        lineStart: decl.lineIndex + 1, // 1-based
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
