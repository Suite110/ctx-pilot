# Changelog

All notable changes to ctx-pilot will be documented in this file.

## [0.11.0] - 2026-01-04

### Enterprise Edition

Full enterprise feature set making $149/year a no-brainer for teams. All features run 100% locally with no external API calls.

### Added

#### Index Quality Report
- **`npx ctx-pilot audit`** - Score your index quality (0-100)
  - Coverage stats: files indexed, sections with keywords, avg keywords/section
  - Identifies weak sections with < 3 keywords
  - Detects missing files that match include patterns
  - Recommends files to pin and sections to enhance
  - Actionable improvement suggestions

#### Team Index Sync
- **`npx ctx-pilot sync`** - Pull team's index from git
  - Fetches from origin and compares timestamps
  - Creates backup before overwriting local
  - Conflict detection with --force option
- **`npx ctx-pilot publish`** - Push index to team
  - Commits and pushes to configured branch
  - Custom commit message with -m flag
- Team config in `.context/config.json`:
  ```json
  { "team": { "remote": "git", "branch": "main" } }
  ```

#### Usage Analytics
- **`npx ctx-pilot stats`** - View usage statistics (last 30 days)
  - Total suggestions and unique files
  - Most valuable files (suggested most often)
  - Top search topics
  - Queries with no results (missing coverage)
- Opt-in via config: `"analytics": { "enabled": true }`
- All data stored locally in `.context/analytics.json`
- Easy to clear: `npx ctx-pilot stats --clear`

#### Audit Log (Compliance)
- **`npx ctx-pilot audit-log`** - View suggestion history
  - JSONL format for SIEM integration
  - Prompt hashes (not content) for privacy
  - Configurable retention period
- Export: `npx ctx-pilot audit-log --export`
- Opt-in via config: `"auditLog": { "enabled": true, "retention": "30d" }`

#### Related Files
- Suggest files that should be read together
- Import/require relationship analysis (JS, TS, Python, Go)
- Shows "imported by above" in suggestions
- Opt-in via config: `"suggestions": { "includeRelated": true, "maxRelated": 2 }`

#### Semantic Search
- **`npx ctx-pilot embed`** - Add embeddings to existing index
  - Uses all-MiniLM-L6-v2 via @xenova/transformers
  - 384-dimension embeddings stored in index
  - ~50MB model download on first use
- Hybrid search: combines semantic + keyword scores
- Opt-in via config: `"search": { "enabled": true }`
- Optional dependency: `npm install @xenova/transformers`

#### Multi-Repo Support
- **`npx ctx-pilot link <path>`** - Link external repository
- **`npx ctx-pilot unlink <name>`** - Unlink repository
- **`npx ctx-pilot links`** - List linked repositories
- Cross-repo search with prefixed file paths: `[shared-lib] src/utils.ts`
- Config: `"linkedRepos": [{ "name": "shared-lib", "path": "../shared-lib" }]`

### Changed

- **Refactored CLI** - 90% code reduction in cli.ts (893 → 92 lines)
  - Commands split into `src/commands/*.ts` modules
  - Cleaner architecture for future extensions
- **Expanded config schema** - New enterprise config sections

### Architecture

New modules added:
- `src/commands/` - Modular command handlers
- `src/audit/` - Index quality scoring
- `src/sync/` - Git-based team sync
- `src/audit-log/` - Compliance logging
- `src/analytics/` - Usage statistics
- `src/relations/` - Import-based file relationships
- `src/search/semantic.ts` - Optional embedding search
- `src/multi-repo/` - Cross-repository support

---

## [0.10.0] - 2026-01-04

### Enterprise-Ready with Developer Tools

New debugging tools, configurable thresholds, incremental builds, and enterprise positioning.

### Added

- **`npx ctx-pilot search <query>`** - Test what matches a query
  - Shows extracted topics, matching sections, and scores
  - Indicates which results pass the threshold
- **`npx ctx-pilot watch`** - Auto-rebuild index on file changes
  - Debounced rebuilds (500ms)
  - Uses incremental updates for speed
