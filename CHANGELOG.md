# Changelog

All notable changes to ctx-pilot will be documented in this file.

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
