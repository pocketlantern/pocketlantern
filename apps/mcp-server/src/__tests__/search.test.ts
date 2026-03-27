import { describe, it, expect } from "vitest";
import { searchCards, scoreCard, tokenize } from "../search.js";
import { fixtureCards, makeCard } from "./fixtures.js";

describe("searchCards", () => {
  // ---------------------------------------------------------------------------
  // Tokenize (indirect)
  // ---------------------------------------------------------------------------
  describe("tokenize behavior (indirect)", () => {
    it("returns empty results for an empty query", () => {
      const results = searchCards(fixtureCards, "");
      expect(results).toEqual([]);
    });

    it("returns empty results for a query containing only stopwords", () => {
      const results = searchCards(fixtureCards, "how to is the");
      expect(results).toEqual([]);
    });

    it("filters stopwords but matches on real words", () => {
      const results = searchCards(fixtureCards, "how to handle data");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-b/card-3");
    });

    it("strips punctuation from query tokens", () => {
      const results = searchCards(fixtureCards, "real-time? data,");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-b/card-3");
    });
  });

  // ---------------------------------------------------------------------------
  // Scoring (indirect — verify ordering)
  // ---------------------------------------------------------------------------
  describe("scoring and ordering", () => {
    it("ranks title matches highest", () => {
      // "Card One" matches title of card-1 with weight 3 per keyword
      const results = searchCards(fixtureCards, "Card One");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-a/card-1");
    });

    it("ranks problem matches high", () => {
      // "Choosing" appears only in card-1's problem
      const results = searchCards(fixtureCards, "Choosing");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-a/card-1");
    });

    it("ranks exact tag matches high", () => {
      // "alpha" is an exact tag on card-1 (and card-4 which is deprecated)
      const results = searchCards(fixtureCards, "alpha");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-a/card-1");
    });

    it("scores partial tag matches lower than exact", () => {
      const card = fixtureCards[0]; // has tag "alpha"
      const exactScore = scoreCard(card, tokenize("alpha"));
      const partialScore = scoreCard(card, tokenize("alph"));

      expect(exactScore).toBeGreaterThan(partialScore);
    });

    it("finds cards by alias match", () => {
      const results = searchCards(fixtureCards, "x-vs-y");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-a/card-1");
    });

    it("finds cards by candidate name match", () => {
      const results = searchCards(fixtureCards, "Z1");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-a/card-2");
    });

    it("finds cards by context match", () => {
      const results = searchCards(fixtureCards, "web");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.id === "cat-a/card-1")).toBe(true);
    });

    it("finds cards by constraint match", () => {
      const results = searchCards(fixtureCards, "serverless");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ids = results.map((r) => r.id);
      expect(ids).toContain("cat-a/card-1");
      expect(ids).toContain("cat-b/card-3");
    });
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------
  describe("filtering", () => {
    it("excludes deprecated cards by default", () => {
      // "Old" appears in card-4 (deprecated) candidate name and problem
      const results = searchCards(fixtureCards, "Old approach");
      const ids = results.map((r) => r.id);
      expect(ids).not.toContain("cat-b/card-4");
    });

    it("includes deprecated cards when includeDeprecated is true", () => {
      const results = searchCards(fixtureCards, "Old approach", {
        includeDeprecated: true,
      });
      const ids = results.map((r) => r.id);
      expect(ids).toContain("cat-b/card-4");
    });

    it("always excludes draft cards even with includeDeprecated", () => {
      // "WIP" appears only in card-5 (draft)
      const results = searchCards(fixtureCards, "WIP", {
        includeDeprecated: true,
      });
      const ids = results.map((r) => r.id);
      expect(ids).not.toContain("cat-b/card-5");
    });

    it("filters by constraints with AND logic", () => {
      // Only card-1 has both "serverless" and "small-team"
      const results = searchCards(fixtureCards, "Card", {
        constraints: ["serverless", "small-team"],
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("cat-a/card-1");
    });

    it("filters by tags", () => {
      // "gamma" tag is on card-2 and card-3
      const results = searchCards(fixtureCards, "Card", {
        tags: ["gamma"],
      });
      const ids = results.map((r) => r.id);
      expect(ids).toContain("cat-a/card-2");
      expect(ids).toContain("cat-b/card-3");
      expect(ids).not.toContain("cat-a/card-1");
    });

    it("applies combined constraints and tags filter", () => {
      // constraints: ["serverless"] matches card-1 and card-3
      // tags: ["gamma"] matches card-2 and card-3
      // intersection: card-3
      const results = searchCards(fixtureCards, "Card", {
        constraints: ["serverless"],
        tags: ["gamma"],
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("cat-b/card-3");
    });

    it("returns empty when constraints filter eliminates all cards", () => {
      const results = searchCards(fixtureCards, "Card", {
        constraints: ["compliance"],
      });
      expect(results).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Other
  // ---------------------------------------------------------------------------
  describe("limit and output shape", () => {
    it("defaults to a limit of 5", () => {
      // All active non-draft cards match "Card" in title (3 cards), so limit won't clip here
      // but we verify the default doesn't crash and returns at most 5
      const results = searchCards(fixtureCards, "Card");
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("respects a custom limit", () => {
      const results = searchCards(fixtureCards, "Card", { limit: 1 });
      expect(results.length).toBe(1);
    });

    it("includes constraints field in output", () => {
      const results = searchCards(fixtureCards, "Card One");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("constraints");
      expect(results[0].constraints).toEqual(["serverless", "small-team"]);
    });

    it("returns correct SearchResult shape", () => {
      const results = searchCards(fixtureCards, "Card One");
      expect(results[0]).toEqual({
        id: "cat-a/card-1",
        title: "Card One",
        problem: "Choosing between X and Y",
        tags: ["alpha", "beta"],
        constraints: ["serverless", "small-team"],
      });
    });

    it("returns empty constraints array for cards without constraints", () => {
      const cards = [
        makeCard("test/no-constraints", {
          title: "No Constraints Card",
          problem: "Testing missing constraints",
        }),
      ];
      const results = searchCards(cards, "constraints");
      expect(results.length).toBe(1);
      expect(results[0].constraints).toEqual([]);
    });
  });

  describe("case insensitivity", () => {
    it("matches regardless of query case", () => {
      const lower = searchCards(fixtureCards, "card one");
      const upper = searchCards(fixtureCards, "CARD ONE");
      const mixed = searchCards(fixtureCards, "cArD oNe");

      expect(lower.length).toBeGreaterThan(0);
      expect(lower[0].id).toBe("cat-a/card-1");
      expect(upper[0].id).toBe("cat-a/card-1");
      expect(mixed[0].id).toBe("cat-a/card-1");
    });

    it("matches tags case-insensitively in filter", () => {
      const results = searchCards(fixtureCards, "Card", {
        tags: ["GAMMA"],
      });
      const ids = results.map((r) => r.id);
      expect(ids).toContain("cat-a/card-2");
      expect(ids).toContain("cat-b/card-3");
    });
  });

  describe("tier-based scoring", () => {
    it("ranks core cards above foundational cards with same keyword match", () => {
      const tieredCards = [
        makeCard("test/foundational-auth", {
          title: "Auth Strategy",
          problem: "Choosing an auth approach",
          tags: ["auth"],
          tier: "foundational" as const,
        }),
        makeCard("test/core-auth", {
          title: "Auth Vendor Choice",
          problem: "Choosing an auth vendor",
          tags: ["auth"],
        }),
      ];
      const results = searchCards(tieredCards, "auth");
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("test/core-auth");
    });

    it("excludes foundational cards when penalty drops score to zero", () => {
      const tieredCards = [
        makeCard("test/foundational-weak", {
          title: "Something Else",
          problem: "Unrelated problem",
          tags: ["niche"],
          tier: "foundational" as const,
        }),
      ];
      const results = searchCards(tieredCards, "niche");
      expect(results.length).toBe(0);
    });

    it("treats cards without tier as core (no penalty)", () => {
      const results = searchCards(fixtureCards, "alpha");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cat-a/card-1");
    });
  });

  describe("edge cases", () => {
    it("handles whitespace-only query", () => {
      const results = searchCards(fixtureCards, "   ");
      expect(results).toEqual([]);
    });

    it("handles empty card list", () => {
      const results = searchCards([], "test");
      expect(results).toEqual([]);
    });

    it("returns no results when query matches no cards", () => {
      const results = searchCards(fixtureCards, "zzzznonexistent");
      expect(results).toEqual([]);
    });

    it("only returns cards with score > 0", () => {
      const results = searchCards(fixtureCards, "zzzzunique");
      expect(results).toEqual([]);
    });
  });
});

describe("scoreCard (direct)", () => {
  it("title match (weight 3) > problem match (weight 2)", () => {
    const titleCard = makeCard("a/title", { title: "auth", problem: "unrelated" });
    const problemCard = makeCard("a/problem", { title: "unrelated", problem: "auth" });

    const titleScore = scoreCard(titleCard, ["auth"]);
    const problemScore = scoreCard(problemCard, ["auth"]);

    expect(titleScore).toBe(3);
    expect(problemScore).toBe(2);
    expect(titleScore).toBeGreaterThan(problemScore);
  });

  it("exact tag (weight 2) > partial tag (weight 1)", () => {
    const card = makeCard("a/tag", { tags: ["serverless"] });

    const exactScore = scoreCard(card, ["serverless"]);
    const partialScore = scoreCard(card, ["server"]);

    expect(exactScore).toBe(2);
    expect(partialScore).toBe(1);
  });

  it("alias match scores 2", () => {
    const card = makeCard("a/alias", { aliases: ["jwt-auth"] });
    expect(scoreCard(card, ["jwt-auth"])).toBe(2);
  });

  it("candidate name match scores 1", () => {
    const card = makeCard("a/cand", {
      candidates: [{ name: "Redis", summary: "s", when_to_use: "w" }],
    });
    expect(scoreCard(card, ["redis"])).toBe(1);
  });

  it("context match scores 1", () => {
    const card = makeCard("a/ctx", { context: ["kubernetes"] });
    expect(scoreCard(card, ["kubernetes"])).toBe(1);
  });

  it("constraint match scores 2", () => {
    const card = makeCard("a/cst", { constraints: ["serverless"] });
    expect(scoreCard(card, ["serverless"])).toBe(2);
  });

  it("accumulates across multiple keywords", () => {
    const card = makeCard("a/multi", {
      title: "Auth Strategy",
      problem: "Choosing auth for serverless",
      tags: ["auth"],
      constraints: ["serverless"],
    });
    const score = scoreCard(card, ["auth", "serverless"]);
    // "auth": title(3) + problem(2) + exact tag(2) = 7
    // "serverless": problem(2) + constraint(2) = 4
    expect(score).toBe(11);
  });

  it("does not double-count exact and partial tag match for same keyword", () => {
    const card = makeCard("a/tag", { tags: ["serverless"] });
    // "serverless" exact matches → 2 (not 2+1)
    expect(scoreCard(card, ["serverless"])).toBe(2);
  });
});
