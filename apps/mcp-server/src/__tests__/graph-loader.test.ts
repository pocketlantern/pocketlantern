import { describe, it, expect } from "vitest";
import { getBlockersForCards, type GraphIndex, type GraphEdge } from "../graph-loader.js";

function makeIndex(edges: GraphEdge[]): GraphIndex {
  return { built: "2026-03-18", nodes: {}, edges };
}

function makeEdge(overrides: Partial<GraphEdge> & { type: string; from: string }): GraphEdge {
  return { to: null, ...overrides };
}

describe("getBlockersForCards", () => {
  it("returns empty array when no cards match", () => {
    const index = makeIndex([
      makeEdge({
        type: "eol_date",
        from: "runtime/node-20",
        source_card: "other/card",
        date: "2026-04",
      }),
    ]);
    expect(getBlockersForCards(index, ["my/card"])).toEqual([]);
  });

  it("returns empty array when no blocker-type edges exist", () => {
    const index = makeIndex([
      makeEdge({
        type: "bundles",
        from: "vendor/supabase",
        to: "capability/auth",
        source_card: "my/card",
      }),
    ]);
    expect(getBlockersForCards(index, ["my/card"])).toEqual([]);
  });

  it("returns blocker edges for matching cards", () => {
    const index = makeIndex([
      makeEdge({
        type: "eol_date",
        from: "runtime/node-20",
        source_card: "devtools/node",
        date: "2026-04",
        successor: "runtime/node-24",
      }),
    ]);
    const result = getBlockersForCards(index, ["devtools/node"]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("eol_date");
    expect(result[0].source_card).toBe("devtools/node");
    expect(result[0].summary).toContain("EOL");
    expect(result[0].summary).toContain("2026-04");
  });

  it("deduplicates edges with same type/from/to", () => {
    const index = makeIndex([
      makeEdge({
        type: "eol_date",
        from: "runtime/node-20",
        source_card: "card/a",
        date: "2026-04",
      }),
      makeEdge({
        type: "eol_date",
        from: "runtime/node-20",
        source_card: "card/a",
        date: "2026-04",
      }),
    ]);
    expect(getBlockersForCards(index, ["card/a"])).toHaveLength(1);
  });

  it("respects limit", () => {
    const index = makeIndex([
      makeEdge({ type: "eol_date", from: "a", source_card: "card/a" }),
      makeEdge({ type: "breaking_change_in", from: "b", source_card: "card/a", change: "x" }),
      makeEdge({ type: "locks_via", from: "c", to: "d", source_card: "card/a", severity: "high" }),
    ]);
    expect(getBlockersForCards(index, ["card/a"], 2)).toHaveLength(2);
  });

  it("distributes round-robin across cards", () => {
    const index = makeIndex([
      makeEdge({ type: "eol_date", from: "a1", source_card: "card/a", date: "2026" }),
      makeEdge({ type: "breaking_change_in", from: "a2", source_card: "card/a", change: "x" }),
      makeEdge({ type: "locks_via", from: "a3", to: "z", source_card: "card/a", severity: "h" }),
      makeEdge({ type: "eol_date", from: "b1", source_card: "card/b", date: "2027" }),
      makeEdge({ type: "breaking_change_in", from: "b2", source_card: "card/b", change: "y" }),
    ]);
    const result = getBlockersForCards(index, ["card/a", "card/b"], 6);
    // Round-robin: 2 from a, 2 from b, 1 from a, 0 from b = 5
    expect(result.length).toBeLessThanOrEqual(6);
    // First 4 should alternate: 2 from a, 2 from b
    const first4Sources = result.slice(0, 4).map((r) => r.source_card);
    expect(first4Sources.filter((s) => s === "card/a").length).toBe(2);
    expect(first4Sources.filter((s) => s === "card/b").length).toBe(2);
  });

  it("handles cards with no edges gracefully", () => {
    const index = makeIndex([]);
    expect(getBlockersForCards(index, ["card/a", "card/b"])).toEqual([]);
  });

  describe("summarizeEdge coverage", () => {
    const cases: Array<{ type: string; extra: Partial<GraphEdge>; contains: string }> = [
      { type: "eol_date", extra: { date: "2026-04", successor: "v2" }, contains: "EOL" },
      { type: "breaking_change_in", extra: { change: "removed API" }, contains: "Breaking" },
      {
        type: "incompatible_with",
        extra: { to: "other", reason: "conflict" },
        contains: "Incompatible",
      },
      { type: "requires_version", extra: { to: "dep", min_version: "3.0" }, contains: "Requires" },
      {
        type: "locks_via",
        extra: { to: "proto", severity: "high", surface: "sdk" },
        contains: "Lock-in",
      },
      {
        type: "exports_to",
        extra: { to: "fmt", rating: "full", method: "pg_dump" },
        contains: "Export",
      },
      { type: "migrates_to", extra: { to: "target", method: "snapshot" }, contains: "Migration" },
      { type: "upgrade_path", extra: { to: "v2", method: "in-place" }, contains: "Upgrade" },
      { type: "replaces", extra: { to: "old", reason: "deprecated" }, contains: "Replaces" },
    ];

    for (const { type, extra, contains } of cases) {
      it(`summarizes ${type} correctly`, () => {
        const index = makeIndex([
          makeEdge({ type, from: "vendor/test", source_card: "test/card", ...extra }),
        ]);
        const result = getBlockersForCards(index, ["test/card"]);
        expect(result).toHaveLength(1);
        expect(result[0].summary).toContain(contains);
      });
    }

    it("handles unknown edge type with fallback summary", () => {
      const index = makeIndex([
        makeEdge({ type: "unknown_type" as string, from: "a", to: "b", source_card: "test/card" }),
      ]);
      // unknown_type is not in BLOCKER_EDGE_TYPES, so should return empty
      expect(getBlockersForCards(index, ["test/card"])).toHaveLength(0);
    });
  });
});
