/**
 * Mock API server — serves card files as if they were the Pro hosted retrieval API.
 *
 * Usage:
 *   npx tsx scripts/mock-api.ts --cards /path/to/cards
 *   npx tsx scripts/mock-api.ts --cards /path/to/cards --port 3456
 *
 * Then set:
 *   export POCKETLANTERN_API_KEY=test
 *   export POCKETLANTERN_API_URL=http://localhost:3456
 *
 * MCP server will connect to this mock and operate in Pro mode.
 */

import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadCards } from "@pocketlantern/mcp-server/loader";
import { searchCards } from "@pocketlantern/mcp-server/search";
import type { Card, Constraint } from "@pocketlantern/schema";

const portArg = process.argv.indexOf("--port");
const port = portArg !== -1 ? parseInt(process.argv[portArg + 1] ?? "3456") : 3456;

const cardsArg = process.argv.indexOf("--cards");
if (cardsArg === -1 || !process.argv[cardsArg + 1]) {
  console.error("Usage: npx tsx scripts/mock-api.ts --cards /path/to/cards");
  process.exit(1);
}
const cardsDir = resolve(process.argv[cardsArg + 1]);

async function main() {
  if (!existsSync(cardsDir)) {
    console.error(`Cards directory not found: ${cardsDir}`);
    console.error("Use --cards /path/to/cards");
    process.exit(1);
  }

  const cards = await loadCards(cardsDir);
  console.log(`Loaded ${cards.length} cards from ${cardsDir}`);

  const catalog = {
    version: 1,
    built: new Date().toISOString(),
    count: cards.length,
    entries: cards
      .filter((c) => (c.status ?? "active") === "active")
      .map((c) => ({
        id: c.id,
        title: c.title,
        tags: c.tags,
        constraints: c.constraints ?? [],
        aliases: c.aliases ?? [],
      })),
  };

  const cardIndex = new Map<string, Card>(cards.map((c) => [c.id, c]));

  const server = createServer((req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing API key" }));
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    res.setHeader("Content-Type", "application/json");

    if (url.pathname === "/cards" && req.method === "GET") {
      res.writeHead(200);
      res.end(JSON.stringify({ cards }));
      return;
    }

    if (url.pathname.startsWith("/card/") && req.method === "GET") {
      const id = decodeURIComponent(url.pathname.slice("/card/".length));
      const card = cardIndex.get(id);
      if (!card) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Card not found: ${id}` }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ card }));
      return;
    }

    if (url.pathname === "/catalog" && req.method === "GET") {
      res.writeHead(200);
      res.end(JSON.stringify(catalog));
      return;
    }

    if (url.pathname === "/search" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        try {
          const { query, constraints, limit } = JSON.parse(body) as {
            query: string;
            constraints?: string[];
            limit?: number;
          };
          const results = searchCards(cards, query, {
            constraints: constraints as Constraint[] | undefined,
            limit,
          });
          res.writeHead(200);
          res.end(JSON.stringify({ cards: results, source: "remote" }));
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid request body" }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, () => {
    console.log(`\nMock Pro API running at http://localhost:${port}`);
    console.log(`\nTo use with MCP server:`);
    console.log(`  export POCKETLANTERN_API_KEY=test`);
    console.log(`  export POCKETLANTERN_API_URL=http://localhost:${port}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /cards          → all cards (${cards.length})`);
    console.log(`  GET  /card/:id       → single card`);
    console.log(`  GET  /catalog        → metadata index (${catalog.count} entries)`);
    console.log(`  POST /search         → search {query, constraints?, limit?}`);
  });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
