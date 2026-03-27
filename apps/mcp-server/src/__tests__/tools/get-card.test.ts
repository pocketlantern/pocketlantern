import { describe, it, expect } from "vitest";
import { LocalCardStore } from "../../card-store.js";
import { handleGetCard } from "../../tools/get-card.js";
import { fixtureCards } from "../fixtures.js";

const store = new LocalCardStore(fixtureCards);

describe("handleGetCard", () => {
  it("returns full card JSON when card exists", () => {
    const result = handleGetCard(store, { id: "cat-a/card-1" });

    expect(result).not.toHaveProperty("isError");
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.card).toBeDefined();
    expect(parsed.card.id).toBe("cat-a/card-1");
    expect(parsed.card.title).toBe("Card One");
    expect(parsed.card.candidates).toHaveLength(2);
  });

  it("returns isError=true with structured error for non-existent card", () => {
    const result = handleGetCard(store, { id: "nonexistent/card" });

    expect(result).toHaveProperty("isError", true);
    const error = JSON.parse(result.content[0].text);
    expect(error.error_type).toBe("card_not_found");
    expect(error.card_id).toBe("nonexistent/card");
    expect(error.message).toBeDefined();
  });
});
