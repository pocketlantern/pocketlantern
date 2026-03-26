# PocketLantern Roadmap

## Shipped

- [x] Card schema (Zod + JSON Schema export)
- [x] MCP server (search, retrieval, navigation tools)
- [x] CLI (`init`, `doctor`, `search`, `validate`, `serve`)
- [x] Constraints filtering (controlled vocabulary)
- [x] Sidecar blocker edges (EOL, breaking changes, lock-in)
- [x] 100+ curated blocker-aware cards across 25 categories
- [x] CI/CD, ESLint, Prettier, TypeScript strict
- [x] GitHub Issue / PR templates

## Next

- [ ] npm publish — `npm install -g pocketlantern` as default install experience
  - [ ] `@pocketlantern/knowledge` data package (cards + graph bundled)
  - [ ] `@pocketlantern/mcp-server` with knowledge dependency
  - [ ] `pocketlantern` CLI package (unscoped, global install)
  - [ ] Path resolution via `require.resolve` (works in both repo and installed mode)
  - [ ] Package metadata (author, keywords, README per package)
- [ ] Homebrew support — `brew install pocketlantern`, `brew upgrade` updates cards
- [ ] Search quality improvements (fuzzy matching, tf-idf)
- [ ] Graph traversal tools (cross-card blocker path queries)

## Future

- [ ] Semantic search
- [ ] Context-aware recommendations
- [ ] Community card contributions
