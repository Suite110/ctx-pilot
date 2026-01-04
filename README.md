# ctx-pilot

**Stop repeating yourself to AI.**

[![npm version](https://img.shields.io/npm/v/ctx-pilot.svg)](https://www.npmjs.com/package/ctx-pilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Works with **Claude Code**, **Gemini CLI**, **Cursor**, **Windsurf**, and **Aider**.

---

## The Problem

You're deep in a coding session with Claude Code. You've explained your project's architecture, the key concepts, the naming conventions. Then, 10 messages later:

```
You: "Update the Widget component"
Claude: "I don't see a Widget component. Can you show me where it's defined?"
You: "It's in core-concepts.md, like I showed you earlier..."
```

Sound familiar? Context gets lost. You repeat yourself. Momentum dies.

## The Solution

ctx-pilot suggests relevant files when you need them. Claude reads them and stays informed.

```
You: "Update the Widget component"

<ctx-pilot>
Look into these files for context:

**Pinned (always relevant):**
- docs/core-concepts.md

**Relevant to your task:**
- src/components/Widget.tsx (lines 12-45) - function Widget
- docs/components.md (lines 88-102) - Widget Props
</ctx-pilot>

Claude: "I'll update the Widget component. Based on the props defined in
        core-concepts.md, here's what I'll change..."
```

**Zero friction.** Install once, forget it exists. Context just works.

---

## Why ctx-pilot?

- **File suggestions, not content injection** - Claude reads files itself, keeping you in control
- **Section-aware indexing** - Points to specific functions and headers, not entire files
- **Smart search** - Stemming and fuzzy matching find what you mean, not just what you type
- **Smart skip** - Stays silent when there's nothing useful to add
- **Automatic indexing** - Built-in parsers for 20+ languages, no AI required
- **Works offline** - Everything runs locally, no API keys or accounts needed
- **Graceful degradation** - If something breaks, your AI tool works exactly as before

---

## Quick Start

```bash
npx ctx-pilot init
```

Restart your AI CLI, then ask:

```
Follow the instructions in .context/optimize.md
```

Your AI analyzes your codebase and builds an optimized index. Done - ctx-pilot now suggests relevant files before every prompt.

**Alternative (instant setup):** If you want to skip the AI step:
```bash
npx ctx-pilot auto-index
```

---

## How It Works

1. **You type a prompt** in Claude Code
2. **ctx-pilot extracts topics** from your message (function names, file paths, keywords)
3. **Searches your indexed files** for matching sections
4. **Suggests relevant files** with specific line ranges
5. **Claude reads them** and responds with full context

All invisible. All automatic. No commands to remember.

---

## Who It's For

- **Documentation-heavy projects** - Game design docs, API specs, internal wikis
- **Complex codebases** - Where context matters and getting up to speed takes time
- **Long coding sessions** - When you need Claude to remember what you discussed
- **Teams** - Share pinned files so Claude understands your conventions

---

## Installation

### Requirements

- Node.js 18+
- [Claude Code](https://claude.ai/code) or [Gemini CLI](https://github.com/google-gemini/gemini-cli)

### Setup

```bash
npx ctx-pilot init
```

Restart your AI CLI, then ask: `Follow the instructions in .context/optimize.md`

Your AI builds an optimized, section-aware index of your codebase.

### Manual Hook Install

If you need to install the hook separately:

```bash
npx ctx-pilot hook --claude   # For Claude Code
npx ctx-pilot hook --gemini   # For Gemini CLI
```

---

## Configuration

Edit `.context/config.json`:

```json
{
  "pinned": ["docs/core-concepts.md", "docs/glossary.md"],
  "include": ["**/*.md", "**/*.ts", "**/*.py"],
  "exclude": ["node_modules/**", "dist/**"]
}
```

| Field | What it does |
|-------|--------------|
| `pinned` | Files suggested on every prompt (your core docs) |
| `include` | What to index (glob patterns) |
| `exclude` | What to skip |

---

## Customizing for Your Project

The default config indexes markdown files only. Here's how to tailor ctx-pilot to your codebase.

### Step 1: Decide What to Index

Think about what files contain useful context:

- **Source code** - Functions, classes, components
- **Documentation** - READMEs, guides, API docs
- **Tests** - Show expected behavior and edge cases
- **Config files** - Project structure and settings

Update your `include` patterns:

```json
{
  "include": [
    "**/*.md",
    "src/**/*.ts",
    "tests/**/*.ts"
  ]
}
```

Common patterns:
- `**/*.md` - All markdown files
- `src/**/*.ts` - TypeScript in src folder
- `docs/**/*` - Everything in docs folder
- `*.json` - JSON files in root only

### Step 2: Exclude Noise

Keep generated files and dependencies out:

```json
{
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "*.min.js"
  ]
}
```

### Step 3: Pin Your Core Docs

Pinned files appear in every suggestion. Use sparingly - these are your "always relevant" files:

```json
{
  "pinned": [
    "CLAUDE.md",
    "docs/architecture.md"
  ]
}
```

Good candidates:
- Project overview docs
- Architecture decisions
- Coding conventions
- Glossaries

### Step 4: Build the Index

Ask your AI to build the index:

```
Follow the instructions in .context/optimize.md
```

Your AI analyzes your codebase and creates a section-aware index with:
- Meaningful section titles
- Rich keywords including synonyms
- Descriptive previews explaining what code does

**Alternative (quick baseline):** For instant setup without AI:

```bash
npx ctx-pilot auto-index
```

This uses built-in parsers to extract functions, classes, and headers. Works immediately but produces more generic results.

### Advanced: Domain Stopwords

If certain words appear everywhere in your project and aren't useful for search, filter them out:

```json
{
  "pinned": ["CLAUDE.md"],
  "include": ["**/*.md", "src/**/*.ts"],
  "exclude": ["node_modules/**"],
  "domainStopwords": ["myapp", "widget", "util"]
}
```

Use this when common project terms are drowning out more specific matches.

### Example: Full Config

Here's a complete config for a TypeScript project:

```json
{
  "pinned": ["CLAUDE.md", "docs/architecture.md"],
  "include": [
    "**/*.md",
    "src/**/*.ts",
    "tests/**/*.ts"
  ],
  "exclude": [
    "node_modules/**",
    "dist/**",
    "coverage/**"
  ],
  "domainStopwords": ["myproject"]
}
```

After saving, rebuild and verify:

```bash
npx ctx-pilot auto-index
npx ctx-pilot validate
npx ctx-pilot status
```

---

## CLI Commands

### Setup & Indexing

```bash
npx ctx-pilot init            # Set up config and install hook
npx ctx-pilot status          # Show config, index, hooks, and exports
npx ctx-pilot validate        # Check index for issues
npx ctx-pilot auto-index      # Build index automatically (fallback)
npx ctx-pilot auto-index -v   # Build with verbose output
```

The primary way to build the index is asking your AI: `Follow the instructions in .context/optimize.md`

### Dynamic Hooks (Claude Code, Gemini CLI)

Per-prompt context suggestions - runs automatically before every message.

```bash
npx ctx-pilot hook            # Install hook (auto-detects Claude/Gemini)
npx ctx-pilot hook --claude   # Install for Claude Code
npx ctx-pilot hook --gemini   # Install for Gemini CLI
```

### Static Exports (Cursor, Windsurf, Aider)

Generate context files for tools without hook support.

```bash
npx ctx-pilot export --cursor     # Generate .cursorrules
npx ctx-pilot export --windsurf   # Generate .windsurfrules
npx ctx-pilot export --aider      # Generate .aider.context.md
npx ctx-pilot export --mdc        # Generate .cursor/rules/ctx-pilot.mdc
npx ctx-pilot export --all        # Generate all exports
```

---

## How Indexing Works

ctx-pilot uses **AI-driven indexing**. Your AI analyzes your codebase and builds a section-aware index:

### AI Indexing (Recommended)

```
Follow the instructions in .context/optimize.md
```

Your AI:
- Understands your code semantically, not just syntactically
- Creates meaningful section titles and previews
- Adds rich keywords including synonyms and related terms
- Identifies what actually matters in your codebase

This produces the best results because your AI understands context.

### Automatic Indexing (Fallback)

For instant setup without AI involvement:

```bash
npx ctx-pilot auto-index
```

Built-in parsers extract sections from 20+ file types:
- **Markdown** - Headers and code blocks
- **JavaScript/TypeScript** - Functions, classes, interfaces, types
- **Python** - Functions and classes
- **Go, Rust, Java, C#, Ruby, Swift, PHP, Shell** - Functions and types
- **Structured data** - YAML, JSON, TOML sections

This works immediately but produces more generic results (function names as titles, extracted keywords rather than curated ones).

### Smart Search

ctx-pilot uses intelligent matching to find relevant sections:
- **Stemming** - "authentication" matches "authenticate", "auth"
- **Fuzzy matching** - Typos like "authentification" still match
- **Weighted scoring** - Title matches rank higher than keyword matches

### Smart Skip

ctx-pilot stays silent when it has nothing useful to add:
- Short prompts with few searchable terms (like "thanks" or "looks good") produce no output
- Low-confidence matches are filtered out
- Only results above a relevance threshold are shown

This prevents noise - you only see suggestions when they're actually helpful.

### Stale File Detection

ctx-pilot automatically detects when indexed files have changed:

```
**Relevant to your task:**
- src/auth.ts (lines 12-45) - function login ⚠️

⚠️ Before answering, update .context/index.json for files marked ⚠️.
```

Claude automatically updates the index for stale files before responding - no action needed from you.

### Validation

Check your index for issues:

```bash
npx ctx-pilot validate
```

This checks for missing pinned files, invalid line numbers, empty keywords, and orphaned entries.

---

## Troubleshooting

**Nothing happening?**
- Run `npx ctx-pilot status` to check setup
- Make sure you ran `npx ctx-pilot auto-index`
- Restart Claude Code after installing

**Wrong suggestions?**
- Add important files to `pinned`
- Adjust `include`/`exclude` patterns
- Rebuild with `npx ctx-pilot auto-index`
- Check for issues with `npx ctx-pilot validate`

**Seeing ⚠️ warnings?**
- Files changed since the index was built
- Claude updates the index automatically before answering
- Or rebuild manually with `npx ctx-pilot auto-index`

**No suggestions appearing?**
- This is often intentional - ctx-pilot stays silent when there's nothing useful to add
- Try prompts with specific terms (function names, file paths, technical concepts)
- Check `npx ctx-pilot status` to verify the hook is installed and index exists

**ctx-pilot stops working?**
- It fails gracefully - your AI tool works exactly as before, just without suggestions
- Check `npx ctx-pilot status` for diagnostics
- Reinstall the hook with `npx ctx-pilot hook`

---

## Privacy

ctx-pilot runs **100% locally**. No telemetry, no analytics, no network requests.

- Your code stays on your machine
- No accounts or API keys required
- Works offline
- Open source - audit the code yourself

---

## Performance

ctx-pilot is designed to be invisible:

- **Hook execution**: < 100ms per prompt
- **Memory**: Minimal - index stored on disk

---

## Contributing

Found a bug? Have an idea? Contributions welcome!

- **Issues**: [Report bugs or request features](https://github.com/Suite110/ctx-pilot/issues)
- **PRs**: Fork, branch, submit

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Support the Project

If ctx-pilot saves you time, consider supporting its development:

- ⭐ **Star the repo** - Helps others discover it
- 🐛 **Report issues** - Help make it better
- 💻 **Contribute code** - New features, bug fixes
- 💬 **Spread the word** - Tweet, blog, tell your team
- ❤️ **Sponsor** - [GitHub Sponsors](https://github.com/sponsors/stephen-gobin)

---

## License

**Free for most users.** Dual-licensed:

- **MIT License** - Free for individuals, education, open source, and companies with <$1M annual revenue
- **Commercial License** - Required for larger commercial entities

Most developers and small teams can use ctx-pilot freely under MIT. See [LICENSE](LICENSE) and [LICENSE-COMMERCIAL](LICENSE-COMMERCIAL) for details.

---

**Built by [@stephen-gobin](https://github.com/stephen-gobin)** | **[Suite110](https://github.com/Suite110)**
