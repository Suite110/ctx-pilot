// Command types and shared utilities

export interface CommandContext {
  projectRoot: string;
  args: string[];
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;

// Environment types for hook installation
export type Environment = 'claude' | 'gemini' | 'unknown';

export interface EnvironmentConfig {
  name: string;
  settingsDir: string;
  settingsFile: string;
  hookEvent: string;
  restartMessage: string;
}

export const ENVIRONMENTS: Record<Exclude<Environment, 'unknown'>, EnvironmentConfig> = {
  claude: {
    name: 'Claude Code',
    settingsDir: '.claude',
    settingsFile: 'settings.json',
    hookEvent: 'UserPromptSubmit',
    restartMessage: 'Restart Claude Code to activate the hook.',
  },
  gemini: {
    name: 'Gemini CLI',
    settingsDir: '.gemini',
    settingsFile: 'settings.json',
    hookEvent: 'BeforeAgent',
    restartMessage: 'Restart Gemini CLI to activate the hook.',
  },
};

// Export target types
export type ExportTarget = 'cursor' | 'windsurf' | 'aider' | 'mdc';
