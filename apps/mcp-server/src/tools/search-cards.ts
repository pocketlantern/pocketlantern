import { z } from "zod";
import { ConstraintSchema } from "@pocketlantern/schema";
import type { CardStore } from "../card-store.js";
import { searchCards, type SearchResult } from "../search.js";
import type { GraphIndex, BlockerSummary } from "../graph-loader.js";
import { getBlockersForCards } from "../graph-loader.js";
import { loadProCatalog, searchProCatalog, type ProHint } from "../pro-catalog.js";
import { logSearch } from "../query-log.js";
import { jsonResponse } from "./response.js";

export const SearchCardsArgsSchema = z.object({
  query: z
    .string()
    .describe(
      "Natural-language problem or short topic query (e.g. 'auth for serverless', 'database migration'). Stopwords are filtered automatically.",
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe(
      "Filter results to cards with these tags. Use list_tags to discover available values.",
    ),
  constraints: z
    .array(ConstraintSchema)
    .optional()
    .describe(
      "Narrow results by environment or operational needs (AND logic). Values: serverless, high-scale, low-ops, cost-sensitive, enterprise, small-team, monorepo, microservices, real-time, compliance.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of results (default: 5, max: 50)"),
  include_deprecated: z
    .boolean()
    .optional()
    .describe(
      "Include deprecated cards in results (default: false). Only set true when explicitly looking for outdated approaches.",
    ),
  include_blockers: z
    .boolean()
    .optional()
    .describe(
      "Include source-linked blocker warnings (EOL dates, breaking changes, lock-in, incompatibilities) linked to each result card when available. Default: true.",
    ),
});

interface SearchResponse {
  cards: SearchResult[];
  mode?: string;
  hint?: string;
  pro_hint?: ProHint;
  blockers?: BlockerSummary[];
  blocker_note?: string;
}

export async function handleSearchCards(
  store: CardStore,
  args: z.infer<typeof SearchCardsArgsSchema>,
  graphIndex?: GraphIndex | null,
) {
  const cards = store.getAll();
  const results = searchCards(cards, args.query, {
    tags: args.tags,
    constraints: args.constraints,
    limit: args.limit,
    includeDeprecated: args.include_deprecated,
  });

  const isPro = store.mode === "pro";
  const catalog = isPro ? await loadProCatalog() : null;
  const localCardIds = catalog ? new Set(cards.map((c) => c.id)) : null;

  if (results.length === 0) {
    const hints: string[] = [];
    if (args.constraints?.length) {
      hints.push("try removing constraints to broaden results");
    }
    if (args.tags?.length) {
      hints.push("try removing tag filters");
    }
    hints.push("use list_categories or list_tags to discover available topics");

    let proHint: ProHint | null = null;
    if (catalog && localCardIds) {
      proHint = searchProCatalog(catalog, args.query, localCardIds);
    }

    const response: SearchResponse = { cards: [] };
    if (proHint) {
      response.pro_hint = proHint;
    } else {
      response.hint = `No cards found. ${hints.join(", or ")}.`;
    }

    logSearch(args.query, []);
    return jsonResponse(response);
  }

  const includeBlockers = args.include_blockers !== false;
  let blockers: BlockerSummary[] = [];

  if (includeBlockers && graphIndex) {
    const topCardIds = results.slice(0, 3).map((r) => r.id);
    blockers = getBlockersForCards(graphIndex, topCardIds);
  }

  const currentMode = store.mode;
  const response: SearchResponse = { cards: results, mode: currentMode };

  if (catalog && localCardIds) {
    const proHint = searchProCatalog(catalog, args.query, localCardIds);
    if (proHint && proHint.matched_count > 0) {
      response.pro_hint = {
        matched_count: proHint.matched_count,
        message: "Additional source-linked blocker warnings may be available in future updates.",
        url: "https://pocketlantern.dev",
      };
    }
  }

  if (blockers.length > 0) {
    response.blockers = blockers;
    response.blocker_note =
      "⚠️ Source-linked blocker warnings. Address these before committing to a choice.";
  }

  logSearch(
    args.query,
    results.map((r) => r.id),
  );
  return jsonResponse(response);
}
