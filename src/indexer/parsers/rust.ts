import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// Patterns to detect Rust declarations
const PATTERNS = [
  /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,
  /^(?:pub\s+)?struct\s+(\w+)/,
  /^(?:pub\s+)?enum\s+(\w+)/,
  /^(?:pub\s+)?trait\s+(\w+)/,
  /^(?:pub\s+)?impl(?:<[^>]+>)?\s+(?:(\w+)|(\w+)\s+for\s+(\w+))/,
  /^(?:pub\s+)?mod\s+(\w+)/,
];

interface Declaration {
  name: string;
  lineIndex: number;
  type: string;
}

function getDeclarationType(line: string): string {
  if (/\bfn\b/.test(line)) return 'fn';
  if (/\bstruct\b/.test(line)) return 'struct';
  if (/\benum\b/.test(line)) return 'enum';
  if (/\btrait\b/.test(line)) return 'trait';
  if (/\bimpl\b/.test(line)) return 'impl';
  if (/\bmod\b/.test(line)) return 'mod';
  return 'item';
}

export function parseRust(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const declarations: Declaration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Only match top-level declarations (no leading whitespace)
    if (line.startsWith(' ') || line.startsWith('\t')) {
      continue;
    }

    for (const pattern of PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Get the first captured group that's not undefined
        const name = match.slice(1).find(g => g !== undefined) || 'anonymous';
        declarations.push({
          name,
          lineIndex: i,
          type: getDeclarationType(line),
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
