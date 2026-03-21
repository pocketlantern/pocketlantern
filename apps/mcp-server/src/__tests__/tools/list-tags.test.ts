import { describe, it, expect } from "vitest";
import type { Card } from "@pocketlantern/schema";
import { handleListTags } from "../../tools/list-tags.js";

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

describe("handleListTags", () => {
  it("returns all tags with correct counts", () => {
    const result = handleListTags(fixtureCards, {});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.tags).toBeDefined();

    const tagMap = new Map(parsed.tags.map((t: any) => [t.name, t.count]));
    // alpha: card-1 only (card-4 is deprecated)
    expect(tagMap.get("alpha")).toBe(1);
    // beta: card-1, card-2 = 2
    expect(tagMap.get("beta")).toBe(2);
    // gamma: card-2, card-3 = 2
    expect(tagMap.get("gamma")).toBe(2);
    // delta: card-3 only (card-5 is draft)
    expect(tagMap.get("delta")).toBe(1);
  });

  it("filters tags by category when category is provided", () => {
    const result = handleListTags(fixtureCards, { category: "cat-a" });
    const parsed = JSON.parse(result.content[0].text);

    const tagNames = parsed.tags.map((t: any) => t.name);
    // cat-a cards: card-1 (alpha, beta), card-2 (beta, gamma)
    expect(tagNames).toContain("alpha");
    expect(tagNames).toContain("beta");
    expect(tagNames).toContain("gamma");
    // delta only appears in cat-b cards
    expect(tagNames).not.toContain("delta");
  });

  it("returns empty tags for non-existent category", () => {
    const result = handleListTags(fixtureCards, { category: "nonexistent" });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.tags).toEqual([]);
  });

  it("returns all tags when args has no category", () => {
    const result = handleListTags(fixtureCards, {});
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.tags.length).toBe(4);
    const tagNames = parsed.tags.map((t: any) => t.name);
    expect(tagNames).toContain("alpha");
    expect(tagNames).toContain("beta");
    expect(tagNames).toContain("gamma");
    expect(tagNames).toContain("delta");
  });
});
