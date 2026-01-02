import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// Patterns to detect Swift declarations
const PATTERNS = [
  /^(?:public|private|internal|fileprivate|open)?\s*(?:final)?\s*class\s+(\w+)/,
  /^(?:public|private|internal|fileprivate|open)?\s*struct\s+(\w+)/,
  /^(?:public|private|internal|fileprivate|open)?\s*enum\s+(\w+)/,
  /^(?:public|private|internal|fileprivate|open)?\s*protocol\s+(\w+)/,
  /^(?:public|private|internal|fileprivate|open)?\s*extension\s+(\w+)/,
  /^(?:public|private|internal|fileprivate|open)?\s*(?:static)?\s*func\s+(\w+)/,
  /^(?:public|private|internal|fileprivate|open)?\s*(?:static|class)?\s*(?:let|var)\s+(\w+)/,
  /^actor\s+(\w+)/,
];

interface Declaration {
  name: string;
  lineIndex: number;
  type: string;
}

function getDeclarationType(line: string): string {
  if (/\bclass\b/.test(line)) return 'class';
  if (/\bstruct\b/.test(line)) return 'struct';
  if (/\benum\b/.test(line)) return 'enum';
  if (/\bprotocol\b/.test(line)) return 'protocol';
  if (/\bextension\b/.test(line)) return 'extension';
  if (/\bfunc\b/.test(line)) return 'func';
  if (/\bactor\b/.test(line)) return 'actor';
  if (/\blet\b/.test(line)) return 'let';
  if (/\bvar\b/.test(line)) return 'var';
  return 'func';
}

export function parseSwift(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const declarations: Declaration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // Skip comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
      continue;
    }

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
    const endLine = nextDecl ? nextDecl.lineIndex : lines.length;
    const sectionLines = lines.slice(decl.lineIndex, endLine);
    const sectionContent = sectionLines.join('\n').trim();

    if (sectionContent) {
      sections.push({
        title: `${decl.type} ${decl.name}`,
        lineStart: decl.lineIndex + 1,
        lineEnd: endLine,
        preview: sectionContent.slice(0, 100),
        tokens: estimateTokens(sectionContent),
        keywords: extractKeywords(sectionContent),
      });
    }
  }

  return sections;
}
