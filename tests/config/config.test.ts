import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadConfig,
  saveConfig,
  validateConfig,
  configExists,
  getDefaultConfig,
} from '../../src/config/index.js';

describe('config module', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `ctx-pilot-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('configExists', () => {
    it('should return false when config does not exist', async () => {
      const exists = await configExists(testDir);
      expect(exists).toBe(false);
    });

    it('should return true when config exists', async () => {
      const contextDir = join(testDir, '.context');
      await mkdir(contextDir, { recursive: true });
      await writeFile(join(contextDir, 'config.json'), '{}');

      const exists = await configExists(testDir);
      expect(exists).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return valid default config', () => {
      const config = getDefaultConfig();

      expect(config.pinned).toEqual([]);
      expect(config.include).toEqual(['**/*.md']);
      expect(config.exclude).toEqual([]);
      expect(config.tokenBudget).toBe(32000);
      expect(config.maxContextPercentage).toBe(50);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config = {
        pinned: ['file1.md', 'file2.md'],
        include: ['**/*.md', '**/*.ts'],
        exclude: ['node_modules/**'],
        tokenBudget: 16000,
        maxContextPercentage: 75,
      };

      const validated = validateConfig(config);

      expect(validated).toEqual(config);
    });

    it('should apply defaults for missing fields', () => {
      const validated = validateConfig({});

      expect(validated.pinned).toEqual([]);
      expect(validated.include).toEqual(['**/*.md']);
      expect(validated.tokenBudget).toBe(32000);
    });

    it('should reject invalid tokenBudget', () => {
      expect(() => validateConfig({ tokenBudget: -100 })).toThrow();
      expect(() => validateConfig({ tokenBudget: 500000 })).toThrow();
    });

    it('should reject invalid maxContextPercentage', () => {
      expect(() => validateConfig({ maxContextPercentage: 0 })).toThrow();
      expect(() => validateConfig({ maxContextPercentage: 101 })).toThrow();
    });

    it('should reject non-array pinned', () => {
      expect(() => validateConfig({ pinned: 'file.md' })).toThrow();
    });

    it('should reject non-array include', () => {
      expect(() => validateConfig({ include: '**/*.md' })).toThrow();
    });
  });

  describe('saveConfig', () => {
    it('should create config file', async () => {
      const config = getDefaultConfig();
      await saveConfig(testDir, config);

      const exists = await configExists(testDir);
      expect(exists).toBe(true);
    });

    it('should create .context directory if missing', async () => {
      const config = getDefaultConfig();
      await saveConfig(testDir, config);

      const exists = await configExists(testDir);
      expect(exists).toBe(true);
    });

    it('should save with correct format', async () => {
      const config = {
        pinned: ['test.md'],
        include: ['**/*.md'],
        exclude: [],
        tokenBudget: 16000,
        maxContextPercentage: 60,
      };

      await saveConfig(testDir, config);
      const loaded = await loadConfig(testDir);

      expect(loaded).toEqual(config);
    });
  });

  describe('loadConfig', () => {
    it('should throw when config does not exist', async () => {
      await expect(loadConfig(testDir)).rejects.toThrow('Not configured');
    });

    it('should load valid config', async () => {
      const config = {
        pinned: ['docs/guide.md'],
        include: ['**/*.md', '**/*.txt'],
        exclude: ['archive/**'],
        tokenBudget: 20000,
        maxContextPercentage: 40,
      };

      await saveConfig(testDir, config);
      const loaded = await loadConfig(testDir);

      expect(loaded).toEqual(config);
    });

    it('should throw on invalid JSON', async () => {
      const contextDir = join(testDir, '.context');
      await mkdir(contextDir, { recursive: true });
      await writeFile(join(contextDir, 'config.json'), 'not valid json');

      await expect(loadConfig(testDir)).rejects.toThrow('Invalid JSON');
    });

    it('should apply defaults to partial config', async () => {
      const contextDir = join(testDir, '.context');
      await mkdir(contextDir, { recursive: true });
      await writeFile(
        join(contextDir, 'config.json'),
        JSON.stringify({ pinned: ['file.md'] })
      );

      const loaded = await loadConfig(testDir);

      expect(loaded.pinned).toEqual(['file.md']);
      expect(loaded.include).toEqual(['**/*.md']);
      expect(loaded.tokenBudget).toBe(32000);
    });
  });

  describe('security considerations', () => {
    it('should handle path traversal in pinned files safely', async () => {
      // This tests that config accepts the path as-is
      // Actual path traversal protection should happen at file access time
      const config = {
        pinned: ['../../../etc/passwd'],
        include: ['**/*.md'],
        exclude: [],
        tokenBudget: 32000,
        maxContextPercentage: 50,
      };

      // Should save without error (validation is at access time)
      await saveConfig(testDir, config);
      const loaded = await loadConfig(testDir);

      expect(loaded.pinned).toContain('../../../etc/passwd');
    });
  });
});
