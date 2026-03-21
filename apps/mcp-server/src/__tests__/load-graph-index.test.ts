import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockReadFile, mockExistsSync } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockExistsSync: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

import { loadGraphIndex } from "../graph-loader.js";

describe("loadGraphIndex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns null when index file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    expect(await loadGraphIndex("/some/dir")).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("loads and returns valid graph index", async () => {
    const validIndex = {
      built: "2026-03-18",
      nodes: { "runtime/node": { type: "runtime", id: "runtime/node", name: "Node.js" } },
      edges: [{ type: "eol_date", from: "runtime/node-20", to: null, source_card: "test/card" }],
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(validIndex));

    const result = await loadGraphIndex("/graph");
    expect(result).toEqual(validIndex);
  });

  it("returns null on invalid JSON", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue("not json{{{");

    expect(await loadGraphIndex("/graph")).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Failed to parse"));
  });

  it("returns null when edges is not an array", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ built: "x", nodes: {}, edges: "not-array" }));

    expect(await loadGraphIndex("/graph")).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("invalid structure"));
  });

  it("returns null when nodes is not an object (string)", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ built: "x", nodes: "bad", edges: [] }));

    expect(await loadGraphIndex("/graph")).toBeNull();
  });

  it("returns null when nodes is null", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify({ built: "x", nodes: null, edges: [] }));

    expect(await loadGraphIndex("/graph")).toBeNull();
  });

  it("returns null when parsed value is null", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue("null");

    expect(await loadGraphIndex("/graph")).toBeNull();
  });

  it("uses provided graphDir to resolve index path", async () => {
    mockExistsSync.mockReturnValue(false);
    await loadGraphIndex("/custom/path");
    expect(mockExistsSync).toHaveBeenCalledWith(expect.stringContaining("/custom/path"));
  });

  it("filters out edges missing required type or from fields", async () => {
    const indexWithBadEdges = {
      built: "2026-03-18",
      nodes: {},
      edges: [
        { type: "eol_date", from: "runtime/node-20", to: null, source_card: "test/card" },
        { type: "eol_date", to: null },
        { from: "runtime/node-20", to: null },
        { to: null },
        { type: 123, from: "runtime/node-20" },
      ],
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(indexWithBadEdges));

    const result = await loadGraphIndex("/graph");
    expect(result).not.toBeNull();
    expect(result!.edges).toHaveLength(1);
    expect(result!.edges[0].type).toBe("eol_date");
    expect(result!.edges[0].from).toBe("runtime/node-20");
  });
});
