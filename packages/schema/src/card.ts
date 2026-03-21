import { z } from "zod";

/**
 * A single candidate solution within a knowledge card.
 */
export const CandidateSchema = z.object({
  name: z.string().describe("Name of the candidate technology or pattern"),
  summary: z.string().describe("1-2 sentence summary"),
  when_to_use: z.string().describe("When to choose this candidate"),
  tradeoffs: z.string().optional().describe("Pros and cons"),
  cautions: z.string().optional().describe("Warnings and pitfalls"),
  links: z.array(z.string().url()).optional().describe("Reference URLs"),
});

export type Candidate = z.infer<typeof CandidateSchema>;

/**
 * Structured environment/situation constraints for filtering.
 * Controlled vocabulary — new values require applicability to 3+ cards.
 */
export const ConstraintSchema = z.enum([
  "serverless",
  "high-scale",
  "low-ops",
  "cost-sensitive",
  "enterprise",
  "small-team",
  "monorepo",
  "microservices",
  "real-time",
  "compliance",
]);

export type Constraint = z.infer<typeof ConstraintSchema>;

/**
 * Card status indicating whether the card is current or outdated.
 */
export const CardStatusSchema = z
  .enum(["active", "deprecated", "draft"])
  .describe("Card status: active (default), deprecated, or draft");

export type CardStatus = z.infer<typeof CardStatusSchema>;

/**
 * Card tier — controls search ranking priority.
 * - core: High-value cards with factual hooks (pricing, EOL, version-specific).
 *   Default tier. Ranked normally in search.
 * - foundational: Evergreen architectural knowledge that LLMs already know well.
 *   Deprioritized in search results to surface high-delta cards first.
 */
export const CardTierSchema = z
  .enum(["core", "foundational"])
  .describe("Card tier: core (default, high-value) or foundational (evergreen, deprioritized)");

export type CardTier = z.infer<typeof CardTierSchema>;

/**
 * A PocketLantern knowledge card.
 *
 * Cards are the core unit of knowledge. Each card describes a problem
 * and presents multiple candidate solutions for AI agents to evaluate.
 */
export const CardSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)
    .describe("Unique identifier (e.g. auth/jwt-vs-session)"),
  title: z.string().describe("Card title"),
  problem: z.string().describe("What problem situation this card addresses"),
  context: z.array(z.string()).optional().describe("Related tech stacks, environments, conditions"),
  constraints: z
    .array(ConstraintSchema)
    .optional()
    .describe("Structured environment/situation constraints for filtering"),
  candidates: z.array(CandidateSchema).min(1).describe("List of candidate solutions"),
  tags: z.array(z.string()).min(1).describe("Tags for search"),
  aliases: z
    .array(z.string())
    .optional()
    .describe("Alternative search terms (e.g. login, signin for auth)"),
  related_cards: z
    .array(z.string())
    .optional()
    .describe("IDs of related cards for further exploration"),
  status: CardStatusSchema.optional().describe(
    "Card status: active (default), deprecated, or draft",
  ),
  tier: CardTierSchema.optional().describe(
    "Card tier: core (default) or foundational (deprioritized in search)",
  ),
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Last updated date (ISO 8601, date only)"),
  review_by: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Date by which this card must be re-verified (time-scoped cards only)"),
});

export type Card = z.infer<typeof CardSchema>;

/**
 * Summary returned by search_cards (lightweight, token-efficient).
 * Exported for external consumers building on top of PocketLantern schema.
 * Internal search uses SearchResult (includes constraints) from search.ts.
 */
export const CardSummarySchema = CardSchema.pick({
  id: true,
  title: true,
  problem: true,
  tags: true,
});

export type CardSummary = z.infer<typeof CardSummarySchema>;

export function isActiveCard(card: Card): boolean {
  const status = card.status ?? "active";
  return status !== "deprecated" && status !== "draft";
}
