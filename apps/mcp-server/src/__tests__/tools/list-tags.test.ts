import { describe, it, expect } from "vitest";
import { handleListTags } from "../../tools/list-tags.js";
import { fixtureCards } from "../fixtures.js";

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
