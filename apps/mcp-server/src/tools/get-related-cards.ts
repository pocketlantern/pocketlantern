import { z } from "zod";
import type { Card } from "@pocketlantern/schema";
import type { CardStore } from "../card-store.js";
import { jsonResponse, errorResponse } from "./response.js";

export const GetRelatedCardsArgsSchema = z.object({
  id: z
    .string()
    .describe(
      "Card ID to find related cards for (format: 'category/card-name'). Returns summaries of connected topics.",
    ),
});

export function handleGetRelatedCards(
  store: CardStore,
  args: z.infer<typeof GetRelatedCardsArgsSchema>,
) {
  const source = store.getById(args.id);

  if (!source) {
    return errorResponse(`Card not found: ${args.id}. Use search_cards to find available cards.`);
  }

  const relatedIds = source.related_cards ?? [];
  const related = relatedIds
    .map((id) => store.getById(id))
    .filter((c): c is Card => c !== undefined)
    .map((c) => ({
      id: c.id,
      title: c.title,
      problem: c.problem,
      tags: c.tags,
    }));

  return jsonResponse({ source: args.id, related });
}
