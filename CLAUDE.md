# CLAUDE.md

## PocketLantern

For technology decisions, upgrades, migrations, or licensing questions: before finalizing your answer, check the PocketLantern MCP server's search_cards tool for blockers in these bundled decision cards — your training data may be stale.

## Project Overview

PocketLantern is a **blocker-aware decision layer for AI agents** — not a knowledge base. It pre-compresses **factual, time-sensitive information** (pricing, versions, breaking changes, vendor policy drift) so agents can make decisions cheaply instead of running costly web searches every time.

The primary interface is an **MCP (Model Context Protocol) server** that AI agents call via `search_cards` and `get_card` tools. The user (human) installs and configures; the AI agent is the actual consumer of the cards.

**Analogy**: CDN for technical facts. Like a CDN avoids hitting the origin server on every request, PocketLantern avoids costly web searches on every agent query. The value is in **factual accuracy** — prices, versions, breaking changes — not in decision structure.

### Card Selection Philosophy

- **Don't card what LLMs already know** — "JWT vs Session" is common knowledge
- **Card what contains factual hooks** — latest pricing, versions, breaking changes, vendor policy drift

## Current Status

This is the **public toolkit** repo. It contains the MCP server, CLI, schema, and curated blocker-aware decision cards across 27 categories.

### What's here

- MCP server + CLI + schema (the tool)
- Curated decision cards across 27 categories (local mode — works immediately)

## Quick Reference

```bash
pnpm build                                          # Build all packages (schema → mcp-server → cli)
pnpm test                                           # Run all tests (vitest)
pnpm test:coverage                                  # Run tests with v8 coverage report
npx prettier --write .                              # Fix formatting (CI runs format:check)
npx pocketlantern validate                          # Validate sample cards against schema
npx pocketlantern search "query"                    # Search cards (human-readable output)
npx pocketlantern doctor                            # Diagnose installation status
npx pocketlantern init                              # Register MCP server in Claude Code
npx tsx apps/cli/src/index.ts validate              # Validate without building (dev mode)
```

## Project Structure & Key Files

```
pocketlantern/
  packages/schema/
    src/card.ts              <- Card, Candidate, CardStatus, CardTier schemas (zod)
    src/index.ts             <- Public exports
    src/json-schema.ts       <- JSON Schema conversion (zod-to-json-schema)

  apps/mcp-server/
    src/index.ts             <- Public API (resolveCardsDir, createServer, initializeStore)
    src/server.ts            <- Binary entry point (main + stdio bootstrap)
    src/loader.ts            <- YAML card loader + findYamlFiles (shared with CLI)
    src/search.ts            <- Keyword search engine with weighted scoring + tier penalty
    src/tools/
      search-cards.ts        <- search_cards MCP tool handler
      get-card.ts            <- get_card MCP tool handler
      get-cards.ts           <- get_cards MCP tool handler (batch, max 5)
      list-categories.ts     <- list_categories MCP tool handler
      list-tags.ts           <- list_tags MCP tool handler
      list-constraints.ts    <- list_constraints MCP tool handler
      get-related-cards.ts   <- get_related_cards MCP tool handler
      response.ts            <- jsonResponse / errorResponse helpers (shared by all handlers)
    src/__tests__/           <- Unit + integration tests

  apps/cli/
    src/index.ts             <- CLI entry point, command routing
    src/paths.ts             <- Shared path resolution (MCP server binary path)
    src/commands/
      serve.ts               <- Start MCP server process
      search.ts              <- Human-readable card search
      validate.ts            <- Schema validation for all cards
      init.ts                <- Register MCP server in Claude Code config
      doctor.ts              <- Installation diagnostics

  packages/knowledge/        <- Decision cards data package
    cards/                   <- 27 categories (auth, database, infra, serverless, ...)
    graph/                   <- Sidecar blocker edge index (_index.json)

  docs/
    agent-guide.md           <- How AI agents use PocketLantern tools
    v1-public.md             <- Public essentials (Free vs Pro, refresh semantics)
    roadmap.md               <- Shipped / Next / Future
```

**Monorepo**: pnpm workspace. Build order: `schema -> knowledge (no build) -> mcp-server -> cli`.

## Architecture

### 3-Stage Retrieval

```
Agent -> list_categories() / list_constraints()       -> understand what's available
Agent -> search_cards("auth", constraints:["serverless"]) -> filtered summaries
Agent -> get_card("auth/jwt-vs-session")              -> full card details
Agent -> get_cards(["id1", "id2", ...])               -> batch retrieve (max 5)
Agent -> get_related_cards("auth/jwt-vs-session")     -> explore connected topics
```

Stage 1 (explore) -> Stage 2 (search + filter) -> Stage 3 (deep dive + expand).

### Package Dependencies

```
schema (standalone) <- mcp-server <- cli
knowledge (standalone, pure data) <- mcp-server
```

- `@pocketlantern/schema`: zod schemas, TypeScript types
- `@pocketlantern/knowledge`: YAML decision cards + graph index (pure data, no build)
- `@pocketlantern/mcp-server`: MCP server, card loader, search engine
  - Subpath exports: `./loader`, `./search`, `./server` (used by CLI)
- `pocketlantern` (cli): CLI commands, imports from mcp-server

### Search Scoring (keyword-based)

