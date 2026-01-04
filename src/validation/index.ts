import { access, stat } from 'fs/promises';
import { join } from 'path';
import type {
  CtxPilotConfig,
  ProjectIndex,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types.js';

const LARGE_SECTION_THRESHOLD = 500; // lines

export async function validateIndex(
  projectRoot: string,
  config: CtxPilotConfig,
  index: ProjectIndex
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Check pinned files exist
  for (const pinned of config.pinned) {
    try {
      await access(join(projectRoot, pinned));
    } catch {
      errors.push({
        type: 'missing_pinned',
        file: pinned,
        details: `Pinned file does not exist: ${pinned}`,
      });
    }
  }

  // 2. Check index entries
  const indexDate = new Date(index.lastUpdated);

  for (const fileEntry of index.files) {
    const filePath = join(projectRoot, fileEntry.path);

    // Check file exists (orphaned entry)
    try {
      const fileStat = await stat(filePath);

      // Check staleness
      if (fileStat.mtime > indexDate) {
        warnings.push({
          type: 'stale_file',
          file: fileEntry.path,
          details: `File modified after last index: ${fileEntry.path}`,
        });
      }
    } catch {
      errors.push({
        type: 'orphaned_entry',
        file: fileEntry.path,
        details: `Indexed file no longer exists: ${fileEntry.path}`,
      });
      continue;
    }

    // Validate sections
    for (const section of fileEntry.sections) {
      // Check line numbers
      if (section.lineStart < 1 || section.lineEnd < section.lineStart) {
        errors.push({
          type: 'invalid_line_numbers',
          file: fileEntry.path,
          details: `Invalid line range ${section.lineStart}-${section.lineEnd} in section "${section.title}"`,
        });
      }

      // Check keywords
      if (!section.keywords || section.keywords.length === 0) {
        errors.push({
          type: 'empty_keywords',
          file: fileEntry.path,
          details: `Section "${section.title}" has no keywords`,
        });
      }

      // Warn about large sections
      const sectionSize = section.lineEnd - section.lineStart;
      if (sectionSize > LARGE_SECTION_THRESHOLD) {
        warnings.push({
          type: 'large_section',
          file: fileEntry.path,
          details: `Section "${section.title}" spans ${sectionSize} lines`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  [${error.type}] ${error.details}`);
    }
  }

  if (result.warnings.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  [${warning.type}] ${warning.details}`);
    }
  }

  if (result.valid && result.warnings.length === 0) {
    lines.push('Index is valid. No issues found.');
  } else if (result.valid) {
    lines.push('');
    lines.push(`Index is valid with ${result.warnings.length} warning(s).`);
  } else {
    lines.push('');
    lines.push(`Index has ${result.errors.length} error(s).`);
  }

  return lines.join('\n');
}
