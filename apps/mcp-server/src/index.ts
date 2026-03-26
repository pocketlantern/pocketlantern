import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LocalCardStore, MergedCardStore, type CardStore } from "./card-store.js";
import { RemoteClient } from "./remote-client.js";
import { loadGraphIndex, type GraphIndex } from "./graph-loader.js";
import { handleSearchCards, SearchCardsArgsSchema } from "./tools/search-cards.js";
import { handleGetCard, GetCardArgsSchema } from "./tools/get-card.js";
import { handleListCategories } from "./tools/list-categories.js";
import { handleListTags, ListTagsArgsSchema } from "./tools/list-tags.js";
import { handleListConstraints } from "./tools/list-constraints.js";
import { handleGetRelatedCards, GetRelatedCardsArgsSchema } from "./tools/get-related-cards.js";
import { handleGetCards, GetCardsArgsSchema } from "./tools/get-cards.js";
import { handleReportIssue, ReportIssueArgsSchema } from "./tools/report-issue.js";
import { logGetCard } from "./query-log.js";

/**
 * Resolve the knowledge cards directory.
 * Priority: explicit override > POCKETLANTERN_CARDS_DIR env var > @pocketlantern/knowledge package.
 */
export function resolveCardsDir(override?: string): string {
  if (override) return resolve(override);
  if (process.env.POCKETLANTERN_CARDS_DIR) {
    return resolve(process.env.POCKETLANTERN_CARDS_DIR);
  }
  const require = createRequire(import.meta.url);
  const knowledgePkg = require.resolve("@pocketlantern/knowledge/package.json");
  return resolve(dirname(knowledgePkg), "cards");
}

export interface ServerConfig {
  cardsDir: string;
  apiKey?: string;
  apiBaseUrl?: string;
  graphDir?: string;
}

/**
 * Initialize store and graph index from config.
 * Handles local-only mode, Pro mode with remote merge, and graceful fallback.
 */
export async function initializeStore(config: ServerConfig): Promise<{
  store: CardStore;
  graphIndex: GraphIndex | null;
}> {
  const localStore = await LocalCardStore.create(config.cardsDir);
  let store: CardStore = localStore;

  if (config.apiKey) {
    const remote = new RemoteClient({
      apiKey: config.apiKey,
      baseUrl: config.apiBaseUrl ?? "https://api.pocketlantern.com",
    });
    const remoteCards = await remote.fetchAllCards();
    if (remoteCards.length > 0) {
      store = new MergedCardStore(localStore.getAll(), remoteCards);
    }
  }

  const graphIndex = await loadGraphIndex(config.graphDir);
  return { store, graphIndex };
}

/**
 * Create and configure an McpServer with all PocketLantern tools registered.
 */
export function createServer(store: CardStore, graphIndex: GraphIndex | null): McpServer {
  const require = createRequire(import.meta.url);
  const { version } = require("../package.json") as { version: string };
  const server = new McpServer({ name: "pocketlantern", version });

  server.registerTool(
    "search_cards",
    {
      description:
        "Before finalizing answers about technology choices, upgrades, migrations, licensing, or vendor selection — check this tool for blockers in this cardset snapshot. Your training data may be stale. Returns pipeline-checked cards with source-linked facts as of this bundle — surfacing EOL dates, breaking changes, version floors, lock-in risks (password export, vendor dependency), pricing model changes, and migration blockers. Includes blocker warnings from sidecar blocker edges where indexed. Use get_card for full details.",
      inputSchema: SearchCardsArgsSchema.shape,
    },
    async (args) => {
      return handleSearchCards(store, args, graphIndex);
    },
  );

  server.registerTool(
    "get_card",
    {
      description:
        "Get the full content of a technology decision card by ID. Returns all candidate solutions with tradeoffs, cautions, and official reference links. Use after search_cards to deep-dive into a specific decision.",
      inputSchema: GetCardArgsSchema.shape,
    },
    async (args) => {
      const result = handleGetCard(store, args);
      logGetCard(args.id, !("isError" in result));
      return result;
    },
  );

  server.registerTool(
    "list_categories",
    {
      description:
        "List available topic categories (auth, backend, database, frontend, infra, testing) with card counts. Call this first to understand what technology decisions are covered.",
    },
    async () => {
      return handleListCategories(store.getAll());
    },
  );

  server.registerTool(
    "list_tags",
    {
      description:
        "List all searchable tags with counts, optionally filtered by category. Use to discover available topics and refine search queries.",
      inputSchema: ListTagsArgsSchema.shape,
    },
    async (args) => {
      return handleListTags(store.getAll(), args);
    },
  );

  server.registerTool(
    "list_constraints",
    {
      description:
        "List environment constraints (serverless, enterprise, small-team, etc.) that can filter search results. Use when you know the project's environment and want only relevant cards.",
    },
    async () => {
      return handleListConstraints(store.getAll());
    },
  );

  server.registerTool(
    "get_cards",
    {
      description:
        "Get full content of multiple cards by IDs in one call (max 5). Use instead of calling get_card repeatedly when you need to compare several candidates side by side.",
      inputSchema: GetCardsArgsSchema.shape,
    },
    async (args) => {
      return handleGetCards(store, args);
    },
  );

  server.registerTool(
    "get_related_cards",
    {
      description:
        "Get summaries of cards related to a given card. Use after reading a card to explore connected technology decisions (e.g. auth → OAuth flows → password hashing).",
      inputSchema: GetRelatedCardsArgsSchema.shape,
    },
    async (args) => {
      return handleGetRelatedCards(store, args);
    },
  );

  server.registerTool(
    "report_issue",
    {
      description:
        "Report a quality issue with PocketLantern cards. Use when: a topic has no card ('no_card'), a card has wrong facts ('inaccurate'), info seems outdated ('stale'), or the correct answer differs from the card ('answer_changed').",
      inputSchema: ReportIssueArgsSchema.shape,
    },
    async (args) => {
      return handleReportIssue(args);
    },
  );

  return server;
}
