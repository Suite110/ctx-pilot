// Index Quality Report - audit command

import { stat } from 'fs/promises';
import { join } from 'path';
import type { CtxPilotConfig, ProjectIndex, Section } from '../types.js';
import { scanFiles } from '../indexer/file-scanner.js';

export interface AuditReport {
  score: number;
  coverage: CoverageStats;
  issues: AuditIssue[];
  recommendations: Recommendation[];
}

export interface CoverageStats {
  filesIndexed: number;
  filesTotal: number;
  filesPercent: number;
  sectionsWithKeywords: number;
  sectionsTotal: number;
  sectionsPercent: number;
  avgKeywordsPerSection: number;
}

export interface AuditIssue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  file?: string;
  section?: string;
  message: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  target?: string;
  reason: string;
}

const MIN_KEYWORDS_THRESHOLD = 3;
const STALE_THRESHOLD_DAYS = 7;

export async function auditIndex(
  projectRoot: string,
  config: CtxPilotConfig,
  index: ProjectIndex
): Promise<AuditReport> {
  const issues: AuditIssue[] = [];
  const recommendations: Recommendation[] = [];

  // Get all files that should be indexed
  const allFiles = await scanFiles(projectRoot, {
    include: config.include,
    exclude: config.exclude,
  });

  const indexedFiles = new Set(index.files.map(f => f.path));
  const indexDate = new Date(index.lastUpdated);
  const now = new Date();

  // Coverage stats
  let sectionsWithKeywords = 0;
  let sectionsTotal = 0;
  let totalKeywords = 0;

  for (const file of index.files) {
    for (const section of file.sections) {
      sectionsTotal++;
      if (section.keywords && section.keywords.length > 0) {
        sectionsWithKeywords++;
        totalKeywords += section.keywords.length;
      }
    }
  }

  const coverage: CoverageStats = {
    filesIndexed: index.files.length,
    filesTotal: allFiles.length,
    filesPercent: allFiles.length > 0 ? Math.round((index.files.length / allFiles.length) * 100) : 0,
    sectionsWithKeywords,
    sectionsTotal,
    sectionsPercent: sectionsTotal > 0 ? Math.round((sectionsWithKeywords / sectionsTotal) * 100) : 0,
    avgKeywordsPerSection: sectionsTotal > 0 ? Math.round((totalKeywords / sectionsTotal) * 10) / 10 : 0,
  };

  // Check for missing files (files that should be indexed but aren't)
  const missingFiles: string[] = [];
  for (const file of allFiles) {
    if (!indexedFiles.has(file)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    issues.push({
      severity: 'warning',
      type: 'missing_coverage',
      message: `${missingFiles.length} files match include patterns but are not indexed`,
    });

    // Group by directory for recommendation
    const dirCounts = new Map<string, number>();
    for (const file of missingFiles) {
      const dir = file.split('/').slice(0, -1).join('/') || '.';
      dirCounts.set(dir, (dirCounts.get(dir) || 0) + 1);
    }

    const sortedDirs = Array.from(dirCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [dir, count] of sortedDirs) {
      recommendations.push({
        priority: 'medium',
        action: `Index coverage gap: ${dir}/ has ${count} unindexed files`,
        target: dir,
        reason: 'Files matching include patterns are not in the index',
      });
    }
  }

  // Check for weak sections (< MIN_KEYWORDS_THRESHOLD keywords)
  const weakSections: { file: string; section: string }[] = [];
  for (const file of index.files) {
    for (const section of file.sections) {
      if (!section.keywords || section.keywords.length < MIN_KEYWORDS_THRESHOLD) {
        weakSections.push({ file: file.path, section: section.title });
      }
    }
  }

  if (weakSections.length > 0) {
    issues.push({
      severity: 'warning',
      type: 'weak_keywords',
      message: `${weakSections.length} sections have < ${MIN_KEYWORDS_THRESHOLD} keywords (weak searchability)`,
    });
  }

  // Check for empty files (indexed but no sections)
  const emptyFiles = index.files.filter(f => f.sections.length === 0);
  if (emptyFiles.length > 0) {
    issues.push({
      severity: 'info',
      type: 'empty_files',
      message: `${emptyFiles.length} files have no sections extracted`,
    });
  }

  // Check for stale files
  const staleFiles: string[] = [];
  for (const file of index.files) {
    try {
      const fileStat = await stat(join(projectRoot, file.path));
      if (fileStat.mtime > indexDate) {
        staleFiles.push(file.path);
      }
    } catch {
      // File doesn't exist anymore
      issues.push({
        severity: 'error',
        type: 'orphaned',
        file: file.path,
        message: `Indexed file no longer exists: ${file.path}`,
      });
    }
  }

  if (staleFiles.length > 0) {
    issues.push({
      severity: 'warning',
      type: 'stale_files',
      message: `${staleFiles.length} files modified since last index`,
    });
  }

  // Check index age
  const daysSinceUpdate = Math.floor((now.getTime() - indexDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate > STALE_THRESHOLD_DAYS) {
    issues.push({
      severity: 'info',
      type: 'old_index',
      message: `Index is ${daysSinceUpdate} days old`,
    });
  }

  // Check for missing synonyms (auto-generated sections without rich keywords)
  const autoSections = index.files.flatMap(f =>
    f.sections.filter(s => s.source === 'auto' && (!s.keywords || s.keywords.length < 5))
  );

  if (autoSections.length > 10) {
    recommendations.push({
      priority: 'high',
      action: 'Add synonyms to auto-indexed sections',
      reason: `${autoSections.length} sections have minimal keywords - AI enhancement recommended`,
    });
  }

  // Check pinned files
  for (const pinned of config.pinned) {
    try {
      await stat(join(projectRoot, pinned));
    } catch {
      issues.push({
        severity: 'error',
        type: 'missing_pinned',
        file: pinned,
        message: `Pinned file does not exist: ${pinned}`,
      });
    }
  }

  // Add high-traffic file recommendations (based on section count as proxy)
  const filesByActivity = index.files
    .filter(f => f.sections.length > 3)
    .sort((a, b) => b.sections.length - a.sections.length)
    .slice(0, 5);

  for (const file of filesByActivity) {
    const avgKeywords = file.sections.reduce((sum, s) => sum + (s.keywords?.length || 0), 0) / file.sections.length;
    if (avgKeywords < 4 && !config.pinned.includes(file.path)) {
      recommendations.push({
        priority: 'medium',
        action: `Add synonyms to: ${file.path}`,
        target: file.path,
        reason: `High activity file (${file.sections.length} sections) with low keyword coverage`,
      });
    }
  }

  // Suggest pinning high-value files
  const candidatesForPinning = index.files
    .filter(f => !config.pinned.includes(f.path))
    .filter(f =>
      f.path.includes('architecture') ||
      f.path.includes('README') ||
      f.path.includes('CLAUDE') ||
      f.path.includes('overview') ||
      f.sections.length > 10
    )
    .slice(0, 3);

  for (const file of candidatesForPinning) {
    recommendations.push({
      priority: 'low',
      action: `Consider pinning: ${file.path}`,
      target: file.path,
      reason: 'High-value file that may be useful in every context',
    });
  }

  // Calculate score
  const score = calculateScore(coverage, issues);

  return { score, coverage, issues, recommendations };
}

function calculateScore(coverage: CoverageStats, issues: AuditIssue[]): number {
  let score = 100;

  // Coverage penalties
  if (coverage.filesPercent < 90) score -= (90 - coverage.filesPercent) * 0.3;
  if (coverage.sectionsPercent < 90) score -= (90 - coverage.sectionsPercent) * 0.2;
  if (coverage.avgKeywordsPerSection < 4) score -= (4 - coverage.avgKeywordsPerSection) * 5;

  // Issue penalties
  for (const issue of issues) {
    switch (issue.severity) {
      case 'error': score -= 10; break;
      case 'warning': score -= 3; break;
      case 'info': score -= 1; break;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function formatAuditReport(report: AuditReport): string {
  const lines: string[] = [];

  lines.push('Index Quality Report');
  lines.push('====================');
  lines.push('');
  lines.push(`Overall Score: ${report.score}/100`);
  lines.push('');

  lines.push('Coverage:');
  lines.push(`  Files indexed: ${report.coverage.filesIndexed}/${report.coverage.filesTotal} (${report.coverage.filesPercent}%)`);
  lines.push(`  Sections with keywords: ${report.coverage.sectionsWithKeywords}/${report.coverage.sectionsTotal} (${report.coverage.sectionsPercent}%)`);
  lines.push(`  Avg keywords per section: ${report.coverage.avgKeywordsPerSection}`);
  lines.push('');

  if (report.issues.length > 0) {
    lines.push('Issues Found:');
    for (const issue of report.issues) {
      const icon = issue.severity === 'error' ? '[!]' : issue.severity === 'warning' ? '[!]' : '[i]';
      lines.push(`  ${icon} ${issue.message}`);
    }
    lines.push('');
  }

  if (report.recommendations.length > 0) {
    lines.push('Recommendations:');
    for (const rec of report.recommendations) {
      lines.push(`  - ${rec.action}`);
      if (rec.reason) {
        lines.push(`    (${rec.reason})`);
      }
    }
    lines.push('');
  }

  if (report.score >= 90) {
    lines.push('Index is in great shape!');
  } else if (report.score >= 70) {
    lines.push('Index is functional but could be improved.');
  } else {
    lines.push('Index needs attention. Run `npx ctx-pilot auto-index` to rebuild.');
  }

  return lines.join('\n');
}
