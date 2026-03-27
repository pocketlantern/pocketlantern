import { describe, it, expect } from "vitest";
import { LocalCardStore } from "../card-store.js";
import { handleSearchCards } from "../tools/search-cards.js";
import { handleGetCard } from "../tools/get-card.js";
import { handleGetRelatedCards } from "../tools/get-related-cards.js";
import { handleListCategories } from "../tools/list-categories.js";
import { handleListTags } from "../tools/list-tags.js";
import { handleListConstraints } from "../tools/list-constraints.js";
import { handleGetCards } from "../tools/get-cards.js";
import { fixtureCards } from "./fixtures.js";

const store = new LocalCardStore(fixtureCards);

function parseResult(result: { content: { type: string; text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

describe("Scenario 1: Full exploration flow", () => {
  it("list_categories returns cat-a and cat-b", () => {
    const result = handleListCategories(fixtureCards);
    const data = parseResult(result);

    const names = data.categories.map((c: any) => c.name);
    expect(names).toContain("cat-a");
    expect(names).toContain("cat-b");
  });

  it("list_tags with category filter returns tags for cat-a", () => {
    const result = handleListTags(fixtureCards, { category: "cat-a" });
    const data = parseResult(result);

    const names = data.tags.map((t: any) => t.name);
    expect(names).toContain("alpha");
    expect(names).toContain("beta");
  });

  it("list_constraints returns all 10 constraints", () => {
    const result = handleListConstraints(fixtureCards);
    const data = parseResult(result);

    expect(data.constraints).toHaveLength(10);
    const names = data.constraints.map((c: any) => c.name);
    expect(names).toContain("serverless");
    expect(names).toContain("high-scale");
    expect(names).toContain("compliance");
  });

  it("search_cards finds card-1 when querying 'choosing X Y'", async () => {
    const result = await handleSearchCards(store, { query: "choosing X Y" });
    const data = parseResult(result);

    const ids = data.cards.map((c: any) => c.id);
    expect(ids).toContain("cat-a/card-1");
  });

  it("get_card returns full card with 2 candidates", () => {
    const result = handleGetCard(store, { id: "cat-a/card-1" });
    const data = parseResult(result);

    expect(data.card.id).toBe("cat-a/card-1");
    expect(data.card.candidates).toHaveLength(2);
    expect(data.card.candidates[0].name).toBe("X");
    expect(data.card.candidates[1].name).toBe("Y");
  });

  it("get_related_cards returns card-2 for card-1", () => {
    const result = handleGetRelatedCards(store, { id: "cat-a/card-1" });
    const data = parseResult(result);

    const relatedIds = data.related.map((r: any) => r.id);
    expect(relatedIds).toContain("cat-a/card-2");
  });
});

describe("Scenario 2: Search filter narrowing", () => {
  it("search_cards with broad query returns multiple results", async () => {
    const result = await handleSearchCards(store, { query: "card" });
    const data = parseResult(result);

    const ids = data.cards.map((c: any) => c.id);
    expect(ids).toContain("cat-a/card-1");
    expect(ids).toContain("cat-a/card-2");
    expect(ids).toContain("cat-b/card-3");
  });

  it("search_cards with constraints filter narrows results", async () => {
    const result = await handleSearchCards(store, {
      query: "card",
      constraints: ["serverless"],
    });
    const data = parseResult(result);

    const ids = data.cards.map((c: any) => c.id);
    expect(ids).toContain("cat-a/card-1");
    expect(ids).toContain("cat-b/card-3");
    expect(ids).not.toContain("cat-a/card-2");
  });

  it("search_cards with constraints and tags filters to single result", async () => {
    const result = await handleSearchCards(store, {
      query: "card",
      constraints: ["serverless"],
      tags: ["alpha"],
    });
    const data = parseResult(result);

    const ids = data.cards.map((c: any) => c.id);
    expect(ids).toContain("cat-a/card-1");
    expect(ids).not.toContain("cat-b/card-3");
  });
});

describe("Scenario 3: Related cards chaining", () => {
  it("get_card for card-2 shows related_cards", () => {
    const result = handleGetCard(store, { id: "cat-a/card-2" });
    const data = parseResult(result);

    expect(data.card.related_cards).toEqual(["cat-a/card-1", "cat-b/card-3"]);
  });

  it("get_related_cards for card-2 returns card-1 and card-3 summaries", () => {
    const result = handleGetRelatedCards(store, { id: "cat-a/card-2" });
    const data = parseResult(result);

    expect(data.source).toBe("cat-a/card-2");
    const relatedIds = data.related.map((r: any) => r.id);
    expect(relatedIds).toContain("cat-a/card-1");
    expect(relatedIds).toContain("cat-b/card-3");

    // Each related card should have summary fields
    for (const related of data.related) {
      expect(related).toHaveProperty("id");
      expect(related).toHaveProperty("title");
      expect(related).toHaveProperty("problem");
      expect(related).toHaveProperty("tags");
    }
  });

  it("can chain from related card back to get_card", () => {
    const relatedResult = handleGetRelatedCards(store, { id: "cat-a/card-2" });
    const relatedData = parseResult(relatedResult);

    const firstRelatedId = relatedData.related[0].id;
    const cardResult = handleGetCard(store, { id: firstRelatedId });
    const cardData = parseResult(cardResult);

    expect(cardData.card.id).toBe(firstRelatedId);
    expect(cardData.card).toHaveProperty("candidates");
  });
});

describe("Scenario 4: Error recovery flow", () => {
  it("search with no results and constraints returns structured hint", async () => {
    const result = await handleSearchCards(store, {
      query: "nonexistent",
      constraints: ["serverless"],
    });
    const data = parseResult(result);

    expect(data.cards).toEqual([]);
    expect(data.hint.type).toBe("no_results_filtered");
    expect(data.hint.filters_used).toContain("constraints");
  });

  it("search with no results returns no_results hint type", async () => {
    const result = await handleSearchCards(store, { query: "nonexistent" });
    const data = parseResult(result);

    expect(data.cards).toEqual([]);
    expect(data.hint.type).toBe("no_results");
    expect(data.hint.message).toBeDefined();
  });

  it("list_categories returns valid categories after failed search", () => {
    const result = handleListCategories(fixtureCards);
    const data = parseResult(result);

    expect(data.categories.length).toBeGreaterThan(0);
    const names = data.categories.map((c: any) => c.name);
    expect(names).toContain("cat-a");
    expect(names).toContain("cat-b");
  });
});

describe("Scenario 5: Batch card retrieval", () => {
  it("search then get_cards fetches multiple results in one call", async () => {
    const searchResult = await handleSearchCards(store, { query: "card" });
    const searchData = parseResult(searchResult);
    const ids = searchData.cards.slice(0, 3).map((c: any) => c.id);

    const batchResult = handleGetCards(store, { ids });
    const batchData = parseResult(batchResult);

    expect(batchData.cards).toHaveLength(ids.length);
    for (const card of batchData.cards) {
      expect(card).toHaveProperty("candidates");
      expect(card).toHaveProperty("tags");
    }
    expect(batchData.not_found_ids).toBeUndefined();
  });

  it("get_cards handles partial success gracefully", () => {
    const result = handleGetCards(store, {
      ids: ["cat-a/card-1", "nonexistent/card", "cat-b/card-3"],
    });
    const data = parseResult(result);

    expect(data.cards).toHaveLength(2);
    expect(data.not_found_ids).toEqual(["nonexistent/card"]);
  });
});

describe("Scenario 6: Deprecated/draft filtering", () => {
  it("search_cards excludes deprecated and draft cards by default", async () => {
    const result = await handleSearchCards(store, { query: "card" });
    const data = parseResult(result);

    const ids = data.cards.map((c: any) => c.id);
    expect(ids).not.toContain("cat-b/card-4");
    expect(ids).not.toContain("cat-b/card-5");
  });

  it("search_cards with include_deprecated includes deprecated but still excludes draft", async () => {
    const result = await handleSearchCards(store, {
      query: "card",
      include_deprecated: true,
    });
    const data = parseResult(result);

    const ids = data.cards.map((c: any) => c.id);
    expect(ids).toContain("cat-b/card-4");
    expect(ids).not.toContain("cat-b/card-5");
  });
});
