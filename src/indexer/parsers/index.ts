import type { SectionParser } from '../../types.js';
import { parseMarkdown } from './markdown.js';
import { parseJavaScript } from './javascript.js';
import { parsePython } from './python.js';
import { parseGo } from './go.js';
import { parseRust } from './rust.js';
import { parseShader } from './shader.js';
import { parseStructured } from './structured.js';
import { parsePlain } from './plain.js';
import { parseJava } from './java.js';
import { parseCSharp } from './csharp.js';
import { parseC } from './c.js';
import { parseRuby } from './ruby.js';
import { parsePHP } from './php.js';
import { parseSwift } from './swift.js';
import { parseDart } from './dart.js';
import { parseShell } from './shell.js';
import { parseRST } from './rst.js';
import { parseAsciiDoc } from './asciidoc.js';
import { parseTOML } from './toml.js';
import { parseXML } from './xml.js';
import { getExtension } from '../../utils/paths.js';

const parsersByExtension: Record<string, SectionParser> = {
  // Markdown
  '.md': parseMarkdown,
  '.markdown': parseMarkdown,

  // JavaScript/TypeScript
  '.js': parseJavaScript,
  '.mjs': parseJavaScript,
  '.cjs': parseJavaScript,
  '.ts': parseJavaScript,
  '.mts': parseJavaScript,
  '.cts': parseJavaScript,
  '.jsx': parseJavaScript,
  '.tsx': parseJavaScript,

  // Python
  '.py': parsePython,
  '.pyw': parsePython,

  // Go
  '.go': parseGo,

  // Rust
  '.rs': parseRust,

  // Shaders
  '.hlsl': parseShader,
  '.fx': parseShader,
  '.glsl': parseShader,
  '.vert': parseShader,
  '.frag': parseShader,
  '.geom': parseShader,
  '.comp': parseShader,
  '.wgsl': parseShader,

  // Structured data
  '.yaml': parseStructured,
  '.yml': parseStructured,
  '.json': parseStructured,

  // Java/Kotlin
  '.java': parseJava,
  '.kt': parseJava,
  '.kts': parseJava,

  // C#
  '.cs': parseCSharp,

  // C/C++
  '.c': parseC,
  '.h': parseC,
  '.cpp': parseC,
  '.hpp': parseC,
  '.cc': parseC,
  '.cxx': parseC,
  '.hxx': parseC,

  // Ruby
  '.rb': parseRuby,
  '.rake': parseRuby,
  '.gemspec': parseRuby,

  // PHP
  '.php': parsePHP,

  // Swift
  '.swift': parseSwift,

  // Dart
  '.dart': parseDart,

  // Shell/Bash
  '.sh': parseShell,
  '.bash': parseShell,
  '.zsh': parseShell,
  '.fish': parseShell,

  // reStructuredText
  '.rst': parseRST,

  // AsciiDoc
  '.adoc': parseAsciiDoc,
  '.asciidoc': parseAsciiDoc,
  '.asc': parseAsciiDoc,

  // TOML
  '.toml': parseTOML,

  // XML/HTML
  '.xml': parseXML,
  '.html': parseXML,
  '.htm': parseXML,
  '.xhtml': parseXML,
  '.svg': parseXML,
  '.plist': parseXML,

  // Plain text
  '.txt': parsePlain,
};

export function getParser(filePath: string): SectionParser {
  const ext = getExtension(filePath);
  return parsersByExtension[ext] || parsePlain;
}

export function getSupportedExtensions(): string[] {
  return Object.keys(parsersByExtension);
}
