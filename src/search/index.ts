import type { ProjectIndex, ScoredSection, SearchOptions } from '../types.js';
import { normalizeQuery } from './keywords.js';

// Scoring weights
const TITLE_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
const PREVIEW_WEIGHT = 1;

export function searchSections(
  index: ProjectIndex,
  query: string,
  options?: SearchOptions
): ScoredSection[] {
  const queryKeywords = normalizeQuery(query);

  if (queryKeywords.length === 0) {
    return [];
  }

  const results: ScoredSection[] = [];

  for (const file of index.files) {
    for (const section of file.sections) {
      const score = scoreSection(section, queryKeywords);

      if (score > 0) {
        results.push({
          file: file.path,
          section,
          score,
        });
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Apply limits
  let filtered = results;

  if (options?.maxResults) {
    filtered = filtered.slice(0, options.maxResults);
  }

  if (options?.maxTokens) {
    let totalTokens = 0;
    const withinBudget: ScoredSection[] = [];

    for (const result of filtered) {
      if (totalTokens + result.section.tokens <= options.maxTokens) {
        withinBudget.push(result);
        totalTokens += result.section.tokens;
      }
    }

    filtered = withinBudget;
  }

  return filtered;
}

function scoreSection(
  section: { title: string; preview: string; keywords: string[] },
  queryKeywords: string[]
): number {
  let score = 0;
  const titleLower = section.title.toLowerCase();
  const previewLower = section.preview.toLowerCase();

  for (const keyword of queryKeywords) {
    // Title matches (highest weight)
    if (titleLower.includes(keyword)) {
      score += TITLE_WEIGHT;
    }

    // Keyword matches (medium weight)
    if (section.keywords.includes(keyword)) {
      score += KEYWORD_WEIGHT;
    }

    // Preview matches (lowest weight)
    if (previewLower.includes(keyword)) {
      score += PREVIEW_WEIGHT;
    }
  }

  // Normalize by number of query keywords
  return score / queryKeywords.length;
}

export function findExactMatches(
  index: ProjectIndex,
  phrase: string
): ScoredSection[] {
  const phraseLower = phrase.toLowerCase();
  const results: ScoredSection[] = [];

  for (const file of index.files) {
    for (const section of file.sections) {
      const titleLower = section.title.toLowerCase();

      if (titleLower.includes(phraseLower)) {
        results.push({
          file: file.path,
          section,
          score: 10, // High score for exact matches
        });
      }
    }
  }

  return results;
}

// Re-export topic extraction for auto-scout
export { extractTopics } from './keywords.js';
