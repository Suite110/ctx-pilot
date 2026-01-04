# Optimize ctx-pilot

Analyze this codebase and configure ctx-pilot for optimal context suggestions.

## Steps

1. **Review the codebase structure** - identify source files, documentation, tests, and config files

2. **Update `.context/config.json`**:
   ```json
   {
     "pinned": ["<core docs that are always relevant>"],
     "include": ["<glob patterns for useful files>"],
     "exclude": ["node_modules/**", "dist/**", "<other build artifacts>"]
   }
   ```

3. **Build `.context/index.json`** by scanning included files:
   ```json
   {
     "version": "1.1.0",
     "lastUpdated": "<ISO timestamp>",
     "files": [{
       "path": "<relative path>",
       "mtime": "<ISO timestamp of file>",
       "hash": "<first 16 chars of content SHA256>",
       "sections": [{
         "title": "<function/class/header name>",
         "lineStart": 1,
         "lineEnd": 50,
         "preview": "<first 100 chars of section>",
         "tokens": <char count / 4>,
         "keywords": ["<top frequency words, excluding stopwords>"]
       }]
     }]
   }
   ```

4. **Verify** with `npx ctx-pilot status`
