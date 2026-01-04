// Fuzzy matching using Levenshtein distance
// Used to tolerate typos in search queries

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits to transform a into b)
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  // Quick checks
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;
  if (a === b) return 0;

  // Use two rows for space efficiency
  let prevRow = new Array<number>(bLen + 1);
  let currRow = new Array<number>(bLen + 1);

  // Initialize first row
  for (let j = 0; j <= bLen; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= aLen; i++) {
    currRow[0] = i;

    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    // Swap rows
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[bLen];
}

/**
 * Calculate similarity score between two strings (0-1, higher is better)
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Check if two words are a fuzzy match
 * Only considers words >= minLength to avoid false positives on short words
 */
export function isFuzzyMatch(
  query: string,
  target: string,
  options?: { threshold?: number; minLength?: number }
): boolean {
  const threshold = options?.threshold ?? 0.8;
  const minLength = options?.minLength ?? 5;

  // Exact match always passes
  if (query === target) return true;

  // Skip fuzzy matching for short words (too many false positives)
  if (query.length < minLength || target.length < minLength) {
    return false;
  }

  // Check if lengths are too different (optimization)
  const lenDiff = Math.abs(query.length - target.length);
  const maxLen = Math.max(query.length, target.length);
  if (lenDiff / maxLen > 1 - threshold) {
    return false;
  }

  return similarity(query, target) >= threshold;
}

/**
 * Find best fuzzy matches from a list of candidates
 * Returns matches sorted by similarity (best first)
 */
export function findFuzzyMatches(
  query: string,
  candidates: string[],
  options?: { threshold?: number; minLength?: number; maxResults?: number }
): Array<{ word: string; similarity: number }> {
  const threshold = options?.threshold ?? 0.8;
  const minLength = options?.minLength ?? 5;
  const maxResults = options?.maxResults ?? 5;

  if (query.length < minLength) {
    return [];
  }

  const matches: Array<{ word: string; similarity: number }> = [];

  for (const candidate of candidates) {
    if (candidate.length < minLength) continue;

    const sim = similarity(query.toLowerCase(), candidate.toLowerCase());
    if (sim >= threshold) {
      matches.push({ word: candidate, similarity: sim });
    }
  }

  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches.slice(0, maxResults);
}
