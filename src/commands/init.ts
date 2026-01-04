// npx ctx-pilot init

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { configExists, saveConfig, getDefaultConfig } from '../config/index.js';
import type { CommandContext, Environment } from './types.js';
import { ENVIRONMENTS } from './types.js';
import { detectEnvironment, parseEnvFlag } from './utils.js';
import { installHook } from './hook.js';

const OPTIMIZE_PROMPT = `# Build ctx-pilot Index

Analyze this codebase and build an optimized index for ctx-pilot.

## Your Task

1. **Review the codebase structure** - identify source files, documentation, tests, and config files

2. **Update \`.context/config.json\`** with appropriate patterns:
   \`\`\`json
   {
     "pinned": ["<core docs that are always relevant>"],
     "include": ["<glob patterns for files to index>"],
     "exclude": ["node_modules/**", "dist/**", "<other build artifacts>"],
     "excludeFromSuggestions": ["tests/**"],
     "domainStopwords": ["<common project terms to ignore>"]
   }
   \`\`\`

   - \`excludeFromSuggestions\`: Files to index but never suggest (e.g., tests for completeness)
   - \`domainStopwords\`: Terms that appear everywhere and aren't useful for search

3. **Build \`.context/index.json\`** by analyzing included files:
   \`\`\`json
   {
     "version": "1.1.0",
     "lastUpdated": "<ISO timestamp>",
     "files": [{
       "path": "<relative path>",
       "sections": [{
         "title": "<descriptive title>",
         "lineStart": 1,
         "lineEnd": 50,
         "preview": "<what this section does, not just code>",
         "keywords": ["<synonyms and related terms>"]
       }]
     }]
   }
   \`\`\`

4. **Verify** your index:
   - \`npx ctx-pilot validate\` - Check for errors
   - \`npx ctx-pilot search "authentication"\` - Test what matches a query

## CRITICAL: Add Synonyms to Keywords

The search only finds exact keyword matches. Users might search "login" but your code calls it "authenticate". **You must add synonyms.**

For each section, ask: "What words might someone use to search for this?"

| If the code says... | Also add keywords... |
|---------------------|----------------------|
| authenticate, auth | login, signin, logon, credential, session |
| config, configuration | settings, options, preferences, setup |
| error, exception | failure, throw, catch, fault, problem |
| create | add, new, insert, make, build, generate |
| delete | remove, destroy, drop, erase, clear |
| update | edit, modify, change, patch, set |
| user | account, profile, member, identity, person |
| fetch, request | get, load, retrieve, query, call, api |
| save | store, persist, write, cache |
| validate | check, verify, ensure, assert, test |

## Good vs Bad Examples

**Good:**
\`\`\`json
{
  "title": "Authentication Middleware",
  "preview": "Validates JWT tokens and attaches user to request context",
  "keywords": ["auth", "authenticate", "login", "signin", "jwt", "token", "session", "credential", "verify"]
}
\`\`\`

**Bad:**
\`\`\`json
{
  "title": "function authenticateUser",
  "preview": "export async function authenticateUser(req, res, next) {",
  "keywords": ["authenticateuser"]
}
\`\`\`

The good example will match searches for "login", "auth", "session", "jwt", etc. The bad example only matches "authenticateuser".
`;

async function writeOptimizePrompt(projectRoot: string): Promise<void> {
  const promptPath = join(projectRoot, '.context', 'optimize.md');
  await writeFile(promptPath, OPTIMIZE_PROMPT, 'utf-8');
}

export async function runInit(ctx: CommandContext): Promise<void> {
  const { projectRoot, args } = ctx;
  const forceEnv = parseEnvFlag(args);
  const env = forceEnv || await detectEnvironment(projectRoot, ENVIRONMENTS);
  const envConfig = env !== 'unknown' ? ENVIRONMENTS[env] : null;

  if (await configExists(projectRoot)) {
    console.log('Already configured. See .context/config.json');
    return;
  }

  const config = getDefaultConfig();
  await saveConfig(projectRoot, config);
  await writeOptimizePrompt(projectRoot);

  console.log('Created .context/config.json');
  console.log('Created .context/optimize.md');

  if (envConfig) {
    console.log(`\nDetected ${envConfig.name}. Installing hook...`);
    await installHook({ projectRoot, args: forceEnv ? [`--${env}`] : [] });
    console.log(`\nSetup complete! ${envConfig.restartMessage}`);
  } else {
    console.log('\nCould not detect AI CLI environment.');
    console.log('Run `npx ctx-pilot hook --claude` or `npx ctx-pilot hook --gemini` to install.');
  }

  console.log('\nTo build the index, ask your AI to:');
  console.log('  "Follow the instructions in .context/optimize.md"');
}
