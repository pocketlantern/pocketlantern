import { describe, it, expect } from "vitest";
import { handleListCategories } from "../../tools/list-categories.js";
import { fixtureCards } from "../fixtures.js";

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
