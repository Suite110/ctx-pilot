import type { Section } from '../../types.js';
import { estimateTokens } from '../../utils/tokens.js';
import { extractKeywords } from '../../search/keywords.js';

// Patterns for HLSL/GLSL/WGSL
const PATTERNS = [
  // HLSL/GLSL functions
  /^(?:void|float|int|vec\d|mat\d|bool|\w+)\s+(\w+)\s*\(/,
  // HLSL cbuffer/struct
  /^cbuffer\s+(\w+)/,
  /^struct\s+(\w+)/,
  // WGSL functions and entry points
  /^fn\s+(\w+)/,
  /^@(?:vertex|fragment|compute)[^]*fn\s+(\w+)/,
  // GLSL uniforms
  /^uniform\s+\w+\s+(\w+)/,
];

interface Declaration {
  name: string;
  lineIndex: number;
  type: string;
}

function getDeclarationType(line: string): string {
  if (/^cbuffer/.test(line)) return 'cbuffer';
  if (/^struct/.test(line)) return 'struct';
  if (/^uniform/.test(line)) return 'uniform';
  if (/@vertex/.test(line)) return 'vertex';
  if (/@fragment/.test(line)) return 'fragment';
  if (/@compute/.test(line)) return 'compute';
  return 'function';
}

export function parseShader(content: string, _filePath: string): Section[] {
  const lines = content.split('\n');
  const declarations: Declaration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const pattern of PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        declarations.push({
          name: match[1],
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
      title: 'Shader',
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
