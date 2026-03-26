import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Card } from "@pocketlantern/schema";
import { LocalCardStore } from "../../card-store.js";
import { handleSearchCards } from "../../tools/search-cards.js";
import type { GraphIndex } from "../../graph-loader.js";

vi.mock("../../pro-catalog.js", () => ({
  loadProCatalog: vi.fn(() => null),
  searchProCatalog: vi.fn(() => null),
  resetCatalogCache: vi.fn(),
}));

import { loadProCatalog, searchProCatalog } from "../../pro-catalog.js";

const fixtureCards: Card[] = [
  {
    id: "cat-a/card-1",
    title: "Card One",
    problem: "Choosing between X and Y",
    candidates: [
      {
        name: "X",
        summary: "X summary",
        when_to_use: "Small teams",
        tradeoffs: "Simple",
        cautions: "Limited",
      },
      {
        name: "Y",
        summary: "Y summary",
        when_to_use: "Large orgs",
        tradeoffs: "Complex",
        cautions: "Costly",
      },
    ],
    tags: ["alpha", "beta"],
    constraints: ["serverless", "small-team"],
    context: ["web"],
    aliases: ["x-vs-y"],
    related_cards: ["cat-a/card-2"],
    updated: "2026-01-01",
  },
  {
    id: "cat-a/card-2",
    title: "Card Two",
    problem: "Selecting a tool for Z",
    candidates: [
      {
        name: "Z1",
        summary: "Z1 summary",
        when_to_use: "Always",
        tradeoffs: "None",
        cautions: "None",
      },
    ],
    tags: ["beta", "gamma"],
    constraints: ["enterprise", "high-scale"],
    related_cards: ["cat-a/card-1", "cat-b/card-3"],
    updated: "2026-01-01",
  },
  {
    id: "cat-b/card-3",
    title: "Card Three",
    problem: "Handling real-time data",
    candidates: [
      {
        name: "RT1",
        summary: "RT1 summary",
        when_to_use: "Real-time apps",
        tradeoffs: "Complexity",
        cautions: "Scale",
      },
    ],
    tags: ["gamma", "delta"],
    constraints: ["real-time", "serverless"],
    related_cards: ["cat-a/card-2"],
    updated: "2026-01-01",
  },
  {
    id: "cat-b/card-4",
    title: "Deprecated Card",
    problem: "Old approach to something",
    candidates: [
      {
        name: "Old",
        summary: "Old summary",
        when_to_use: "Never",
        tradeoffs: "All",
        cautions: "Deprecated",
      },
    ],
    tags: ["alpha"],
    status: "deprecated" as const,
    updated: "2025-01-01",
  },
  {
    id: "cat-b/card-5",
    title: "Draft Card",
    problem: "Work in progress",
    candidates: [
      {
        name: "WIP",
        summary: "WIP summary",
        when_to_use: "TBD",
        tradeoffs: "TBD",
        cautions: "TBD",
      },
    ],
    tags: ["delta"],
    status: "draft" as const,
    updated: "2026-01-01",
  },
];

const store = new LocalCardStore(fixtureCards);

describe("handleSearchCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cards array in JSON when results are found", async () => {
    const result = await handleSearchCards(store, { query: "real-time data" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toBeDefined();
    expect(parsed.cards.length).toBeGreaterThan(0);
    expect(parsed.cards[0]).toHaveProperty("id");
    expect(parsed.cards[0]).toHaveProperty("title");
  });

  it("includes 'try removing constraints' hint when no results with constraints", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
      constraints: ["compliance"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint).toContain("try removing constraints");
  });

  it("includes 'try removing tag filters' hint when no results with tags", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
      tags: ["nonexistent-tag"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint).toContain("try removing tag filters");
  });

  it("includes both hints when no results with constraints and tags", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
      constraints: ["compliance"],
      tags: ["nonexistent-tag"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint).toContain("try removing constraints");
    expect(parsed.hint).toContain("try removing tag filters");
  });

  it("only includes 'use list_categories' hint when no results without filters", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint).toContain("list_categories");
    expect(parsed.hint).not.toContain("try removing constraints");
    expect(parsed.hint).not.toContain("try removing tag filters");
  });
});

