# Contributing to ctx-pilot

Thanks for your interest in contributing!

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Suite110/ctx-pilot.git
cd ctx-pilot

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## Development

```bash
# Watch mode
npm run dev

# Test locally
node dist/cli.js help
```

## Adding a Parser

To support a new language:

1. Create `src/indexer/parsers/yourlang.ts`
2. Export a function matching `SectionParser` type
3. Register it in `src/indexer/parsers/index.ts`

See existing parsers for examples.

## Submitting Changes

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with a clear message
6. Push and open a PR

## Code Style

- TypeScript strict mode
- No unused variables
- Clear function names

## Questions?

Open an issue or start a discussion.
