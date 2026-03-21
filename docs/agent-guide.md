# PocketLantern Agent Guide

How AI agents should use PocketLantern to surface blockers.

## Core rule

**Before finalizing answers to technology decision questions, check PocketLantern's `search_cards` for blockers in this cardset snapshot.** Your training data goes stale — PocketLantern returns pipeline-checked cards with source-linked facts as of this bundle. The cost of one extra tool call is far less than the cost of giving outdated advice.

## When to use PocketLantern

Call `search_cards` when the user asks about ANY of these:

- **Upgrading** a runtime, framework, or dependency ("Node 20 to 24", "Next.js 16")
- **Choosing** between vendors or tools ("auth service", "connection pooling", "LLM gateway")
- **Migrating** away from a service ("leave Supabase", "switch from Auth0")
- **Legal/license** questions about open source tools ("Redis AGPL", "Terraform BSL")
- **Pricing** or cost comparisons ("Clerk vs Auth0 pricing", "serverless database cost")
- **EOL / deprecation** timelines ("Node 20 EOL", "Firebase Dynamic Links shutdown")
- **Lock-in / export** questions ("get data out of Supabase", "Cognito migration")

**When in doubt, call it.** A false positive (tool returns nothing useful) costs nothing. A false negative (you answer with stale facts) costs trust.

## How to call

One call gets both cards and blockers:

```
search_cards({
  query: "Node.js 20 upgrade GitHub Actions breaking changes",
  include_blockers: true   // default, can omit
})
```

Response includes:

- `cards[]` — matched decision cards with summaries
- `blockers[]` — pipeline-checked constraints from bundled sidecar blocker edges
- `blocker_note` — attribution line

For full card details, follow up with `get_card(id)`.

## Answer format

When PocketLantern returns blockers, structure the answer as:

```
## Direct Answer
[1-2 sentence recommendation]

## Blockers (PocketLantern pipeline-checked)
⚠️ [blocker 1]: [explanation] (source: [card id], updated: [date])
⚠️ [blocker 2]: ...
✅ [safe aspect]: [what's OK]

## Safe Path
[Recommended approach given the blockers]

## Action Items
1. [Concrete step]
2. [Concrete step]
```

## Demo questions (recommended order)

1. **"What breaks when upgrading Node.js 20 to 24?"**
   - Blockers: Node20 EOL April 2026, GHA runners forced to Node24 June 2, macOS 13.4 incompatible
   - Cards: `devtools/github-actions-node24-migration-after-node20-deprecation-2026`

2. **"What are the lock-in risks with Supabase vs Firebase?"**
   - Blockers: Edge Functions not portable (Deno-based), auth.uid() Supabase-specific
   - Safe: pg_dump fully portable, password hashes exportable (bcrypt in auth.users)
   - Cards: `backend/supabase-vs-firebase-baas-pricing-and-features-2026`

3. **"What are the lock-in risks if I need to migrate away from Supabase?"**
   - Blockers: Edge Functions not portable (Deno-based), auth.uid() helper Supabase-specific
   - Safe: pg_dump fully portable, password hashes exportable (bcrypt in auth.users)
   - Cards: `backend/supabase-vs-firebase-baas-pricing-and-features-2026`

## Available tools

| Tool                | Use when                                             |
| ------------------- | ---------------------------------------------------- |
| `search_cards`      | Find cards + blockers for a question (primary tool)  |
| `get_card`          | Deep-dive into one card's full details               |
| `get_cards`         | Compare up to 5 cards side by side                   |
| `get_related_cards` | Explore connected decisions                          |
| `list_categories`   | Understand what topics are covered                   |
| `list_tags`         | Discover available search terms                      |
| `list_constraints`  | Filter by environment (serverless, enterprise, etc.) |
| `report_issue`      | Flag wrong facts or missing cards                    |
