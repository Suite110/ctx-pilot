// Audit Log - track suggestions for compliance/security

import { appendFile, readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { userInfo } from 'os';
import type { AuditLogConfig } from '../types.js';

export interface AuditEntry {
  ts: string;
  event: 'suggestion' | 'index_update' | 'sync' | 'publish';
  user: string;
  prompt_hash?: string;
  files?: string[];
  score?: number;
  files_changed?: number;
}

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 12);
}

function getUser(): string {
  try {
    return userInfo().username || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function parseRetention(retention: string): number {
  const match = retention.match(/^(\d+)([dwhm])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}

export async function logAuditEntry(
  projectRoot: string,
  config: AuditLogConfig,
  entry: Omit<AuditEntry, 'ts' | 'user'>
): Promise<void> {
  if (!config.enabled) return;

  const logPath = join(projectRoot, config.path);

  // Ensure directory exists
  await mkdir(dirname(logPath), { recursive: true });

  const fullEntry: AuditEntry = {
    ts: new Date().toISOString(),
    user: getUser(),
    ...entry,
  };

  const line = JSON.stringify(fullEntry) + '\n';

  try {
    await appendFile(logPath, line, 'utf-8');
  } catch {
    // Fail silently - audit log should not break main functionality
  }
}

export async function logSuggestion(
  projectRoot: string,
  config: AuditLogConfig,
  prompt: string,
  files: string[],
  topScore?: number
): Promise<void> {
  await logAuditEntry(projectRoot, config, {
    event: 'suggestion',
    prompt_hash: hashPrompt(prompt),
    files,
    score: topScore,
  });
}

export async function logIndexUpdate(
  projectRoot: string,
  config: AuditLogConfig,
  filesChanged: number
): Promise<void> {
  await logAuditEntry(projectRoot, config, {
    event: 'index_update',
    files_changed: filesChanged,
  });
}

export async function readAuditLog(
  projectRoot: string,
  config: AuditLogConfig,
  options?: { limit?: number; since?: Date }
): Promise<AuditEntry[]> {
  const logPath = join(projectRoot, config.path);

  try {
    const content = await readFile(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let entries = lines.map(line => {
      try {
        return JSON.parse(line) as AuditEntry;
      } catch {
        return null;
      }
    }).filter((e): e is AuditEntry => e !== null);

    // Filter by since date
    if (options?.since) {
      const sinceTime = options.since.getTime();
      entries = entries.filter(e => new Date(e.ts).getTime() >= sinceTime);
    }

    // Limit results (from the end, most recent)
    if (options?.limit) {
      entries = entries.slice(-options.limit);
    }

    return entries;
  } catch {
    return [];
  }
}

export async function clearAuditLog(
  projectRoot: string,
  config: AuditLogConfig,
  options?: { olderThan?: Date }
): Promise<number> {
  const logPath = join(projectRoot, config.path);

  if (!options?.olderThan) {
    // Clear all
    try {
      await writeFile(logPath, '', 'utf-8');
      return -1; // All cleared
    } catch {
      return 0;
    }
  }

  // Clear entries older than specified date
  const entries = await readAuditLog(projectRoot, config);
  const cutoffTime = options.olderThan.getTime();

  const remaining = entries.filter(e => new Date(e.ts).getTime() >= cutoffTime);
  const removed = entries.length - remaining.length;

  try {
    const content = remaining.map(e => JSON.stringify(e)).join('\n') + (remaining.length > 0 ? '\n' : '');
    await writeFile(logPath, content, 'utf-8');
    return removed;
  } catch {
    return 0;
  }
}

export async function enforceRetention(
  projectRoot: string,
  config: AuditLogConfig
): Promise<number> {
  const retentionMs = parseRetention(config.retention);
  const cutoff = new Date(Date.now() - retentionMs);
  return clearAuditLog(projectRoot, config, { olderThan: cutoff });
}

export function formatAuditLog(entries: AuditEntry[]): string {
  const lines: string[] = [];

  for (const entry of entries) {
    const date = new Date(entry.ts).toLocaleString();

    switch (entry.event) {
      case 'suggestion':
        lines.push(`[${date}] ${entry.user}: suggestion (${entry.files?.length || 0} files, score: ${entry.score?.toFixed(2) || 'N/A'})`);
        break;
      case 'index_update':
        lines.push(`[${date}] ${entry.user}: index_update (${entry.files_changed} files changed)`);
        break;
      case 'sync':
        lines.push(`[${date}] ${entry.user}: sync`);
        break;
      case 'publish':
        lines.push(`[${date}] ${entry.user}: publish`);
        break;
    }
  }

  return lines.join('\n');
}

export function getDefaultAuditLogConfig(): AuditLogConfig {
  return {
    enabled: false,
    path: '.context/audit.log',
    retention: '30d',
  };
}
