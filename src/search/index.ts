import type { ProjectIndex, ScoredSection, SearchOptions, Section } from '../types.js';
import { normalizeQuery } from './keywords.js';
import { stemWord } from './stemmer.js';
import { isFuzzyMatch } from './fuzzy.js';

// Scoring weights
const TITLE_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;
const PREVIEW_WEIGHT = 1;

// Penalty multipliers for non-exact matches
const STEM_MATCH_MULTIPLIER = 0.9;
const FUZZY_MATCH_MULTIPLIER = 0.5;

export function searchSections(
  index: ProjectIndex,
  query: string,
  options?: SearchOptions
): ScoredSection[] {
  const queryKeywords = normalizeQuery(query);

  if (queryKeywords.length === 0) {
    return [];
  }

  // Pre-compute stemmed versions of query keywords
  const useStemming = options?.useStemming ?? true;
  const useFuzzy = options?.useFuzzy ?? true;
  const stemmedQuery = useStemming ? queryKeywords.map(stemWord) : queryKeywords;

  const results: ScoredSection[] = [];

  for (const file of index.files) {
    for (const section of file.sections) {
      const score = scoreSection(section, queryKeywords, stemmedQuery, { useStemming, useFuzzy });

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

  // Apply limit
  if (options?.maxResults) {
    return results.slice(0, options.maxResults);
  }

  return results;
}

function scoreSection(
  section: Section,
  queryKeywords: string[],
  stemmedQuery: string[],
  options: { useStemming: boolean; useFuzzy: boolean }
): number {
  let score = 0;
  const titleLower = section.title.toLowerCase();
  const previewLower = section.preview.toLowerCase();

  // Pre-compute stemmed section keywords for matching
  const sectionKeywordsLower = section.keywords.map((k) => k.toLowerCase());
  const stemmedSectionKeywords = options.useStemming
    ? sectionKeywordsLower.map(stemWord)
    : sectionKeywordsLower;

  for (let i = 0; i < queryKeywords.length; i++) {
    const keyword = queryKeywords[i];
    const stemmedKeyword = stemmedQuery[i];
    let matched = false;

    // Title matches (highest weight)
    if (titleLower.includes(keyword)) {
      score += TITLE_WEIGHT;
      matched = true;
    } else if (options.useStemming && titleLower.includes(stemmedKeyword)) {
      score += TITLE_WEIGHT * STEM_MATCH_MULTIPLIER;
      matched = true;
    }

    // Keyword matches (medium weight)
    if (sectionKeywordsLower.includes(keyword)) {
      score += KEYWORD_WEIGHT;
      matched = true;
    } else if (options.useStemming && stemmedSectionKeywords.includes(stemmedKeyword)) {
      score += KEYWORD_WEIGHT * STEM_MATCH_MULTIPLIER;
      matched = true;
    } else if (options.useFuzzy && !matched) {
      // Fuzzy match against section keywords (only if no exact/stem match)
      for (const sectionKw of sectionKeywordsLower) {
        if (isFuzzyMatch(keyword, sectionKw)) {
          score += KEYWORD_WEIGHT * FUZZY_MATCH_MULTIPLIER;
          matched = true;
          break;
        }
      }
    }

    // Preview matches (lowest weight)
    if (previewLower.includes(keyword)) {
      score += PREVIEW_WEIGHT;
    } else if (options.useStemming && previewLower.includes(stemmedKeyword)) {
      score += PREVIEW_WEIGHT * STEM_MATCH_MULTIPLIER;
    }
  }

  // Normalize by number of query keywords
  return score / queryKeywords.length;
}

// Re-export topic extraction for auto-scout
export { extractTopics } from './keywords.js';
