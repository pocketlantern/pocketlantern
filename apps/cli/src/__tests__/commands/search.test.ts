import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@pocketlantern/mcp-server/loader", () => ({
  loadCards: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server/search", () => ({
  searchCardsWithQuality: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server", () => ({
  resolveCardsDir: vi.fn(() => "/resolved/cards"),
}));

import { loadCards } from "@pocketlantern/mcp-server/loader";
import { searchCardsWithQuality } from "@pocketlantern/mcp-server/search";
import { runSearch } from "../../commands/search.js";

const mockLoadCards = vi.mocked(loadCards);
const mockSearch = vi.mocked(searchCardsWithQuality);

describe("runSearch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    mockLoadCards.mockResolvedValue([]);
  });

  it("prints zero-result message with suggestions when no results", async () => {
    mockSearch.mockReturnValue({ results: [], weak: false });

    await runSearch("test query");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("No matching decision cards"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("card request"));
  });

  it("prints each card's id, title, problem, and tags when results found", async () => {
    const card = {
      id: "test-card",
      title: "Test Title",
      problem: "Test Problem",
      tags: ["tag1", "tag2"],
      constraints: [],
    };
    mockSearch.mockReturnValue({ results: [card] as any, weak: false });

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
    mockSearch.mockReturnValue({ results: [card] as any, weak: false });

    await runSearch("test");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("constraints: constraint1, constraint2"),
    );
  });

  it("shows 'closest matches' prefix and request link for weak results", async () => {
    const card = {
      id: "test-card",
      title: "Test Title",
      problem: "Test Problem",
      tags: ["tag1"],
      constraints: [],
    };
    mockSearch.mockReturnValue({ results: [card] as any, weak: true });

    await runSearch("test");

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Closest matches"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("may not be exactly"));
  });
});
