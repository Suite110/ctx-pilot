// Porter Stemmer implementation
// Based on the algorithm by Martin Porter (1980)
// Simplified for keyword matching - handles common English word forms

const STEP_2_SUFFIXES: Record<string, string> = {
  ational: 'ate',
  tional: 'tion',
  enci: 'ence',
  anci: 'ance',
  izer: 'ize',
  abli: 'able',
  alli: 'al',
  entli: 'ent',
  eli: 'e',
  ousli: 'ous',
  ization: 'ize',
  ation: 'ate',
  ator: 'ate',
  alism: 'al',
  iveness: 'ive',
  fulness: 'ful',
  ousness: 'ous',
  aliti: 'al',
  iviti: 'ive',
  biliti: 'ble',
};

const STEP_3_SUFFIXES: Record<string, string> = {
  icate: 'ic',
  ative: '',
  alize: 'al',
  iciti: 'ic',
  ical: 'ic',
  ful: '',
  ness: '',
};

const STEP_4_SUFFIXES = [
  'al',
  'ance',
  'ence',
  'er',
  'ic',
  'able',
  'ible',
  'ant',
  'ement',
  'ment',
  'ent',
  'ion',
  'ou',
  'ism',
  'ate',
  'iti',
  'ous',
  'ive',
  'ize',
];

// Check if character is a consonant
function isConsonant(word: string, i: number): boolean {
  const c = word[i];
  if ('aeiou'.includes(c)) return false;
  if (c === 'y') return i === 0 || !isConsonant(word, i - 1);
  return true;
}

// Count consonant sequences (measure)
function measure(word: string): number {
  let count = 0;
  let i = 0;
  const len = word.length;

  // Skip initial consonants
  while (i < len && isConsonant(word, i)) i++;

  while (i < len) {
    // Skip vowels
    while (i < len && !isConsonant(word, i)) i++;
    if (i >= len) break;

    count++;

    // Skip consonants
    while (i < len && isConsonant(word, i)) i++;
  }

  return count;
}

// Check if word contains a vowel
function hasVowel(word: string): boolean {
  for (let i = 0; i < word.length; i++) {
    if (!isConsonant(word, i)) return true;
  }
  return false;
}

// Check if word ends with double consonant
function endsWithDouble(word: string): boolean {
  if (word.length < 2) return false;
  const last = word[word.length - 1];
  const prev = word[word.length - 2];
  return last === prev && isConsonant(word, word.length - 1);
}

// Check for CVC pattern at end (consonant-vowel-consonant, not w/x/y)
function endsCVC(word: string): boolean {
  if (word.length < 3) return false;
  const len = word.length;
  if (
    isConsonant(word, len - 1) &&
    !isConsonant(word, len - 2) &&
    isConsonant(word, len - 3) &&
    !'wxy'.includes(word[len - 1])
  ) {
    return true;
  }
  return false;
}

function stem(word: string): string {
  if (word.length < 3) return word;

  let w = word.toLowerCase();

  // Step 1a: plurals
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (!w.endsWith('ss') && w.endsWith('s')) w = w.slice(0, -1);

  // Step 1b: -ed, -ing
  if (w.endsWith('eed')) {
    if (measure(w.slice(0, -3)) > 0) w = w.slice(0, -1);
  } else if (w.endsWith('ed') && hasVowel(w.slice(0, -2))) {
    w = w.slice(0, -2);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
      w += 'e';
    } else if (endsWithDouble(w) && !'lsz'.includes(w[w.length - 1])) {
      w = w.slice(0, -1);
    } else if (measure(w) === 1 && endsCVC(w)) {
      w += 'e';
    }
  } else if (w.endsWith('ing') && hasVowel(w.slice(0, -3))) {
    w = w.slice(0, -3);
    if (w.endsWith('at') || w.endsWith('bl') || w.endsWith('iz')) {
      w += 'e';
    } else if (endsWithDouble(w) && !'lsz'.includes(w[w.length - 1])) {
      w = w.slice(0, -1);
    } else if (measure(w) === 1 && endsCVC(w)) {
      w += 'e';
    }
  }

  // Step 1c: y -> i
  if (w.endsWith('y') && hasVowel(w.slice(0, -1))) {
    w = w.slice(0, -1) + 'i';
  }

  // Step 2: map double suffixes
  for (const [suffix, replacement] of Object.entries(STEP_2_SUFFIXES)) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (measure(stem) > 0) {
        w = stem + replacement;
      }
      break;
    }
  }

  // Step 3: handle -ful, -ness, etc.
  for (const [suffix, replacement] of Object.entries(STEP_3_SUFFIXES)) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (measure(stem) > 0) {
        w = stem + replacement;
      }
      break;
    }
  }

  // Step 4: remove suffixes
  for (const suffix of STEP_4_SUFFIXES) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (suffix === 'ion') {
        if (measure(stem) > 1 && (stem.endsWith('s') || stem.endsWith('t'))) {
          w = stem;
        }
      } else if (measure(stem) > 1) {
        w = stem;
      }
      break;
    }
  }

  // Step 5a: remove final -e
  if (w.endsWith('e')) {
    const stem = w.slice(0, -1);
    if (measure(stem) > 1 || (measure(stem) === 1 && !endsCVC(stem))) {
      w = stem;
    }
  }

  // Step 5b: remove double l
  if (w.endsWith('ll') && measure(w) > 1) {
    w = w.slice(0, -1);
  }

  return w;
}

// Cache for performance
const stemCache = new Map<string, string>();

export function stemWord(word: string): string {
  const lower = word.toLowerCase();
  if (stemCache.has(lower)) {
    return stemCache.get(lower)!;
  }
  const stemmed = stem(lower);
  stemCache.set(lower, stemmed);
  return stemmed;
}

// Stem multiple words
export function stemWords(words: string[]): string[] {
  return words.map(stemWord);
}

// Clear cache (useful for testing)
export function clearStemCache(): void {
  stemCache.clear();
}
