import { describe, it, expect } from "vitest";
import { LocalCardStore } from "../../card-store.js";
import { handleGetCards, GetCardsArgsSchema } from "../../tools/get-cards.js";
import { makeCard } from "../fixtures.js";

const fixtureCards = [
  makeCard("cat-a/card-1", {
    title: "Card One",
    problem: "Choosing between X and Y",
    tags: ["alpha"],
  }),
  makeCard("cat-a/card-2", {
    title: "Card Two",
    problem: "Selecting a tool for Z",
    tags: ["beta"],
  }),
  makeCard("cat-b/card-3", {
    title: "Card Three",
    problem: "Handling real-time data",
    tags: ["gamma"],
  }),
];

const store = new LocalCardStore(fixtureCards);

describe("handleGetCards", () => {
  it("returns multiple cards by IDs", () => {
    const result = handleGetCards(store, {
      ids: ["cat-a/card-1", "cat-b/card-3"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0].id).toBe("cat-a/card-1");
    expect(parsed.cards[1].id).toBe("cat-b/card-3");
    expect(parsed.not_found_ids).toBeUndefined();
  });

  it("returns partial success with not_found_ids", () => {
    const result = handleGetCards(store, {
      ids: ["cat-a/card-1", "nonexistent/card", "cat-a/card-2"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toHaveLength(2);
    expect(parsed.cards[0].id).toBe("cat-a/card-1");
    expect(parsed.cards[1].id).toBe("cat-a/card-2");
    expect(parsed.not_found_ids).toEqual(["nonexistent/card"]);
  });

  it("returns all not_found when no IDs match", () => {
    const result = handleGetCards(store, {
      ids: ["nope/one", "nope/two"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toHaveLength(0);
    expect(parsed.not_found_ids).toEqual(["nope/one", "nope/two"]);
  });

  it("returns single card when one ID provided", () => {
    const result = handleGetCards(store, {
      ids: ["cat-a/card-2"],
    });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].title).toBe("Card Two");
    expect(parsed.not_found_ids).toBeUndefined();
  });

  it("accepts exactly 5 IDs (max boundary)", () => {
    const result = GetCardsArgsSchema.safeParse({
      ids: ["a/1", "a/2", "a/3", "a/4", "a/5"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 5 IDs", () => {
    const result = GetCardsArgsSchema.safeParse({
      ids: ["a/1", "a/2", "a/3", "a/4", "a/5", "a/6"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty IDs array", () => {
    const result = GetCardsArgsSchema.safeParse({
      ids: [],
    });
    expect(result.success).toBe(false);
  });
});
