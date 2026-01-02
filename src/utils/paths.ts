import { join, relative, resolve, extname } from 'path';

export function toRelativePath(projectRoot: string, absolutePath: string): string {
  return relative(projectRoot, absolutePath).replace(/\\/g, '/');
}

export function toAbsolutePath(projectRoot: string, relativePath: string): string {
  return resolve(projectRoot, relativePath);
}

export function getExtension(filePath: string): string {
  return extname(filePath).toLowerCase();
}

export function normalizeSlashes(path: string): string {
  return path.replace(/\\/g, '/');
}

export function getIndexPath(projectRoot: string): string {
  return join(projectRoot, '.context', 'index.json');
}

export function getClaudeMdPath(projectRoot: string): string {
  return join(projectRoot, 'CLAUDE.md');
}

export function getClaudeSettingsPath(projectRoot: string): string {
  return join(projectRoot, '.claude', 'settings.json');
}
