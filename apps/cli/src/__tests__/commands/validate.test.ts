import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server/loader", () => ({
  findYamlFiles: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server", () => ({
  resolveCardsDir: vi.fn(() => "/resolved/cards"),
}));

// Mock yaml and schema so we control parsing behavior
vi.mock("yaml", () => ({
  parse: vi.fn((content: string) => JSON.parse(content)),
}));

vi.mock("@pocketlantern/schema", () => ({
  CardSchema: {
    parse: vi.fn((raw: unknown) => raw),
  },
}));

import { readFile } from "node:fs/promises";
import { findYamlFiles } from "@pocketlantern/mcp-server/loader";
import { CardSchema } from "@pocketlantern/schema";
import { runValidate, checkRelatedCards } from "../../commands/validate.js";
import type { Card } from "@pocketlantern/schema";

const mockReadFile = vi.mocked(readFile);
const mockFindYamlFiles = vi.mocked(findYamlFiles);
const mockCardSchemaParse = vi.mocked(CardSchema.parse);

describe("checkRelatedCards", () => {
  it("returns no warnings for valid bidirectional links", () => {
    const cards = [
      { id: "a", related_cards: ["b"] },
      { id: "b", related_cards: ["a"] },
    ] as Card[];

    const warnings = checkRelatedCards(cards);
    expect(warnings).toEqual([]);
  });

  it("warns on non-existent related card reference", () => {
    const cards = [{ id: "a", related_cards: ["nonexistent"] }] as Card[];

    const warnings = checkRelatedCards(cards);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("non-existent");
    expect(warnings[0]).toContain("nonexistent");
  });

  it("warns on self-reference", () => {
    const cards = [{ id: "a", related_cards: ["a"] }] as Card[];

    const warnings = checkRelatedCards(cards);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("references itself");
  });

  it("warns on one-directional link", () => {
    const cards = [
      { id: "a", related_cards: ["b"] },
      { id: "b", related_cards: [] },
    ] as Card[];

    const warnings = checkRelatedCards(cards);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("one-directional");
  });

  it("handles cards without related_cards field", () => {
    const cards = [{ id: "a" }, { id: "b" }] as Card[];

    const warnings = checkRelatedCards(cards);
    expect(warnings).toEqual([]);
  });

  it("handles target card without related_cards field (one-directional)", () => {
    const cards = [{ id: "a", related_cards: ["b"] }, { id: "b" }] as Card[];

    const warnings = checkRelatedCards(cards);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("one-directional");
  });
});

describe("runValidate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockFindYamlFiles.mockResolvedValue([]);
    mockReadFile.mockResolvedValue("{}");
    mockCardSchemaParse.mockImplementation((raw) => raw as Card);
  });

  it("prints message and returns when no files found", async () => {
    mockFindYamlFiles.mockResolvedValue([]);

    await runValidate();

    expect(console.log).toHaveBeenCalledWith("No .yaml files found.");
  });

  it("prints OK for each valid file and shows correct summary", async () => {
    mockFindYamlFiles.mockResolvedValue(["/resolved/cards/a.yaml", "/resolved/cards/b.yaml"]);
    mockReadFile.mockResolvedValue(JSON.stringify({ id: "a", tags: [] }));
    mockCardSchemaParse.mockImplementation(
      (raw) => ({ ...(raw as object), related_cards: [] }) as unknown as Card,
    );

    await runValidate();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("OK"));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("2 valid, 0 invalid, 2 total"),
    );
  });

  it("prints FAIL for invalid files and calls process.exit(1)", async () => {
    mockFindYamlFiles.mockResolvedValue(["/resolved/cards/good.yaml", "/resolved/cards/bad.yaml"]);

    let callCount = 0;
    mockReadFile.mockResolvedValue(JSON.stringify({ id: "test" }));
    mockCardSchemaParse.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        throw new Error("Invalid schema");
      }
      return { id: "test", related_cards: [] } as unknown as Card;
    });

    await runValidate();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("1 valid, 1 invalid, 2 total"),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("prints FAIL with error details for invalid files", async () => {
    mockFindYamlFiles.mockResolvedValue(["/resolved/cards/bad.yaml"]);
    mockReadFile.mockResolvedValue(JSON.stringify({ id: "test" }));
    mockCardSchemaParse.mockImplementation(() => {
      throw new Error("missing required field: tags");
    });

    await runValidate();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("missing required field: tags"),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("handles non-Error throw during validation", async () => {
    mockFindYamlFiles.mockResolvedValue(["/resolved/cards/bad.yaml"]);
    mockReadFile.mockResolvedValue(JSON.stringify({ id: "test" }));
    mockCardSchemaParse.mockImplementation(() => {
      throw "string error";
    });

    await runValidate();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("string error"));
  });

  it("shows related_cards warnings when found", async () => {
    mockFindYamlFiles.mockResolvedValue(["/resolved/cards/a.yaml"]);
    mockReadFile.mockResolvedValue(JSON.stringify({ id: "a" }));
    mockCardSchemaParse.mockReturnValue({
      id: "a",
      related_cards: ["nonexistent"],
    } as unknown as Card);

    await runValidate();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("related_cards warnings"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
  });
});
