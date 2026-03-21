import { describe, it, expect } from "vitest";
import type { Card } from "@pocketlantern/schema";
import { handleListCategories } from "../../tools/list-categories.js";

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

describe("handleListCategories", () => {
  it("returns categories with correct counts", () => {
    const result = handleListCategories(fixtureCards);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.categories).toBeDefined();

    const catA = parsed.categories.find((c: any) => c.name === "cat-a");
    const catB = parsed.categories.find((c: any) => c.name === "cat-b");

    expect(catA.count).toBe(2);
    expect(catB.count).toBe(1);
  });

  it("sorts categories by count descending", () => {
    const result = handleListCategories(fixtureCards);
    const parsed = JSON.parse(result.content[0].text);

    // cat-a has 2 active, cat-b has 1 active (deprecated + draft excluded)
    expect(parsed.categories[0].name).toBe("cat-a");
    expect(parsed.categories[1].name).toBe("cat-b");
  });

  it("returns empty categories array for empty cards", () => {
    const result = handleListCategories([]);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.categories).toEqual([]);
  });
});