// ---------------------------------------------------------------------------
// Blocker augmentation
// ---------------------------------------------------------------------------
describe("handleSearchCards — blocker augmentation", () => {
  const graphIndex: GraphIndex = {
    built: "2026-03-18",
    nodes: {
      "runtime/node-20": { type: "runtime", id: "runtime/node-20", name: "Node.js 20" },
    },
    edges: [
      {
        type: "eol_date",
        from: "runtime/node-20",
        to: null,
        source_card: "cat-b/card-3",
        date: "2026-04",
        successor: "runtime/node-24",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes blockers by default when graphIndex is provided", async () => {
    const result = await handleSearchCards(store, { query: "real-time data" }, graphIndex);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.blockers).toBeDefined();
    expect(parsed.blockers.length).toBeGreaterThan(0);
    expect(parsed.blockers[0].type).toBe("eol_date");
    expect(parsed.blockers[0].summary).toContain("EOL");
    expect(parsed.blocker_note).toContain("Source-linked blocker warnings");
  });

  it("omits blockers when include_blockers is false", async () => {
    const result = await handleSearchCards(
      store,
      { query: "real-time data", include_blockers: false },
      graphIndex,
    );
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.blockers).toBeUndefined();
    expect(parsed.blocker_note).toBeUndefined();
  });

  it("omits blockers when graphIndex is null", async () => {
    const result = await handleSearchCards(store, { query: "real-time data" }, null);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.blockers).toBeUndefined();
  });

  it("omits blockers when graphIndex is undefined", async () => {
    const result = await handleSearchCards(store, { query: "real-time data" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.blockers).toBeUndefined();
  });

  it("omits blocker_note when no blockers match result cards", async () => {
    const noMatchGraph: GraphIndex = {
      built: "2026-03-18",
      nodes: {},
      edges: [
        { type: "eol_date", from: "runtime/python", to: null, source_card: "other/unrelated" },
      ],
    };
    const result = await handleSearchCards(store, { query: "real-time data" }, noMatchGraph);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.blockers).toBeUndefined();
    expect(parsed.blocker_note).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pro hint integration
// ---------------------------------------------------------------------------
describe("handleSearchCards — pro hint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call loadProCatalog when store is local mode", async () => {
    await handleSearchCards(store, { query: "real-time data" });
    expect(loadProCatalog).not.toHaveBeenCalled();
  });

  it("shows pro_hint in empty results when Pro catalog matches", async () => {
    const proStore = { mode: "pro" as const, getAll: () => fixtureCards };
    vi.mocked(loadProCatalog).mockResolvedValue({
      version: 1,
      built: "2026-03-20",
      count: 1,
      entries: [],
    });
    vi.mocked(searchProCatalog).mockReturnValue({
      matched_count: 2,
      message: "2 blockers available",
      url: "https://pocketlantern.dev",
    });

    const result = await handleSearchCards(proStore as any, { query: "nonexistent topic xyz" });
    const parsed = JSON.parse(result.content[0].text);

    expect(loadProCatalog).toHaveBeenCalled();
    expect(parsed.pro_hint).toBeDefined();
    expect(parsed.pro_hint.matched_count).toBe(2);
    expect(parsed.hint).toBeUndefined();
  });

  it("falls back to hint when Pro catalog returns no match", async () => {
    const proStore = { mode: "pro" as const, getAll: () => fixtureCards };
    vi.mocked(loadProCatalog).mockResolvedValue({
      version: 1,
      built: "2026-03-20",
      count: 0,
      entries: [],
    });
    vi.mocked(searchProCatalog).mockReturnValue(null);

    const result = await handleSearchCards(proStore as any, { query: "nonexistent topic xyz" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.pro_hint).toBeUndefined();
    expect(parsed.hint).toBeDefined();
  });

  it("includes pro_hint with capped message when results found and Pro matches", async () => {
    const proStore = { mode: "pro" as const, getAll: () => fixtureCards };
    vi.mocked(loadProCatalog).mockResolvedValue({
      version: 1,
      built: "2026-03-20",
      count: 1,
      entries: [],
    });
    vi.mocked(searchProCatalog).mockReturnValue({
      matched_count: 3,
      message: "3 blockers available",
      url: "https://pocketlantern.dev",
    });

    const result = await handleSearchCards(proStore as any, { query: "real-time data" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards.length).toBeGreaterThan(0);
    expect(parsed.pro_hint).toBeDefined();
    expect(parsed.pro_hint.message).toContain("source-linked blocker warnings");
  });
});
