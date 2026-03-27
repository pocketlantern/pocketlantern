import { describe, it, expect } from "vitest";
import type { Card } from "@pocketlantern/schema";
import { LocalCardStore } from "../../card-store.js";
import { handleGetRelatedCards } from "../../tools/get-related-cards.js";
import { fixtureCards } from "../fixtures.js";

const store = new LocalCardStore(fixtureCards);

describe("handleGetRelatedCards", () => {
  it("returns isError=true when source card is not found", () => {
    const result = handleGetRelatedCards(store, { id: "nonexistent/card" });

    expect(result).toHaveProperty("isError", true);
    expect(result.content[0].text).toContain("Card not found");
  });

  it("returns summaries of related cards with id, title, problem, tags", () => {
    const result = handleGetRelatedCards(store, { id: "cat-a/card-2" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.source).toBe("cat-a/card-2");
    expect(parsed.related).toHaveLength(2);

    const relatedIds = parsed.related.map((r: any) => r.id);
    expect(relatedIds).toContain("cat-a/card-1");
    expect(relatedIds).toContain("cat-b/card-3");

    for (const r of parsed.related) {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("title");
      expect(r).toHaveProperty("problem");
      expect(r).toHaveProperty("tags");
    }
  });

  it("returns empty related array when source has no related_cards field", () => {
    const cardsWithNoRelated: Card[] = [
      {
        id: "cat-x/card-solo",
        title: "Solo Card",
        problem: "Standalone problem",
        candidates: [
          {
            name: "Solo",
            summary: "Solo summary",
            when_to_use: "Always",
            tradeoffs: "None",
            cautions: "None",
          },
        ],
        tags: ["solo"],
        updated: "2026-01-01",
      },
    ];
    const result = handleGetRelatedCards(new LocalCardStore(cardsWithNoRelated), {
      id: "cat-x/card-solo",
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.related).toEqual([]);
  });

  it("filters out non-existent related card references", () => {
    const result = handleGetRelatedCards(store, { id: "cat-b/card-3" });
    const parsed = JSON.parse(result.content[0].text);

    // card-3 has related_cards: ["cat-a/card-2"] which exists
    expect(parsed.related).toHaveLength(1);
    expect(parsed.related[0].id).toBe("cat-a/card-2");
  });
});
