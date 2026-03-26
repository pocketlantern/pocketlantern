# @pocketlantern/knowledge

Curated, blocker-aware decision cards for [PocketLantern](https://pocketlantern.dev).

This package contains the knowledge base — YAML decision cards and a graph index of blocker edges (EOL dates, breaking changes, lock-in risks, version floors).

## Contents

- `cards/` — Decision cards across 25+ categories (auth, database, frontend, infra, serverless, etc.)
- `graph/_index.json` — Sidecar blocker edge index for search augmentation

## Usage

This is a data package consumed by `@pocketlantern/mcp-server`. You typically don't install it directly — it comes as a dependency of the `pocketlantern` CLI.

```bash
npm install -g pocketlantern
```

## License

MIT
