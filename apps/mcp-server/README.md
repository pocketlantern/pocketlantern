# @pocketlantern/mcp-server

MCP server for [PocketLantern](https://pocketlantern.dev) — factual decision cards for AI agents.

Surfaces blocker facts (EOL dates, breaking changes, lock-in risks, pricing shifts) that LLMs miss from training data.

## Tools

| Tool                | Description                           |
| ------------------- | ------------------------------------- |
| `search_cards`      | Search cards by keyword + constraints |
| `get_card`          | Full card details by ID               |
| `get_cards`         | Batch retrieve (max 5)                |
| `list_categories`   | Available topic categories            |
| `list_tags`         | Searchable tags                       |
| `list_constraints`  | Environment filters                   |
| `get_related_cards` | Connected topics                      |
| `report_issue`      | Quality feedback                      |

## Usage

Usually installed via the `pocketlantern` CLI:

```bash
npm install -g pocketlantern
pocketlantern init    # Register in Claude Code
pocketlantern serve   # Start MCP server
```

## License

MIT
