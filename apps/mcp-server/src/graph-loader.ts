/**
 * Graph index loader — reads _index.json for blocker edge augmentation.
 * Used by search_cards when include_blockers is true.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export interface GraphNode {
  type: string;
  id: string;
  name: string;
  cards?: string[];
}

export const BLOCKER_EDGE_TYPES = [
  "eol_date",
  "breaking_change_in",
  "incompatible_with",
  "requires_version",
  "locks_via",
  "exports_to",
  "migrates_to",
  "upgrade_path",
  "replaces",
] as const;

export type BlockerEdgeType = (typeof BLOCKER_EDGE_TYPES)[number];

const BLOCKER_EDGE_SET = new Set<string>(BLOCKER_EDGE_TYPES);

export interface GraphEdge {
  /** Known types get autocomplete; unknown types from future graph data are still accepted. */
  type: BlockerEdgeType | (string & {});
  from: string;
  to: string | null;
  source_card?: string;
  summary?: string;
  change?: string;
  min_version?: string;
  date?: string;
  method?: string;
  surface?: string;
  reason?: string;
  severity?: string;
  rating?: string;
  successor?: string;
  uptime_pct?: string;
}

export interface BlockerSummary {
  type: string;
  summary: string;
  source_card: string;
}

export interface GraphIndex {
  built: string;
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}

/**
 * Load the graph index. Returns null if file doesn't exist (graceful degradation).
 */
export async function loadGraphIndex(graphDir?: string): Promise<GraphIndex | null> {
  const dir =
    graphDir ??
    (process.env.POCKETLANTERN_GRAPH_DIR
      ? resolve(process.env.POCKETLANTERN_GRAPH_DIR)
      : resolve(import.meta.dirname, "..", "..", "..", "knowledge", "graph"));

  const indexPath = resolve(dir, "_index.json");
  if (!existsSync(indexPath)) return null;

  try {
    const parsed = JSON.parse(await readFile(indexPath, "utf-8"));
    if (
      !parsed ||
      !Array.isArray(parsed.edges) ||
      parsed.nodes === null ||
      typeof parsed.nodes !== "object"
    ) {
      console.error(`[pocketlantern] Graph index has invalid structure at ${indexPath}`);
      return null;
    }
    const validEdges = parsed.edges.filter(
      (e: Record<string, unknown>) => typeof e.type === "string" && typeof e.from === "string",
    );
    return { ...parsed, edges: validEdges };
  } catch {
    console.error(`[pocketlantern] Failed to parse graph index at ${indexPath}`);
    return null;
  }
}

/**
 * Summarize a graph edge into a human-readable string.
 */
function summarizeEdge(edge: GraphEdge): string {
  switch (edge.type) {
    case "eol_date":
      return `EOL: ${edge.from} ends ${edge.date || "?"} → ${edge.successor || "no successor"}`;
    case "breaking_change_in":
      return `Breaking: ${edge.from} — ${(edge.change || "").substring(0, 120)}`;
    case "incompatible_with":
      return `Incompatible: ${edge.from} ↔ ${edge.to} — ${(edge.reason || "").substring(0, 100)}`;
    case "requires_version":
      return `Requires: ${edge.from} needs ${edge.to} >= ${edge.min_version || "?"}`;
    case "locks_via":
      return `Lock-in: ${edge.from} via ${edge.to} (${edge.severity || "?"}) — ${(edge.surface || "").substring(0, 100)}`;
    case "exports_to":
      return `Export: ${edge.from} → ${edge.to} (${edge.rating || "?"}) — ${(edge.method || "").substring(0, 100)}`;
    case "migrates_to":
      return `Migration: ${edge.from} → ${edge.to} — ${(edge.method || "").substring(0, 100)}`;
    case "upgrade_path":
      return `Upgrade: ${edge.from} → ${edge.to} — ${(edge.method || "").substring(0, 100)}`;
    case "replaces":
      return `Replaces: ${edge.from} → ${edge.to} — ${(edge.reason || "").substring(0, 100)}`;
    default:
      return `${edge.type}: ${edge.from} → ${edge.to || "(self)"}`;
  }
}

/**
 * Get blocker edges for a set of card IDs.
 * Returns up to `limit` edges, distributed round-robin across cards
 * so that each card's blockers get fair representation.
 */
export function getBlockersForCards(
  index: GraphIndex,
  cardIds: string[],
  limit = 10,
): BlockerSummary[] {
  const cardSet = new Set(cardIds);
  const seen = new Set<string>();

  const perCard: Record<string, BlockerSummary[]> = {};
  for (const id of cardIds) perCard[id] = [];

  for (const edge of index.edges) {
    if (!edge.source_card || !cardSet.has(edge.source_card)) continue;
    if (!BLOCKER_EDGE_SET.has(edge.type)) continue;

    const key = `${edge.type}|${edge.from}|${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    perCard[edge.source_card]?.push({
      type: edge.type,
      summary: summarizeEdge(edge),
      source_card: edge.source_card,
    });
  }

  // Round-robin: 2 per card per round, until limit reached
  const result: BlockerSummary[] = [];
  const PER_ROUND = 2;
  let round = 0;
  while (result.length < limit) {
    let added = false;
    for (const id of cardIds) {
      const edges = perCard[id];
      const start = round * PER_ROUND;
      const slice = edges.slice(start, start + PER_ROUND);
      for (const e of slice) {
        if (result.length >= limit) break;
        result.push(e);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }

  return result;
}
