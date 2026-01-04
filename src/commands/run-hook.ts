// Default command: run as hook (reads JSON from stdin, outputs suggestions)

import { stat } from 'fs/promises';
import { join } from 'path';
import { configExists, loadConfig } from '../config/index.js';
import { loadIndex } from '../indexer/index.js';
import { searchSections } from '../search/index.js';
import { extractTopics, setDomainStopwords } from '../search/keywords.js';
import { logSuggestion, getDefaultAuditLogConfig } from '../audit-log/index.js';
import { recordSuggestion, getDefaultAnalyticsConfig } from '../analytics/index.js';
import { buildRelationGraph, findRelatedForResults, type FileRelation } from '../relations/index.js';
import type { HookInput, ScoredSection, ProjectIndex, SuggestionsConfig } from '../types.js';

const SETUP_INSTRUCTIONS = `Run \`npx ctx-pilot init\` to set up.`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function getStaleFiles(projectRoot: string, index: ProjectIndex): Promise<Set<string>> {
  const stale = new Set<string>();
  const indexDate = new Date(index.lastUpdated);

  for (const file of index.files) {
    try {
      const fileStat = await stat(join(projectRoot, file.path));
      if (fileStat.mtime > indexDate) {
        stale.add(file.path);
      }
    } catch {
      // File deleted or inaccessible = stale
      stale.add(file.path);
    }
  }

  return stale;
}

function formatSuggestions(
  pinnedFiles: string[],
  results: ScoredSection[],
  staleFiles: Set<string>,
  relatedFiles: FileRelation[] = [],
  maxSuggestions = 5
): { text: string; hasStale: boolean } {
  const lines: string[] = [];
  let hasStale = false;

  if (pinnedFiles.length > 0) {
    lines.push('**Pinned (always relevant):**');
    for (const file of pinnedFiles) {
      lines.push(`- ${file}`);
    }
    lines.push('');
  }

  if (results.length > 0) {
    lines.push('**Relevant to your task:**');
    const top = results.slice(0, maxSuggestions);
    for (const r of top) {
      const lineRange = `lines ${r.section.lineStart}-${r.section.lineEnd}`;
      const staleMarker = staleFiles.has(r.file) ? ' ⚠️' : '';
      if (staleFiles.has(r.file)) hasStale = true;
      lines.push(`- ${r.file} (${lineRange}) - ${r.section.title}${staleMarker}`);
    }
  }

  if (relatedFiles.length > 0) {
    lines.push('');
    lines.push('**Related files:**');
    for (const rel of relatedFiles) {
      const reason = rel.relationType === 'import' ? 'imported by above' : 'often read together';
      lines.push(`- ${rel.file} - ${reason}`);
    }
  }

  return { text: lines.join('\n'), hasStale };
}

function getDefaultSuggestionsConfig(): SuggestionsConfig {
  return {
    includeRelated: false,
    maxRelated: 2,
  };
}

export async function runHook(): Promise<void> {
  const projectRoot = process.cwd();

  try {
    const input = await readStdin();
    if (!input.trim()) process.exit(0);

    let data: HookInput;
    try {
      data = JSON.parse(input);
    } catch {
      process.exit(0);
    }

    if (!(await configExists(projectRoot))) {
      console.log(SETUP_INSTRUCTIONS);
      process.exit(0);
    }

    const config = await loadConfig(projectRoot);

    // Set domain-specific stopwords if configured
    if (config.domainStopwords && config.domainStopwords.length > 0) {
      setDomainStopwords(config.domainStopwords);
    }

    const index = await loadIndex(projectRoot);
    if (!index) {
      console.log(`<ctx-pilot>
No index found. Ask your AI to: "Follow the instructions in .context/optimize.md"
</ctx-pilot>`);
      process.exit(0);
    }

    const topics = extractTopics(data.prompt);
    const hasPinned = config.pinned.length > 0;

    // Smart skip: configurable thresholds
    const minTopics = config.minTopics ?? 2;
    const minScore = config.minScore ?? 1.0;

    // Smart skip: if fewer than minTopics and no pinned files, stay silent
    if (topics.length < minTopics && !hasPinned) {
      process.exit(0);
    }

    const query = topics.join(' ');
    const results = query ? searchSections(index, query, { maxResults: 10 }) : [];

    // Smart skip: if no results score above threshold and no pinned files, stay silent
    const hasRelevantResults = results.some((r) => r.score >= minScore);
    if (!hasRelevantResults && !hasPinned) {
      process.exit(0);
    }

    // Filter results to only include those above threshold
    let relevantResults = results.filter((r) => r.score >= minScore);

    // Filter out excludeFromSuggestions patterns
    if (config.excludeFromSuggestions && config.excludeFromSuggestions.length > 0) {
      const excludePatterns = config.excludeFromSuggestions;
      relevantResults = relevantResults.filter((r) => {
        return !excludePatterns.some((pattern) => {
          // Simple glob matching: ** matches anything, * matches non-slash
          const regex = new RegExp(
            '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
          );
          return regex.test(r.file);
        });
      });
    }

    // Check for stale files
    const staleFiles = await getStaleFiles(projectRoot, index);

    // Get related files if enabled
    const suggestionsConfig = config.suggestions || getDefaultSuggestionsConfig();
    let relatedFiles: FileRelation[] = [];

    if (suggestionsConfig.includeRelated && relevantResults.length > 0) {
      try {
        const graph = await buildRelationGraph(projectRoot, index);
        const resultFiles = relevantResults.map(r => r.file);
        relatedFiles = findRelatedForResults(graph, resultFiles, suggestionsConfig.maxRelated);
      } catch {
        // Fail silently - related files are a nice-to-have
      }
    }

    const { text: suggestions, hasStale } = formatSuggestions(
      config.pinned,
      relevantResults,
      staleFiles,
      relatedFiles
    );

    if (suggestions) {
      const staleNote = hasStale
        ? '\n\n⚠️ Before answering, update .context/index.json for files marked ⚠️.'
        : '';

      console.log(`<ctx-pilot>
Look into these files for context:

${suggestions}${staleNote}
</ctx-pilot>`);

      // Log to audit log (async, fire-and-forget to not block hook)
      const auditConfig = config.auditLog || getDefaultAuditLogConfig();
      if (auditConfig.enabled) {
        const suggestedFiles = [
          ...config.pinned,
          ...relevantResults.map(r => r.file),
        ];
        const topScore = relevantResults.length > 0 ? relevantResults[0].score : undefined;
        logSuggestion(projectRoot, auditConfig, data.prompt, suggestedFiles, topScore).catch(() => {});
      }

      // Record analytics (async, fire-and-forget)
      const analyticsConfig = config.analytics || getDefaultAnalyticsConfig();
      if (analyticsConfig.enabled) {
        const suggestedFiles = [
          ...config.pinned,
          ...relevantResults.map(r => r.file),
        ];
        const topScore = relevantResults.length > 0 ? relevantResults[0].score : undefined;
        recordSuggestion(projectRoot, analyticsConfig, {
          query: data.prompt.slice(0, 200), // Truncate for privacy
          topicsExtracted: topics,
          filesShown: suggestedFiles,
          topScore,
        }).catch(() => {});
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('ctx-pilot error:', error);
    process.exit(0);
  }
}