Tag matches use if/else — exact match wins, partial match only if no exact match.

```
title(3) + problem(2) + tag exact(2) + alias(2) + constraint(2) + tag partial(1) + candidate name(1) + context(1)
Fields stack: a keyword matching both title and problem scores 3+2=5.
```

- Foundational tier cards get a -3 scoring penalty (deprioritized, not excluded)
- Constraints filter: AND logic (all specified constraints must match)
- Deprecated cards excluded by default (`include_deprecated` option available)
- Draft cards always excluded
- limit default: 5, max: 50

## Card Schema

```yaml
id: "category/card-name" # Required. Regex: ^[a-z0-9-]+/[a-z0-9-]+$
title: "Human-readable Title" # Required
problem: "What problem this solves" # Required
context: [tech, stack, tags] # Optional. Free-form context for humans
constraints: # Optional. Controlled vocabulary (zod enum)
  - serverless # serverless | high-scale | low-ops | cost-sensitive
  - enterprise # enterprise | small-team | monorepo | microservices
    # real-time | compliance
candidates: # Required (min 1)
  - name: "Solution Name"
    summary: "1-2 sentence summary"
    when_to_use: "When to pick this"
    tradeoffs: "Pros and cons" # Optional
    cautions: "Warnings" # Optional
    links: [url1, url2] # Optional
tags: [tag1, tag2] # Required (min 1)
aliases: [alt-term1, alt-term2] # Optional. Alternative search terms
related_cards: [other/card-id] # Optional. Cross-references
status: active # Optional. active|deprecated|draft (default: active)
tier: core # Optional. core (default) | foundational (deprioritized)
updated: "YYYY-MM-DD" # Required. ISO 8601 date
review_by: "YYYY-MM-DD" # Optional. Re-verification date (time-scoped cards only)
```

## Key Design Decisions

These decisions were made deliberately. Don't change without discussion.

| Decision                                 | Why                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Keyword search, not vector/semantic**  | Current card count doesn't justify embedding infrastructure.                                                                       |
| **tier: foundational deprioritization**  | Internal eval proved foundational cards (common knowledge) hurt LLM answers. Penalty(-3) keeps them findable but below core cards. |
| **constraints as controlled vocabulary** | Free-form would cause inconsistency. zod enum enforces consistency. New values need 3+ card applicability.                         |
| **YAML files, not database**             | Git-trackable, human-editable, zero infrastructure. Cards are the product.                                                         |
| **pnpm workspace, not turborepo**        | Project is small. Turborepo adds complexity we don't need yet.                                                                     |
| **No hexagonal architecture**            | Too heavy for v0.1. Simple module separation is sufficient.                                                                        |
| **English-only cards**                   | LLMs perform best in English. Global accessibility.                                                                                |
| **MCP over CLI parsing**                 | AI agents connect via MCP protocol, not by parsing CLI output.                                                                     |
| **mcp-server in apps/, not packages/**   | It's a runnable server (bin entry), not a library. CLI imports via subpath exports — intentional cross-app reuse.                  |

## Code Conventions

- **One clear responsibility per file**. Split if a file exceeds ~100 lines.
- **No premature abstraction**. Only introduce interfaces when 2+ implementations exist.
- **TypeScript strict mode** in all packages.
- **`createRequire` + `require.resolve`** for cross-package path resolution (works in both monorepo dev and npm install -g).
- `resolveCardsDir(override?)` lives in `apps/mcp-server/src/index.ts` — CLI imports it via `@pocketlantern/mcp-server`. Don't duplicate.
- `findYamlFiles` is exported from `@pocketlantern/mcp-server/loader` — reuse it.

## Adding/Editing Knowledge Cards

1. Create/edit YAML in `packages/knowledge/cards/{category}/{name}.yaml`
2. Follow the card schema above. All content in **English**.
3. Run `pnpm build && npx pocketlantern validate`
4. **Verify technical claims** against official documentation (fetch the linked URLs)
5. Include working links to official docs for each candidate

## CI Checklist

CI runs these in order — all must pass before merge:

1. `pnpm build` — TypeScript compilation (`tsc`). Catches missing imports, type errors.
2. `pnpm format:check` — Prettier. Run `npx prettier --write .` locally before pushing.
3. `pnpm test` — Vitest. Smoke test (`smoke.test.ts`) requires `dist/` from step 1.

## Release Checklist

MCP Registry publish is automated in the Release workflow (`release.yml`). After changesets publishes to npm, the workflow automatically:

1. Syncs `server.json` version fields from `apps/mcp-server/package.json`
2. Authenticates via GitHub OIDC (no secrets needed)
3. Publishes to the MCP Registry

**Manual verification** (optional): `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.pocketlantern"`

**Note: Registry metadata changes (name, description) also require a new version — duplicate version publish is rejected (400). If you need to change description without code changes, bump the patch version.**

## Don't

- Don't write card content in languages other than English.
- Don't push without running `npx prettier --write .` on changed files — CI will reject formatting issues.
- Don't add schema fields without updating `packages/schema/src/card.ts`.
- Don't skip `validate` after editing cards.
- Don't use `process.env` values without null-checking.
- Don't duplicate path resolution — use `resolveCardsDir` from `@pocketlantern/mcp-server`.
- Don't add unnecessary abstractions for one-time operations.
