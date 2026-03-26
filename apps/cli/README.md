# pocketlantern

Blocker-aware decision layer for AI agents — source-linked technology cards.

Your AI agent sounds confident. It missed the blockers. PocketLantern surfaces EOL dates, breaking changes, lock-in risks, and pricing shifts that LLMs miss from training data.

## Install

```bash
npm install -g pocketlantern
```

## Commands

```bash
pocketlantern search <query>              # Search knowledge cards
pocketlantern serve [--cards-dir <path>]   # Start MCP server
pocketlantern validate [--cards-dir <path>] # Validate card schemas
pocketlantern init [--scope <scope>]       # Register MCP server in Claude Code
pocketlantern doctor [--cards-dir <path>]  # Diagnose installation status
```

## Register with Claude Code

```bash
pocketlantern init
```

Then restart Claude Code. Try:

```
"What breaks when upgrading Node.js 20 to 24?"
"What are the lock-in risks if I need to migrate away from Supabase?"
```

## License

MIT
