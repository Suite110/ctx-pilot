# Changelog

All notable changes to ctx-pilot will be documented in this file.

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

#### Watch Mode
- Auto-regenerate exports when files change
- Debounced updates (500ms)
- Support for watching single or all export targets

#### Indexing
- Section-aware parsing for 19 language families (50+ file extensions):

  **Code:**
  - JavaScript/TypeScript (functions, classes, interfaces)
  - Python (functions, classes)
  - Go (functions, structs, interfaces)
  - Rust (functions, structs, enums, traits, impls)
  - Java/Kotlin (classes, interfaces, methods)
  - C# (classes, structs, interfaces, methods)
  - C/C++ (functions, structs, classes, macros)
  - Ruby (classes, modules, methods)
  - PHP (classes, interfaces, traits, functions)
  - Swift (classes, structs, protocols, funcs)
  - Dart (classes, mixins, functions)
  - Shell/Bash (functions, exports)
  - Shaders - HLSL, GLSL, WGSL (functions, structs)

  **Docs & Config:**
  - Markdown (headers)
  - reStructuredText (headers)
  - AsciiDoc (headers)
  - YAML/JSON (top-level keys)
  - TOML (tables and sections)
  - XML/HTML (top-level elements)

- Incremental index updates
- Configurable include/exclude patterns

#### Configuration
- Pinned files (always suggested)
- Token budget awareness
- Glob patterns for file selection

### CLI Commands

```bash
npx ctx-pilot init              # Setup config and hook
npx ctx-pilot status            # Show current state
npx ctx-pilot index             # Rebuild index
npx ctx-pilot hook              # Install hook (auto-detects)
npx ctx-pilot export --cursor   # Generate .cursorrules
npx ctx-pilot export --windsurf # Generate .windsurfrules
npx ctx-pilot export --aider    # Generate .aider.context.md
npx ctx-pilot watch --all       # Watch and auto-regenerate
```

### Links

- [Documentation](https://github.com/Suite110/ctx-pilot#readme)
- [Issues](https://github.com/Suite110/ctx-pilot/issues)
- [npm](https://www.npmjs.com/package/ctx-pilot)
