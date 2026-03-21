import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@pocketlantern/mcp-server/loader", () => ({
  loadCards: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server/search", () => ({
  searchCards: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server", () => ({
  resolveCardsDir: vi.fn(() => "/resolved/cards"),
}));

import { loadCards } from "@pocketlantern/mcp-server/loader";
import { searchCards } from "@pocketlantern/mcp-server/search";
import { runSearch } from "../../commands/search.js";

const mockLoadCards = vi.mocked(loadCards);
const mockSearchCards = vi.mocked(searchCards);

describe("runSearch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockLoadCards.mockResolvedValue([]);
  });

  it("prints 'No cards found' when no results", async () => {
    mockSearchCards.mockReturnValue([]);

    await runSearch("test query");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No cards found"));
  });

  it("prints each card's id, title, problem, and tags when results found", async () => {
    const card = {
      id: "test-card",
      title: "Test Title",
      problem: "Test Problem",
      tags: ["tag1", "tag2"],
      constraints: [],
    };
    mockSearchCards.mockReturnValue([card] as any);

    await runSearch("test");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("test-card"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test Title"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Test Problem"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("tag1, tag2"));
  });

  it("prints constraints line when card has constraints", async () => {
    const card = {
      id: "test-card",
      title: "Test Title",
      problem: "Test Problem",
      tags: ["tag1"],
      constraints: ["constraint1", "constraint2"],
    };
    mockSearchCards.mockReturnValue([card] as any);

    await runSearch("test");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("constraints: constraint1, constraint2"),
    );
  });
});
