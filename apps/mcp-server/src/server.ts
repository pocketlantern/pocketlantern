#!/usr/bin/env node

/**
 * MCP server binary entry point.
 * Reads env config, initializes store, starts stdio transport.
 * Public API exports live in index.ts — import from @pocketlantern/mcp-server, not this file.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveCardsDir, initializeStore, createServer, type ServerConfig } from "./index.js";

/* v8 ignore start — binary entry, all logic tested via index.ts */
async function main() {
  const config: ServerConfig = {
    cardsDir: resolveCardsDir(),
    apiKey: process.env.POCKETLANTERN_API_KEY,
    apiBaseUrl: process.env.POCKETLANTERN_API_URL,
    graphDir: process.env.POCKETLANTERN_GRAPH_DIR,
  };

  const { store, graphIndex } = await initializeStore(config);
  console.error(`[pocketlantern] ${store.mode} mode — ${store.getAll().length} cards loaded`);

  if (graphIndex) {
    console.error(
      `[pocketlantern] Sidecar graph: ${Object.keys(graphIndex.nodes).length} nodes, ${graphIndex.edges.length} edges`,
    );
  }

  const server = createServer(store, graphIndex);
  await server.connect(new StdioServerTransport());
  console.error("[pocketlantern] MCP server started on stdio");
}

main().catch((error) => {
  console.error("[pocketlantern] Fatal error:", error);
  process.exit(1);
});
/* v8 ignore stop */
