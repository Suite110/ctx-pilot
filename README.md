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

ctx-pilot automatically suggests relevant files before every prompt. Claude reads them and stays informed.

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
- **Works offline** - Everything runs locally, no API keys or accounts needed
- **Graceful degradation** - If something breaks, your AI tool works exactly as before

---

## Quick Start

```bash
# Install
npm install -g ctx-pilot

# Set up in your project
npx ctx-pilot init

# Restart Claude Code
```

That's it. ctx-pilot now runs before every prompt, suggesting relevant files based on what you're working on.

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

ctx-pilot auto-detects your environment (Claude or Gemini) and installs the appropriate hook.

Restart your AI CLI to activate.

### Manual Setup

If you prefer control:

```bash
# 1. Create config
echo '{
  "pinned": ["docs/core-concepts.md"],
  "include": ["**/*.md", "**/*.ts"],
  "exclude": []
}' > .context/config.json

# 2. Build index
npx ctx-pilot index

# 3. Install hook
npx ctx-pilot hook

# 4. Restart Claude Code
```

---

## Configuration

Edit `.context/config.json`:

```json
{
  "pinned": ["docs/core-concepts.md", "docs/glossary.md"],
  "include": ["**/*.md", "**/*.ts", "**/*.py"],
  "exclude": ["node_modules/**", "dist/**"],
  "tokenBudget": 32000,
  "maxContextPercentage": 50
}
```

| Field | What it does |
|-------|--------------|
| `pinned` | Files suggested on every prompt (your core docs) |
| `include` | What to index (glob patterns) |
| `exclude` | What to skip |
| `tokenBudget` | Max tokens for context |
| `maxContextPercentage` | Max % of available context to use |

---

## CLI Commands

### Setup & Status

```bash
npx ctx-pilot init            # Set up config and install hook
npx ctx-pilot status          # Show config, index, hooks, and exports
npx ctx-pilot index           # Rebuild the index
npx ctx-pilot index --force   # Force full rebuild
```

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

### Watch Mode

Auto-regenerate exports when files change.

```bash
npx ctx-pilot watch --cursor      # Watch and update .cursorrules
npx ctx-pilot watch --windsurf    # Watch and update .windsurfrules
npx ctx-pilot watch --aider       # Watch and update .aider.context.md
npx ctx-pilot watch --all         # Watch and update all exports
```

---

## Supported Languages

ctx-pilot understands structure in:

**Code:**
| Language | Indexed as sections |
|----------|---------------------|
| TypeScript/JavaScript | Functions, classes, interfaces |
| Python | Functions, classes |
| Go | Functions, structs, interfaces |
| Rust | Functions, structs, enums, traits, impls |
| Java/Kotlin | Classes, interfaces, methods |
| C# | Classes, structs, interfaces, methods |
| C/C++ | Functions, structs, classes, macros |
| Ruby | Classes, modules, methods |
| PHP | Classes, interfaces, traits, functions |
| Swift | Classes, structs, protocols, funcs |
| Dart | Classes, mixins, functions |
| Shell/Bash | Functions, exports |
| HLSL/GLSL/WGSL | Functions, structs |

**Docs & Config:**
| Format | Indexed as sections |
|--------|---------------------|
| Markdown | Headers (H1, H2, H3) |
| reStructuredText | Headers (underlined) |
| AsciiDoc | Headers (= syntax) |
| YAML/JSON | Top-level keys |
| TOML | Tables and sections |
| XML/HTML | Top-level elements |

---

## Troubleshooting

**Nothing happening?**
- Run `npx ctx-pilot status` to check setup
- Restart Claude Code after installing

**Wrong suggestions?**
- Add important files to `pinned`
- Adjust `include`/`exclude` patterns
- Run `npx ctx-pilot index --force`

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

- **Index build**: < 2 seconds for most projects
- **Hook execution**: < 100ms per prompt
- **Memory**: Minimal - index stored on disk
- **Watch mode**: Debounced updates, low CPU usage

---

## Contributing

Found a bug? Have an idea? Contributions welcome!

- **Issues**: [Report bugs or request features](https://github.com/Suite110/ctx-pilot/issues)
- **PRs**: Fork, branch, submit
- **Parsers**: Add support for new languages in `src/indexer/parsers/`

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Support the Project

If ctx-pilot saves you time, consider supporting its development:

- ⭐ **Star the repo** - Helps others discover it
- 🐛 **Report issues** - Help make it better
- 💻 **Contribute code** - New features, parsers, fixes
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
