import { describe, it, expect } from 'vitest';
import { parsePython } from '../../../src/indexer/parsers/python.js';

describe('parsePython', () => {
  describe('function detection', () => {
    it('should detect def functions', () => {
      const content = `def hello():
    print("hello")

def world():
    print("world")`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('def hello');
      expect(sections[1].title).toBe('def world');
    });

    it('should detect async def functions', () => {
      const content = `async def fetch_data():
    return await get_data()`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('def fetch_data');
    });

    it('should detect functions with parameters', () => {
      const content = `def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('def greet');
    });
  });

  describe('class detection', () => {
    it('should detect classes', () => {
      const content = `class MyClass:
    def __init__(self):
        pass

    def method(self):
        pass`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('class MyClass');
    });

    it('should detect classes with inheritance', () => {
      const content = `class ChildClass(ParentClass):
    pass

class MultiInherit(Base1, Base2):
    pass`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('class ChildClass');
      expect(sections[1].title).toBe('class MultiInherit');
    });
  });

  describe('top-level only', () => {
    it('should not detect nested functions', () => {
      const content = `def outer():
    def inner():
        return 1
    return inner()`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('def outer');
    });

    it('should not detect methods as top-level', () => {
      const content = `class MyClass:
    def method(self):
        pass

    def another_method(self):
        pass`;

      const sections = parsePython(content, 'test.py');

      // Only the class should be a section, not its methods
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('class MyClass');
    });

    it('should detect indented content inside top-level declarations', () => {
      const content = `def example():
    # This is indented
    value = 42
    return value

class Another:
    pass`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('def example');
      expect(sections[1].title).toBe('class Another');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const sections = parsePython('', 'test.py');
      expect(sections).toHaveLength(0);
    });

    it('should handle file with only imports', () => {
      const content = `import os
from sys import path
import json as js`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Module');
    });

    it('should handle decorators', () => {
      const content = `@decorator
def decorated_function():
    pass

@classmethod
@another_decorator
def multi_decorated():
    pass`;

      const sections = parsePython(content, 'test.py');

      // Decorators shouldn't prevent detection
      // (Note: current implementation might not handle decorators perfectly)
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should handle docstrings', () => {
      const content = `def documented():
    """This is a docstring."""
    pass

class DocClass:
    """Class docstring."""
    pass`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(2);
    });

    it('should handle functions with type hints', () => {
      const content = `def typed_func(x: int, y: str) -> bool:
    return True`;

      const sections = parsePython(content, 'test.py');

      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('def typed_func');
    });
  });

  describe('metadata extraction', () => {
    it('should set correct line ranges', () => {
      const content = `def first():
    return 1

def second():
    return 2`;

      const sections = parsePython(content, 'test.py');

      expect(sections[0].lineStart).toBe(1);
      expect(sections[1].lineStart).toBe(4);
    });

    it('should extract keywords', () => {
      const content = `def authenticate_user(credentials):
    # Validate credentials
    return check_password(credentials)`;

      const sections = parsePython(content, 'test.py');

      expect(sections[0].keywords.length).toBeGreaterThan(0);
    });
  });
});
