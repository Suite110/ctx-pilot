import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { ConfigSchema } from './schema.js';
import type { CtxPilotConfig } from '../types.js';

const CONFIG_DIR = '.context';
const CONFIG_FILE = 'config.json';

export function getConfigPath(projectRoot: string): string {
  return join(projectRoot, CONFIG_DIR, CONFIG_FILE);
}

export function getContextDir(projectRoot: string): string {
  return join(projectRoot, CONFIG_DIR);
}

export async function configExists(projectRoot: string): Promise<boolean> {
  try {
    await access(getConfigPath(projectRoot));
    return true;
  } catch {
    return false;
  }
}

export async function loadConfig(projectRoot: string): Promise<CtxPilotConfig> {
  const configPath = getConfigPath(projectRoot);

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return validateConfig(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Not configured. Run \`npx ctx-pilot init\` or create ${CONFIG_DIR}/${CONFIG_FILE}`
      );
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        `Config error: Invalid JSON in ${CONFIG_DIR}/${CONFIG_FILE}`
      );
    }
    throw error;
  }
}

export function validateConfig(config: unknown): CtxPilotConfig {
  const result = ConfigSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    throw new Error(`Config error: ${issues}. Check ${CONFIG_DIR}/${CONFIG_FILE} syntax`);
  }

  return result.data;
}

export async function saveConfig(
  projectRoot: string,
  config: CtxPilotConfig
): Promise<void> {
  const contextDir = getContextDir(projectRoot);
  const configPath = getConfigPath(projectRoot);

  // Ensure .context directory exists
  await mkdir(contextDir, { recursive: true });

  // Validate before saving
  const validated = validateConfig(config);

  // Write config with pretty formatting
  await writeFile(
    configPath,
    JSON.stringify(validated, null, 2) + '\n',
    'utf-8'
  );
}

export function getDefaultConfig(): CtxPilotConfig {
  return {
    pinned: [],
    include: ['**/*.md'],
    exclude: [],
    tokenBudget: 32000,
    maxContextPercentage: 50,
  };
}
