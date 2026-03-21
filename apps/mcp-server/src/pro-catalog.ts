/**
 * Pro catalog — lightweight card metadata index for Pro hint lookup.
 *
 * Loaded from a local file or a remote URL.
 * Used to check if Pro cards match a query when local search returns 0 results.
 *
 * Cache TTL: 1 hour. Catalog is refreshed at most once per hour.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { tokenize } from "./search.js";

export interface CatalogEntry {
  id: string;
  title: string;
  tags: string[];
  constraints: string[];
  aliases: string[];
}

export interface ProCatalog {
  version: number;
  built: string;
  count: number;
  entries: CatalogEntry[];
}

export interface ProHint {
  matched_count: number;
  message: string;
  url: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedCatalog: ProCatalog | null = null;
let cacheTimestamp = 0;

/** Reset cached catalog — exposed for test isolation. */
export function resetCatalogCache(): void {
  cachedCatalog = null;
  cacheTimestamp = 0;
}

/**
 * Resolve the Pro catalog file path.
 * Supports POCKETLANTERN_PRO_CATALOG env var for custom paths.
 */
function resolveCatalogPath(): string | null {
  if (process.env.POCKETLANTERN_PRO_CATALOG) {
    return resolve(process.env.POCKETLANTERN_PRO_CATALOG);
  }
  // Default: pro-catalog.json in project root
  const defaultPath = resolve(import.meta.dirname, "..", "..", "..", "pro-catalog.json");
  if (existsSync(defaultPath)) return defaultPath;
  return null;
}

/**
 * Load the Pro catalog with TTL caching.
 * Returns null if catalog is not available.
 */
export async function loadProCatalog(): Promise<ProCatalog | null> {
  const now = Date.now();
  if (cachedCatalog && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  const catalogPath = resolveCatalogPath();
  if (!catalogPath) return null;

  try {
    const content = await readFile(catalogPath, "utf-8");
    cachedCatalog = JSON.parse(content) as ProCatalog;
    cacheTimestamp = now;
    return cachedCatalog;
  } catch {
    return null;
  }
}

const PRO_MATCH_THRESHOLD = 6;

/**
 * Search the Pro catalog for matching cards.
 * Uses the same keyword matching logic as the main search engine.
 * Returns a ProHint if matches are found, null otherwise.
 */
export function searchProCatalog(
  catalog: ProCatalog,
  query: string,
  localCardIds: Set<string>,
): ProHint | null {
  const keywords = tokenize(query);
  if (keywords.length === 0) return null;

  let matchCount = 0;

  for (const entry of catalog.entries) {
    // Skip cards that exist locally
    if (localCardIds.has(entry.id)) continue;

    let score = 0;
    for (const kw of keywords) {
      if (entry.title.toLowerCase().includes(kw)) score += 3;
      if (entry.tags.some((t) => t.toLowerCase() === kw)) score += 2;
      else if (entry.tags.some((t) => t.toLowerCase().includes(kw))) score += 1;
      if (entry.aliases.some((a) => a.toLowerCase().includes(kw))) score += 2;
    }

    if (score >= PRO_MATCH_THRESHOLD) matchCount++;
  }

  if (matchCount === 0) return null;

  return {
    matched_count: matchCount,
    message: `Your AI missed ${matchCount} blocker${matchCount > 1 ? "s" : ""} for this decision. Pipeline-checked cards may be available via planned Pro hosted retrieval (coming soon).`,
    url: "https://pocketlantern.dev",
  };
}
