import { describe, it, expect } from 'vitest';
import { extractKeywords, normalizeQuery } from '../../src/search/keywords.js';

describe('extractKeywords', () => {
  describe('basic extraction', () => {
    it('should extract words from text', () => {
      const keywords = extractKeywords('hello world');
      expect(keywords).toContain('hello');
      expect(keywords).toContain('world');
    });

    it('should lowercase all keywords', () => {
      const keywords = extractKeywords('Hello WORLD');
      expect(keywords).toContain('hello');
      expect(keywords).toContain('world');
      expect(keywords).not.toContain('Hello');
      expect(keywords).not.toContain('WORLD');
    });

    it('should split on punctuation', () => {
      const keywords = extractKeywords('user.auth, data-processing');
      expect(keywords).toContain('user');
      expect(keywords).toContain('auth');
      expect(keywords).toContain('data');
      expect(keywords).toContain('processing');
    });
  });

  describe('stopword filtering', () => {
    it('should filter common stopwords', () => {
      const keywords = extractKeywords('the quick brown fox');
      expect(keywords).not.toContain('the');
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
      expect(keywords).toContain('fox');
    });

    it('should filter articles', () => {
      const keywords = extractKeywords('a dog and an elephant');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('an');
      expect(keywords).not.toContain('and');
      expect(keywords).toContain('dog');
      expect(keywords).toContain('elephant');
    });

    it('should filter pronouns', () => {
      const keywords = extractKeywords('I think you we going');
      expect(keywords).not.toContain('i');
      expect(keywords).not.toContain('you');
      expect(keywords).not.toContain('we');
      expect(keywords).toContain('think');
      expect(keywords).toContain('going');
    });

    it('should filter prepositions', () => {
      const keywords = extractKeywords('in the box on the table');
      expect(keywords).not.toContain('in');
      expect(keywords).not.toContain('on');
      expect(keywords).toContain('box');
      expect(keywords).toContain('table');
    });
  });

  describe('length filtering', () => {
    it('should filter single-character words', () => {
      const keywords = extractKeywords('a b c test');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('b');
      expect(keywords).not.toContain('c');
      expect(keywords).toContain('test');
    });

    it('should keep two-character words', () => {
      const keywords = extractKeywords('go do js py');
      expect(keywords).toContain('go');
      expect(keywords).toContain('js');
      expect(keywords).toContain('py');
    });
  });

  describe('number filtering', () => {
    it('should filter pure numbers', () => {
      const keywords = extractKeywords('version 123 released 2024');
      expect(keywords).not.toContain('123');
      expect(keywords).not.toContain('2024');
      expect(keywords).toContain('version');
      expect(keywords).toContain('released');
    });

    it('should keep alphanumeric words', () => {
      const keywords = extractKeywords('v2 es6 python3');
      expect(keywords).toContain('v2');
      expect(keywords).toContain('es6');
      expect(keywords).toContain('python3');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const keywords = extractKeywords('');
      expect(keywords).toEqual([]);
    });

    it('should handle whitespace only', () => {
      const keywords = extractKeywords('   \n\t  ');
      expect(keywords).toEqual([]);
    });

    it('should handle only stopwords', () => {
      const keywords = extractKeywords('the a an is are');
      expect(keywords).toEqual([]);
    });

    it('should deduplicate keywords', () => {
      const keywords = extractKeywords('test test test unique');
      const testCount = keywords.filter(k => k === 'test').length;
      expect(testCount).toBe(1);
    });

    it('should handle special characters', () => {
      const keywords = extractKeywords('hello@world.com test#tag');
      expect(keywords).toContain('hello');
      expect(keywords).toContain('world');
      expect(keywords).toContain('com');
      expect(keywords).toContain('test');
      expect(keywords).toContain('tag');
    });

    it('should limit number of keywords', () => {
      // Generate a lot of unique words
      const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
      const keywords = extractKeywords(words);
      expect(keywords.length).toBeLessThanOrEqual(50);
    });
  });

  describe('frequency ordering', () => {
    it('should order by frequency (most common first)', () => {
      const keywords = extractKeywords('apple banana apple cherry apple banana');
      expect(keywords[0]).toBe('apple');
      expect(keywords[1]).toBe('banana');
      expect(keywords[2]).toBe('cherry');
    });
  });
});

describe('normalizeQuery', () => {
  it('should extract keywords from query', () => {
    const keywords = normalizeQuery('authentication flow');
    expect(keywords).toContain('authentication');
    expect(keywords).toContain('flow');
  });

  it('should handle complex queries', () => {
    const keywords = normalizeQuery('how does the user login work?');
    expect(keywords).toContain('user');
    expect(keywords).toContain('login');
    expect(keywords).toContain('work');
    expect(keywords).not.toContain('how');
    expect(keywords).not.toContain('does');
    expect(keywords).not.toContain('the');
  });
});
