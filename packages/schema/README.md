# @pocketlantern/schema

Card schema definitions for [PocketLantern](https://pocketlantern.dev) — Zod types and JSON Schema export.

## Usage

```typescript
import { CardSchema, type Card } from "@pocketlantern/schema";

const card = CardSchema.parse(rawYaml);
```

## Exports

- `CardSchema` — Zod schema for decision cards
- `CandidateSchema` — Zod schema for solution candidates
- `Constraint` — Enum of environment constraints
- `CardStatus` — `"active" | "deprecated" | "draft"`
- `CardTier` — `"core" | "foundational"`
- `cardToJsonSchema()` — Convert to JSON Schema

## License

MIT
