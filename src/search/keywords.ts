// Common English stopwords to filter out
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
  'there', 'if', 'then', 'else', 'any', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'once', 'up', 'down', 'out', 'off', 'over',
]);

// Minimum keyword length
const MIN_KEYWORD_LENGTH = 2;

// Maximum keywords to extract
const MAX_KEYWORDS = 50;

export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Convert to lowercase and split on non-word characters
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word =>
      word.length >= MIN_KEYWORD_LENGTH &&
      !STOPWORDS.has(word) &&
      !/^\d+$/.test(word) // Filter pure numbers
    );

  // Count occurrences
  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  // Sort by frequency and take top keywords
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS)
    .map(([word]) => word);

  return sorted;
}

export function normalizeQuery(query: string): string[] {
  return extractKeywords(query);
}

/**
 * Extract high-value topics from a user prompt.
 * More aggressive than extractKeywords - captures quoted terms,
 * file paths, technical terms, and code references.
 */
export function extractTopics(prompt: string): string[] {
  const topics: string[] = [];

  // Quoted terms (user explicitly highlighting something)
  const quoted = prompt.match(/"([^"]+)"/g) || [];
  topics.push(...quoted.map(q => q.replace(/"/g, '')));

  // Single-quoted terms
  const singleQuoted = prompt.match(/'([^']+)'/g) || [];
  topics.push(...singleQuoted.map(q => q.replace(/'/g, '')));

  // File paths mentioned
  const paths = prompt.match(/[\w\-./]+\.(md|yaml|yml|ts|tsx|js|jsx|py|go|rs|json|txt)/gi) || [];
  topics.push(...paths);

  // Code references in backticks
  const code = prompt.match(/`([^`]+)`/g) || [];
  topics.push(...code.map(c => c.replace(/`/g, '')));

  // Technical terms: PascalCase or camelCase
  const camelCase = prompt.match(/[a-z]+[A-Z][a-zA-Z]*/g) || [];
  topics.push(...camelCase);

  const pascalCase = prompt.match(/[A-Z][a-z]+(?:[A-Z][a-z]+)+/g) || [];
  topics.push(...pascalCase);

  // ALL_CAPS terms (constants, acronyms)
  const allCaps = prompt.match(/\b[A-Z]{2,}\b/g) || [];
  topics.push(...allCaps);

  // Also include regular keywords for broader matching
  const keywords = extractKeywords(prompt);
  topics.push(...keywords);

  // Dedupe and filter empty
  return [...new Set(topics)].filter(t => t.length > 1);
}
