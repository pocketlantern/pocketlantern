import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalCardStore } from "../../card-store.js";
import { handleSearchCards } from "../../tools/search-cards.js";
import type { GraphIndex } from "../../graph-loader.js";
import { fixtureCards } from "../fixtures.js";

vi.mock("../../pro-catalog.js", () => ({
  loadProCatalog: vi.fn(() => null),
  searchProCatalog: vi.fn(() => null),
  resetCatalogCache: vi.fn(),
}));

import { loadProCatalog, searchProCatalog } from "../../pro-catalog.js";

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

  it("returns no_results_filtered hint with constraints filter", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
      constraints: ["compliance"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint.type).toBe("no_results_filtered");
    expect(parsed.hint.filters_used).toContain("constraints");
  });

  it("returns no_results_filtered hint with tags filter", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
      tags: ["nonexistent-tag"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint.type).toBe("no_results_filtered");
    expect(parsed.hint.filters_used).toContain("tags");
  });

  it("returns no_results_filtered hint with both constraints and tags", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
      constraints: ["compliance"],
      tags: ["nonexistent-tag"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint.type).toBe("no_results_filtered");
    expect(parsed.hint.filters_used).toEqual(["constraints", "tags"]);
  });

  it("returns no_results hint when no filters used", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent topic xyz",
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toEqual([]);
    expect(parsed.hint.type).toBe("no_results");
    expect(parsed.hint.filters_used).toEqual([]);
    expect(parsed.hint.message).toBeDefined();
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
    expect(parsed.blocker_note).toBeDefined();
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
