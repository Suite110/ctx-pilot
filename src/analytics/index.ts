// Usage Analytics - track what's being suggested to improve index

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { AnalyticsConfig } from '../types.js';

export interface SuggestionEvent {
  timestamp: string;
  query: string;
  topicsExtracted: string[];
  filesShown: string[];
  topScore?: number;
}

export interface AnalyticsData {
  version: string;
  suggestions: SuggestionEvent[];
}

export interface AnalyticsStats {
  totalSuggestions: number;
  uniqueFilesShown: number;
  dateRange: { start: string; end: string } | null;
  mostSuggestedFiles: Array<{ file: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  queriesWithNoResults: Array<{ query: string; count: number }>;
  avgFilesPerSuggestion: number;
}

const ANALYTICS_PATH = '.context/analytics.json';
const ANALYTICS_VERSION = '1.0.0';

async function loadAnalytics(projectRoot: string): Promise<AnalyticsData> {
  const filePath = join(projectRoot, ANALYTICS_PATH);
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as AnalyticsData;
  } catch {
    return { version: ANALYTICS_VERSION, suggestions: [] };
  }
}

async function saveAnalytics(projectRoot: string, data: AnalyticsData): Promise<void> {
  const filePath = join(projectRoot, ANALYTICS_PATH);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function recordSuggestion(
  projectRoot: string,
  config: AnalyticsConfig,
  event: Omit<SuggestionEvent, 'timestamp'>
): Promise<void> {
  if (!config.enabled) return;

  try {
    const data = await loadAnalytics(projectRoot);

    data.suggestions.push({
      timestamp: new Date().toISOString(),
      ...event,
    });

    // Keep only last 30 days of data
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    data.suggestions = data.suggestions.filter(
      s => new Date(s.timestamp) >= cutoff
    );

    await saveAnalytics(projectRoot, data);
  } catch {
    // Fail silently
  }
}

export async function getAnalyticsStats(
  projectRoot: string,
  days = 30
): Promise<AnalyticsStats> {
  const data = await loadAnalytics(projectRoot);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentSuggestions = data.suggestions.filter(
    s => new Date(s.timestamp) >= cutoff
  );

  if (recentSuggestions.length === 0) {
    return {
      totalSuggestions: 0,
      uniqueFilesShown: 0,
      dateRange: null,
      mostSuggestedFiles: [],
      topTopics: [],
      queriesWithNoResults: [],
      avgFilesPerSuggestion: 0,
    };
  }

  // Count file suggestions
  const fileCounts = new Map<string, number>();
  const topicCounts = new Map<string, number>();
  const noResultQueries = new Map<string, number>();
  let totalFiles = 0;

  for (const suggestion of recentSuggestions) {
    // Count files
    for (const file of suggestion.filesShown) {
      fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
      totalFiles++;
    }

    // Count topics
    for (const topic of suggestion.topicsExtracted) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }

    // Track no-result queries
    if (suggestion.filesShown.length === 0 && suggestion.topicsExtracted.length > 0) {
      const query = suggestion.topicsExtracted.join(' ');
      noResultQueries.set(query, (noResultQueries.get(query) || 0) + 1);
    }
  }

  // Sort and limit
  const mostSuggestedFiles = Array.from(fileCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  const topTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  const queriesWithNoResults = Array.from(noResultQueries.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([query, count]) => ({ query, count }));

  // Get date range
  const timestamps = recentSuggestions.map(s => s.timestamp).sort();

  return {
    totalSuggestions: recentSuggestions.length,
    uniqueFilesShown: fileCounts.size,
    dateRange: {
      start: timestamps[0],
      end: timestamps[timestamps.length - 1],
    },
    mostSuggestedFiles,
    topTopics,
    queriesWithNoResults,
    avgFilesPerSuggestion: recentSuggestions.length > 0
      ? Math.round((totalFiles / recentSuggestions.length) * 10) / 10
      : 0,
  };
}

export async function clearAnalytics(projectRoot: string): Promise<void> {
  await saveAnalytics(projectRoot, { version: ANALYTICS_VERSION, suggestions: [] });
}

export function formatAnalyticsStats(stats: AnalyticsStats): string {
  const lines: string[] = [];

  lines.push(`Usage Statistics (last 30 days)`);
  lines.push('='.repeat(35));
  lines.push('');

  if (stats.totalSuggestions === 0) {
    lines.push('No usage data collected yet.');
    lines.push('');
    lines.push('Enable analytics in .context/config.json:');
    lines.push('  "analytics": { "enabled": true }');
    return lines.join('\n');
  }

  lines.push(`Suggestions: ${stats.totalSuggestions.toLocaleString()}`);
  lines.push(`Files suggested: ${stats.uniqueFilesShown} unique`);
  lines.push(`Avg files per suggestion: ${stats.avgFilesPerSuggestion}`);
  lines.push('');

  if (stats.mostSuggestedFiles.length > 0) {
    lines.push('Most Valuable Files:');
    for (let i = 0; i < Math.min(5, stats.mostSuggestedFiles.length); i++) {
      const { file, count } = stats.mostSuggestedFiles[i];
      lines.push(`  ${i + 1}. ${file} (suggested ${count}x)`);
    }
    lines.push('');
  }

  if (stats.topTopics.length > 0) {
    lines.push('Top Search Topics:');
    for (const { topic, count } of stats.topTopics.slice(0, 5)) {
      lines.push(`  - "${topic}" (${count}x)`);
    }
    lines.push('');
  }

  if (stats.queriesWithNoResults.length > 0) {
    lines.push('Search Terms with No Results:');
    for (const { query, count } of stats.queriesWithNoResults) {
      lines.push(`  - "${query}" (${count}x) - missing coverage?`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function getDefaultAnalyticsConfig(): AnalyticsConfig {
  return {
    enabled: false,
    storage: 'local',
  };
}
