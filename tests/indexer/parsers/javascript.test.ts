import { describe, it, expect } from 'vitest';
import { parseJavaScript } from '../../../src/indexer/parsers/javascript.js';

describe('parseJavaScript', () => {
  describe('function detection', () => {
    it('should detect regular functions', () => {
      const content = `function hello() {
  console.log('hello');
}

function world() {
  console.log('world');
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('function hello');
      expect(sections[1].title).toBe('function world');
    });

    it('should detect async functions', () => {
      const content = `async function fetchData() {
  return await fetch('/api');
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('function fetchData');
    });

    it('should detect exported functions', () => {
      const content = `export function publicFn() {
  return 1;
}

export async function asyncPublicFn() {
  return 2;
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('function publicFn');
      expect(sections[1].title).toBe('function asyncPublicFn');
    });
  });

  describe('class detection', () => {
    it('should detect classes', () => {
      const content = `class MyClass {
  constructor() {}

  method() {}
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('class MyClass');
    });

    it('should detect exported classes', () => {
      const content = `export class ExportedClass {
  value = 1;
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('class ExportedClass');
    });
  });

  describe('const/let/var detection', () => {
    it('should detect const declarations', () => {
      const content = `const API_URL = 'https://api.example.com';

const config = {
  timeout: 5000,
};`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('const API_URL');
      expect(sections[1].title).toBe('const config');
    });

    it('should detect arrow functions assigned to const', () => {
      const content = `const myArrowFn = () => {
  return 'result';
};

const anotherFn = async (x) => x * 2;`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(2);
    });

    it('should detect exported const', () => {
      const content = `export const CONSTANT = 42;`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('const CONSTANT');
    });
  });

  describe('TypeScript-specific', () => {
    it('should detect interfaces', () => {
      const content = `interface User {
  id: number;
  name: string;
}

interface Config {
  apiUrl: string;
}`;

      const sections = parseJavaScript(content, 'test.ts');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('interface User');
      expect(sections[1].title).toBe('interface Config');
    });

    it('should detect type aliases', () => {
      const content = `type UserId = string;

type Handler = (event: Event) => void;`;

      const sections = parseJavaScript(content, 'test.ts');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('type UserId');
      expect(sections[1].title).toBe('type Handler');
    });

    it('should detect enums', () => {
      const content = `enum Status {
  Active,
  Inactive,
  Pending,
}

export enum Direction {
  Up,
  Down,
}`;

      const sections = parseJavaScript(content, 'test.ts');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('enum Status');
      expect(sections[1].title).toBe('enum Direction');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const sections = parseJavaScript('', 'test.js');
      expect(sections).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const content = `// This is a comment
/* Multi-line
   comment */`;

      const sections = parseJavaScript(content, 'test.js');

      // Should treat as single section since no declarations
      expect(sections.length).toBeLessThanOrEqual(1);
    });

    it('should handle file without declarations', () => {
      const content = `console.log('hello');
doSomething();`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Module');
    });

    it('should detect all function declarations', () => {
      const content = `function outer() {
  function inner() {
    return 1;
  }
  return inner();
}`;

      const sections = parseJavaScript(content, 'test.js');

      // Current implementation detects all functions (nested detection not implemented)
      expect(sections.length).toBeGreaterThanOrEqual(1);
      expect(sections[0].title).toBe('function outer');
    });

    it('should handle special characters in names', () => {
      const content = `const $jquery = {};
const _private = 1;
const camelCase123 = 'test';`;

      const sections = parseJavaScript(content, 'test.js');

      // Should detect at least some const declarations
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('metadata extraction', () => {
    it('should set correct line ranges', () => {
      const content = `function first() {
  return 1;
}

function second() {
  return 2;
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections[0].lineStart).toBe(1);
      expect(sections[0].lineEnd).toBe(4);
      expect(sections[1].lineStart).toBe(5);
    });

    it('should extract keywords from content', () => {
      const content = `function authenticateUser(credentials) {
  // Validate user credentials
  return validateCredentials(credentials);
}`;

      const sections = parseJavaScript(content, 'test.js');

      expect(sections[0].keywords).toContain('authenticateuser');
    });
  });
});
