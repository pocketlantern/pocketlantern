# Contributing to PocketLantern

Thank you for your interest in PocketLantern.

## What we accept

Contributions to the **tool** are welcome:

- Schema improvements (`packages/schema/`)
- MCP server features and bug fixes (`apps/mcp-server/`)
- CLI enhancements (`apps/cli/`)
- Search engine improvements
- Documentation fixes
- Test improvements

## What we don't accept

**Card contributions are not accepted at this time.** The sample cards included in this repo are maintained internally through a verified production process. Card quality depends on reviews on a refresh schedule with source links, and we cannot guarantee that standard through external contributions.

This policy may change as the project matures.

## Development setup

```bash
git clone https://github.com/pocketlantern/pocketlantern.git
cd pocketlantern
pnpm install
pnpm build
pnpm test
```

## Making changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `pnpm build && pnpm test` — all tests must pass
4. If you changed card-related logic, run `npx pocketlantern validate`
5. Add a changeset (see below)
6. Submit a pull request

## Changesets

If your PR changes the tool, schema, or cards:

1. Run `npx changeset` and follow the prompts
2. Select the affected package(s) and bump type (patch/minor/major)
3. Commit the generated `.changeset/*.md` file with your PR

If your PR is docs/test/chore only, add the `no-changeset` label.

## Project structure notes

- The root `package.json` has a `bin` field pointing to the CLI — this is for **monorepo development convenience only** (so `pnpm pocketlantern` works from the repo root). The published CLI package is `pocketlantern`.
- Knowledge cards use `.yaml` extension only (not `.yml`). This is intentional for consistency.

## Code standards

- TypeScript strict mode
- One responsibility per file
- No premature abstractions
- Tests for new functionality
- English only in code and documentation
- Tool handlers that need ID lookup receive `CardStore`; list/aggregate handlers receive `Card[]`

## Reporting issues

Use [GitHub Issues](https://github.com/pocketlantern/pocketlantern/issues) for bug reports and feature requests.
