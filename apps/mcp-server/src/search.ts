import { isActiveCard, type Card, type Constraint } from "@pocketlantern/schema";

interface SearchOptions {
  tags?: string[];
  constraints?: Constraint[];
  limit?: number;
  includeDeprecated?: boolean;
}

interface ScoredCard {
  card: Card;
  score: number;
}

/**
 * Search result summary — includes constraints so agents can
 * judge relevance without calling get_card.
 */
export interface SearchResult {
  id: string;
  title: string;
  problem: string;
  tags: string[];
  constraints: string[];
}

/**
 * Common English stopwords filtered from search queries.
 * Prevents noise when agents use natural language queries
 * like "how to handle auth in serverless".
 */
export const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "as",
  "be",
  "are",
  "was",
  "were",
  "been",
  "do",
  "does",
  "did",
  "has",
  "have",
  "had",
  "not",
  "no",
  "so",
  "if",
  "my",
  "we",
  "our",
  "us",
  "how",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "can",
  "should",
  "would",
  "could",
  "will",
  "i",
  "you",
  "he",
  "she",
  "they",
  "this",
  "that",
  "vs",
  "versus",
]);

/**
 * Tokenize a query string into lowercase keywords, removing stopwords.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Check if a text contains a keyword (case-insensitive).
 */
function matches(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword);
}

/**
 * Score a card against a set of keywords.
 * Higher score = more relevant.
 */
function scoreCard(card: Card, keywords: string[]): number {
  let score = 0;

  for (const keyword of keywords) {
    // Title match (highest weight)
    if (matches(card.title, keyword)) score += 3;

    // Problem match
    if (matches(card.problem, keyword)) score += 2;

    // Tag match: exact gets higher score, partial gets lower (no double counting)
    if (card.tags.some((tag) => tag.toLowerCase() === keyword)) {
      score += 2;
    } else if (card.tags.some((tag) => matches(tag, keyword))) {
      score += 1;
    }

    // Alias match
    if (card.aliases?.some((alias) => matches(alias, keyword))) score += 2;

    // Candidate name match
    if (card.candidates.some((c) => matches(c.name, keyword))) score += 1;

    // Context match
    if (card.context?.some((ctx) => matches(ctx, keyword))) score += 1;

    // Constraint match
    if (card.constraints?.some((c) => matches(c, keyword))) score += 2;
  }

  return score;
}

/**
 * Search cards by keyword query with optional tag/constraint filtering.
 * Deprecated cards are excluded by default.
 */
export function searchCards(
  cards: Card[],
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const { tags, limit = 5, includeDeprecated = false } = options;
  const keywords = tokenize(query);

  if (keywords.length === 0) return [];

  let filtered = cards;

  if (!includeDeprecated) {
    filtered = filtered.filter(isActiveCard);
  } else {
    filtered = filtered.filter((card) => (card.status ?? "active") !== "draft");
  }

  // Filter by constraints if provided (AND — all must match)
  if (options.constraints && options.constraints.length > 0) {
    filtered = filtered.filter((card) =>
      options.constraints!.every((c) => card.constraints?.includes(c)),
    );
  }

  // Filter by tags if provided
  if (tags && tags.length > 0) {
    const lowerTags = tags.map((t) => t.toLowerCase());
    filtered = filtered.filter((card) =>
      lowerTags.some((tag) => card.tags.some((cardTag) => cardTag.toLowerCase() === tag)),
    );
  }

  // Score and sort
  // Foundational cards get a scoring penalty — they cover evergreen knowledge
  // that LLMs already know well (Phase B eval: foundational cards delta ≤ 0).
  const FOUNDATIONAL_PENALTY = 3;

  const scored: ScoredCard[] = filtered
    .map((card) => {
      let score = scoreCard(card, keywords);
      if ((card.tier ?? "core") === "foundational") {
        score -= FOUNDATIONAL_PENALTY;
      }
      return { card, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Return summaries with constraints (token-efficient but filterable)
  return scored.slice(0, limit).map(({ card }) => ({
    id: card.id,
    title: card.title,
    problem: card.problem,
    tags: card.tags,
    constraints: card.constraints ?? [],
  }));
}
