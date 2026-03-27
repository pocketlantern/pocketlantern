import { z } from "zod";
import type { CardStore } from "../card-store.js";
import { jsonResponse, errorResponse } from "./response.js";

export const GetCardArgsSchema = z.object({
  id: z
    .string()
    .describe(
      "Card ID from search results (format: 'category/card-name', e.g. 'auth/jwt-vs-session'). Use search_cards first to find relevant IDs.",
    ),
});

export function handleGetCard(store: CardStore, args: z.infer<typeof GetCardArgsSchema>) {
  const card = store.getById(args.id);

  if (!card) {
    return errorResponse(
      JSON.stringify({
        error_type: "card_not_found",
        card_id: args.id,
        message: `Card not found: ${args.id}. Use search_cards to find available cards, or list_categories to see what topics are covered.`,
      }),
    );
  }

  return jsonResponse({ card });
}
