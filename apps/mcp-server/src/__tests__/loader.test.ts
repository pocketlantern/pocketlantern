import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { readdir, readFile } from "node:fs/promises";
import { findYamlFiles, loadCards } from "../loader.js";

const mockedReaddir = vi.mocked(readdir);
const mockedReadFile = vi.mocked(readFile);

const VALID_CARD_YAML = `
id: auth/valid-card
title: Valid Card
problem: Some problem
candidates:
  - name: Option A
    summary: A summary
    when_to_use: Always
tags:
  - testing
updated: "2026-01-01"
`;

const INVALID_YAML = "{{invalid yaml";

const BAD_SCHEMA_YAML = `
title: Missing ID
problem: No id field
`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findYamlFiles", () => {
  it("returns only .yaml files, ignores other extensions", async () => {
    mockedReaddir.mockResolvedValueOnce(["valid-card.yaml", "readme.txt", "notes.md"] as any);

    const result = await findYamlFiles("/cards");

    expect(result).toEqual(["/cards/valid-card.yaml"]);
  });

  it("finds files in subdirectories", async () => {
    mockedReaddir.mockResolvedValueOnce([
      "auth/valid-card.yaml",
      "auth/another.yaml",
      "readme.txt",
    ] as any);

    const result = await findYamlFiles("/cards");

    expect(result).toEqual(["/cards/auth/valid-card.yaml", "/cards/auth/another.yaml"]);
    expect(mockedReaddir).toHaveBeenCalledTimes(1);
    expect(mockedReaddir).toHaveBeenCalledWith("/cards", { recursive: true });
  });

  it("returns empty array for empty directory", async () => {
    mockedReaddir.mockResolvedValueOnce([] as any);

    const result = await findYamlFiles("/cards");

    expect(result).toEqual([]);
  });
});

describe("loadCards", () => {
  beforeEach(() => {
    mockedReaddir.mockResolvedValueOnce([
      "auth/valid-card.yaml",
      "auth/invalid.yaml",
      "auth/bad-schema.yaml",
      "readme.txt",
    ] as any);
  });

  it("loads valid YAML files into Card objects", async () => {
    mockedReadFile.mockImplementation(async (path) => {
      const p = String(path);
      if (p.endsWith("valid-card.yaml")) return VALID_CARD_YAML;
      if (p.endsWith("invalid.yaml")) return INVALID_YAML;
      if (p.endsWith("bad-schema.yaml")) return BAD_SCHEMA_YAML;
      throw new Error(`Unexpected file: ${p}`);
    });

    const cards = await loadCards("/cards");

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("auth/valid-card");
    expect(cards[0].title).toBe("Valid Card");
    expect(cards[0].tags).toEqual(["testing"]);
  });

  it("skips invalid YAML (parse error) and continues", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockedReadFile.mockImplementation(async (path) => {
      const p = String(path);
      if (p.endsWith("valid-card.yaml")) return VALID_CARD_YAML;
      if (p.endsWith("invalid.yaml")) return INVALID_YAML;
      if (p.endsWith("bad-schema.yaml")) return BAD_SCHEMA_YAML;
      throw new Error(`Unexpected file: ${p}`);
    });

    const cards = await loadCards("/cards");

    expect(cards).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Skipping invalid card"));

    consoleSpy.mockRestore();
  });

  it("skips files that fail zod validation and continues", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockedReadFile.mockImplementation(async (path) => {
      const p = String(path);
      if (p.endsWith("valid-card.yaml")) return VALID_CARD_YAML;
      if (p.endsWith("invalid.yaml")) return INVALID_YAML;
      if (p.endsWith("bad-schema.yaml")) return BAD_SCHEMA_YAML;
      throw new Error(`Unexpected file: ${p}`);
    });

    const cards = await loadCards("/cards");

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("auth/valid-card");

    const errorCalls = consoleSpy.mock.calls.filter((call) =>
      String(call[0]).includes("Skipping invalid card"),
    );
    expect(errorCalls.length).toBe(2);

    consoleSpy.mockRestore();
  });

  it("returns empty array when no valid files found", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockedReaddir.mockReset();
    mockedReaddir.mockResolvedValueOnce(["auth/invalid.yaml", "auth/bad-schema.yaml"] as any);

    mockedReadFile.mockImplementation(async (path) => {
      const p = String(path);
      if (p.endsWith("invalid.yaml")) return INVALID_YAML;
      if (p.endsWith("bad-schema.yaml")) return BAD_SCHEMA_YAML;
      throw new Error(`Unexpected file: ${p}`);
    });

    const cards = await loadCards("/cards");

    expect(cards).toEqual([]);

    consoleSpy.mockRestore();
  });
});
