import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockReadFile, mockExistsSync } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockExistsSync: vi.fn(() => false),
}));

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

import {
  loadProCatalog,
  searchProCatalog,
  resetCatalogCache,
  type ProCatalog,
} from "../pro-catalog.js";

const fixture: ProCatalog = {
  version: 1,
  built: "2026-03-20",
  count: 3,
  entries: [
    {
      id: "pro/card-a",
      title: "Auth Migration Deep Dive",
      tags: ["auth", "migration"],
      constraints: [],
      aliases: ["auth-move"],
    },
    {
      id: "pro/card-b",
      title: "Database Scaling Guide",
      tags: ["database", "scaling"],
      constraints: [],
      aliases: [],
    },
    {
      id: "local/card-x",
      title: "Local Card",
      tags: ["test"],
      constraints: [],
      aliases: [],
    },
  ],
};

describe("pro-catalog", () => {
  const originalEnv = process.env.POCKETLANTERN_PRO_CATALOG;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCatalogCache();
    delete process.env.POCKETLANTERN_PRO_CATALOG;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.POCKETLANTERN_PRO_CATALOG;
    } else {
      process.env.POCKETLANTERN_PRO_CATALOG = originalEnv;
    }
  });

  describe("loadProCatalog", () => {
    it("returns null when no catalog file exists", async () => {
      mockExistsSync.mockReturnValue(false);
      expect(await loadProCatalog()).toBeNull();
    });

    it("loads catalog from POCKETLANTERN_PRO_CATALOG env var", async () => {
      process.env.POCKETLANTERN_PRO_CATALOG = "/tmp/pro-catalog.json";
      mockReadFile.mockResolvedValue(JSON.stringify(fixture));

      const result = await loadProCatalog();
      expect(result).toEqual(fixture);
      expect(result!.count).toBe(3);
    });

    it("returns cached catalog within TTL", async () => {
      process.env.POCKETLANTERN_PRO_CATALOG = "/tmp/pro-catalog.json";
      mockReadFile.mockResolvedValue(JSON.stringify(fixture));

      await loadProCatalog();
      const second = await loadProCatalog();

      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(second).toEqual(fixture);
    });

    it("returns null on parse error", async () => {
      process.env.POCKETLANTERN_PRO_CATALOG = "/tmp/bad.json";
      mockReadFile.mockResolvedValue("not json{{{");

      expect(await loadProCatalog()).toBeNull();
    });

    it("returns null on read error", async () => {
      process.env.POCKETLANTERN_PRO_CATALOG = "/tmp/missing.json";
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      expect(await loadProCatalog()).toBeNull();
    });

    it("loads from default path when file exists", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(fixture));

      const result = await loadProCatalog();
      expect(result).toEqual(fixture);
    });
  });

  describe("searchProCatalog", () => {
    const localIds = new Set(["local/card-x"]);

    it("returns null for empty query", () => {
      expect(searchProCatalog(fixture, "", localIds)).toBeNull();
    });

    it("returns null for stopwords-only query", () => {
      expect(searchProCatalog(fixture, "the and or", localIds)).toBeNull();
    });

    it("returns hint when Pro entries match above threshold", () => {
      const result = searchProCatalog(fixture, "auth migration", localIds);
      expect(result).not.toBeNull();
      expect(result!.matched_count).toBe(1);
      expect(result!.message).toContain("1 blocker");
      expect(result!.url).toBe("https://pocketlantern.dev");
    });

    it("skips entries that exist locally", () => {
      const allLocal = new Set(["pro/card-a", "pro/card-b", "local/card-x"]);
      const result = searchProCatalog(fixture, "auth migration", allLocal);
      expect(result).toBeNull();
    });

    it("returns null when no entries reach score threshold", () => {
      const result = searchProCatalog(fixture, "unrelated topic xyz", localIds);
      expect(result).toBeNull();
    });

    it("pluralizes message for multiple matches", () => {
      const catalog: ProCatalog = {
        ...fixture,
        entries: [
          {
            id: "pro/a",
            title: "Auth Auth Auth",
            tags: ["auth", "auth-deep"],
            constraints: [],
            aliases: ["auth-alias"],
          },
          {
            id: "pro/b",
            title: "Auth Security Auth",
            tags: ["auth", "security"],
            constraints: [],
            aliases: ["auth-sec"],
          },
        ],
      };
      const result = searchProCatalog(catalog, "auth", new Set());
      expect(result).not.toBeNull();
      expect(result!.matched_count).toBe(2);
      expect(result!.message).toContain("blockers");
    });

    it("scores alias matches", () => {
      const result = searchProCatalog(fixture, "auth-move migration", localIds);
      expect(result).not.toBeNull();
      expect(result!.matched_count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("resetCatalogCache", () => {
    it("clears cached catalog so next load reads file", async () => {
      process.env.POCKETLANTERN_PRO_CATALOG = "/tmp/pro-catalog.json";
      mockReadFile.mockResolvedValue(JSON.stringify(fixture));

      await loadProCatalog();
      expect(mockReadFile).toHaveBeenCalledTimes(1);

      resetCatalogCache();
      await loadProCatalog();
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });
});