- **Configurable thresholds** - Tune smart skip behavior in config
  - `minTopics` - Minimum topics to trigger suggestions (default: 2)
  - `minScore` - Minimum relevance score threshold (default: 1.0)
- **Negative patterns** - `excludeFromSuggestions` config option
  - Index files for completeness, but never suggest them
- **Incremental index updates** - Only re-index changed files
  - Tracks file mtimes
  - Use `--force` to bypass cache
- **Enhanced status output** - More index statistics
  - Total and unique keyword counts
  - Average sections per file
  - Empty file count
- **PRICING.md** - Clear commercial licensing information

### Changed

- **Enterprise positioning** - README updated for larger teams
- **Tagline** - "AI that knows your codebase"

---

## [0.9.1] - 2026-01-04

### AI-Driven Indexing with Smart Search

Your AI builds the index. Enhanced search finds what you mean, not just what you type.

### Added

- **`npx ctx-pilot auto-index`** - Fallback for instant setup without AI
  - 20+ language parsers: JS/TS, Python, Go, Rust, Java, C#, Ruby, Swift, PHP, Shell, and more
  - Markdown header and code block extraction
  - Structured data parsing (YAML, JSON, TOML)
- **`npx ctx-pilot validate`** - Check index for issues
  - Validates pinned files exist
  - Checks for valid line numbers
  - Warns on empty keywords and orphaned entries
- **Porter stemmer** - "authentication" matches "authenticate", "auth"
- **Fuzzy matching** - Typos like "authentification" still find matches
- **Stale file detection** - Files modified since indexing are marked with ⚠️
- **Auto-rebuild prompt** - When stale files detected, instructs AI to update the index
- **Smart skip** - Stays silent when there's nothing useful to suggest
  - Skips if fewer than 2 topics extracted (unless pinned files exist)
  - Skips if no results score above threshold (unless pinned files exist)
  - Only shows results that meet the relevance threshold

### Changed

- **`init` creates `.context/optimize.md`** - A prompt file for AI to build the index
- **Workflow**: `npx ctx-pilot init` → restart AI → "Follow the instructions in .context/optimize.md"
- **Improved search scoring** - Stem matches get 90% weight, fuzzy matches 50%

### How It Works

AI-driven indexing is the recommended approach - your AI understands code semantically and produces richer indexes with meaningful titles, descriptive previews, and synonym-rich keywords.

The `auto-index` command is a fallback for users who want instant setup. It uses regex-based parsers that work immediately but produce more generic results.

## [0.9.0] - 2025-01-02

### Initial Public Release

ctx-pilot is an intelligent context management tool for AI coding assistants. It solves the problem of AI losing context during long coding sessions by automatically suggesting relevant files before every prompt.

### Features

#### Dynamic Hooks (per-prompt suggestions)
- **Claude Code** support via `UserPromptSubmit` hook
- **Gemini CLI** support via `BeforeAgent` hook
- Auto-detection of environment (Claude vs Gemini)
- Topic extraction from prompts (quoted terms, file paths, code references, camelCase identifiers)

#### Static Exports (generated context files)
- **Cursor** - `.cursorrules` and `.cursor/rules/*.mdc`
- **Windsurf** - `.windsurfrules` (respects 6K character limit)
- **Aider** - `.aider.context.md` (for use with `--read` flag)

#### Indexing
- Section-aware index format stored in `.context/index.json`
- Configurable include/exclude patterns
- Pinned files (always suggested)

### CLI Commands

```bash
npx ctx-pilot init              # Setup config, hook, and optimization prompt
npx ctx-pilot status            # Show current state
npx ctx-pilot hook              # Install hook (auto-detects)
npx ctx-pilot export --cursor   # Generate .cursorrules
npx ctx-pilot export --windsurf # Generate .windsurfrules
npx ctx-pilot export --aider    # Generate .aider.context.md
```

### Links

- [Documentation](https://github.com/Suite110/ctx-pilot#readme)
- [Issues](https://github.com/Suite110/ctx-pilot/issues)
- [npm](https://www.npmjs.com/package/ctx-pilot)
