import { describe, it, expect, vi, afterEach } from "vitest";
import { resolve } from "node:path";
import type { Card } from "@pocketlantern/schema";

vi.mock("../loader.js", () => ({
  loadCards: vi.fn().mockResolvedValue([]),
}));

vi.mock("../remote-client.js", () => {
  const RemoteClient = vi.fn(function (this: { fetchAllCards: ReturnType<typeof vi.fn> }) {
    this.fetchAllCards = vi.fn().mockResolvedValue([]);
  });
  return { RemoteClient };
});

vi.mock("../graph-loader.js", () => ({
  loadGraphIndex: vi.fn(async () => null),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  const McpServer = vi.fn(function (this: {
    registerTool: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  }) {
    this.registerTool = vi.fn();
    this.connect = vi.fn().mockResolvedValue(undefined);
  });
  return { McpServer };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  const StdioServerTransport = vi.fn();
  return { StdioServerTransport };
});

vi.mock("../query-log.js", () => ({
  logGetCard: vi.fn(),
  logSearch: vi.fn(),
  logFeedback: vi.fn(),
}));

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveCardsDir, createServer, initializeStore } from "../index.js";
import { LocalCardStore } from "../card-store.js";
import { loadCards } from "../loader.js";
import { RemoteClient } from "../remote-client.js";
import { loadGraphIndex } from "../graph-loader.js";

const mockLoadCards = vi.mocked(loadCards);
const mockLoadGraphIndex = vi.mocked(loadGraphIndex);

type ToolCall = [string, Record<string, unknown>, (...args: never[]) => Promise<unknown>];

function getToolHandler(server: McpServer, toolName: string) {
  const calls = (server as unknown as { registerTool: ReturnType<typeof vi.fn> }).registerTool.mock
    .calls as ToolCall[];
  const call = calls.find(([name]) => name === toolName);
  return call![2] as (args?: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;
}

const fixtureCards: Card[] = [
  {
    id: "test/card-1",
    title: "Test Card",
    problem: "Test problem",
    candidates: [{ name: "A", summary: "A summary", when_to_use: "Always" }],
    tags: ["test"],
    updated: "2026-01-01",
  },
];

describe("resolveCardsDir", () => {
  const originalEnv = process.env.POCKETLANTERN_CARDS_DIR;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.POCKETLANTERN_CARDS_DIR;
    } else {
      process.env.POCKETLANTERN_CARDS_DIR = originalEnv;
    }
  });

  it("uses override when provided", () => {
    process.env.POCKETLANTERN_CARDS_DIR = "/should/be/ignored";
    const result = resolveCardsDir("/tmp/override");

    expect(result).toBe(resolve("/tmp/override"));
  });

  it("returns resolved env path when POCKETLANTERN_CARDS_DIR is set", () => {
    process.env.POCKETLANTERN_CARDS_DIR = "/tmp/custom-cards";
    const result = resolveCardsDir();

    expect(result).toBe(resolve("/tmp/custom-cards"));
  });

  it("returns default path when no override and no env var", () => {
    delete process.env.POCKETLANTERN_CARDS_DIR;
    const result = resolveCardsDir();

    expect(result).toContain("knowledge");
    expect(result).toContain("cards");
    expect(result).toBe(resolve(result));
  });
});

describe("createServer", () => {
  it("returns server with 8 tools registered", () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);

    expect(server).toBeDefined();
    expect(server.registerTool).toHaveBeenCalledTimes(8);
  });

  it("search_cards callback delegates to handler", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "search_cards");

    const result = await handler({ query: "test" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cards).toBeDefined();
  });

  it("get_card callback calls logGetCard on success", async () => {
    const { logGetCard: mockLogGetCard } = await import("../query-log.js");
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "get_card");

    await handler({ id: "test/card-1" });
    expect(mockLogGetCard).toHaveBeenCalledWith("test/card-1", true);
  });

  it("get_card callback calls logGetCard on not found", async () => {
    const { logGetCard: mockLogGetCard } = await import("../query-log.js");
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "get_card");

    await handler({ id: "nonexistent/card" });
    expect(mockLogGetCard).toHaveBeenCalledWith("nonexistent/card", false);
  });

  it("list_categories callback returns category data", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "list_categories");

    const result = await handler();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.categories).toBeDefined();
  });

  it("get_cards callback handles multiple ids", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "get_cards");

    const result = await handler({ ids: ["test/card-1"] });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cards).toBeDefined();
  });

  it("list_tags callback returns tag data", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "list_tags");

    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.tags).toBeDefined();
  });

  it("list_constraints callback returns constraint data", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "list_constraints");

    const result = await handler();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.constraints).toBeDefined();
  });

  it("get_related_cards callback returns related cards", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "get_related_cards");

    const result = await handler({ id: "test/card-1" });
    expect(result.content[0].text).toBeDefined();
  });

  it("report_issue callback returns confirmation", async () => {
    const store = new LocalCardStore(fixtureCards);
    const server = createServer(store, null);
    const handler = getToolHandler(server, "report_issue");

    const result = await handler({ issue_type: "no_card", query: "test" });
    expect(result.content[0].text).toBeDefined();
  });
});

describe("initializeStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates local-only store when no API key", async () => {
    mockLoadCards.mockResolvedValue(fixtureCards);
    mockLoadGraphIndex.mockResolvedValue(null);

    const { store, graphIndex } = await initializeStore({ cardsDir: "/tmp/cards" });

    expect(store.mode).toBe("local");
    expect(store.getAll()).toHaveLength(1);
    expect(graphIndex).toBeNull();
  });

  it("creates merged store when API key and remote returns cards", async () => {
    mockLoadCards.mockResolvedValue(fixtureCards);
    mockLoadGraphIndex.mockResolvedValue(null);

    const remoteCard: Card = {
      id: "remote/card-1",
      title: "Remote Card",
      problem: "Remote problem",
      candidates: [{ name: "B", summary: "B summary", when_to_use: "Sometimes" }],
      tags: ["remote"],
      updated: "2026-01-01",
    };

    vi.mocked(RemoteClient).mockImplementation(function (this: { fetchAllCards: unknown }) {
      this.fetchAllCards = vi.fn().mockResolvedValue([remoteCard]);
    } as unknown as () => RemoteClient);

    const { store } = await initializeStore({
      cardsDir: "/tmp/cards",
      apiKey: "test-key",
    });

    expect(store.mode).toBe("pro");
    expect(store.getAll()).toHaveLength(2);
  });

  it("falls back to local when remote returns empty", async () => {
    mockLoadCards.mockResolvedValue(fixtureCards);
    mockLoadGraphIndex.mockResolvedValue(null);

    vi.mocked(RemoteClient).mockImplementation(function (this: { fetchAllCards: unknown }) {
      this.fetchAllCards = vi.fn().mockResolvedValue([]);
    } as unknown as () => RemoteClient);

    const { store } = await initializeStore({
      cardsDir: "/tmp/cards",
      apiKey: "test-key",
    });

    expect(store.mode).toBe("local");
    expect(store.getAll()).toHaveLength(1);
  });

  it("passes graphDir to loadGraphIndex", async () => {
    mockLoadCards.mockResolvedValue(fixtureCards);
    mockLoadGraphIndex.mockResolvedValue(null);

    await initializeStore({ cardsDir: "/tmp/cards", graphDir: "/tmp/graph" });

    expect(mockLoadGraphIndex).toHaveBeenCalledWith("/tmp/graph");
  });
});
