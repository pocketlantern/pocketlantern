import { z } from "zod";
import type { Card } from "@pocketlantern/schema";
import type { CardStore } from "../card-store.js";
import { jsonResponse } from "./response.js";

export const GetCardsArgsSchema = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "Array of card IDs to retrieve (max 5). Use after search_cards to fetch multiple cards in one call.",
    ),
});

export function handleGetCards(store: CardStore, args: z.infer<typeof GetCardsArgsSchema>) {
  const found: Card[] = [];
  const notFoundIds: string[] = [];

  for (const id of args.ids) {
    const card = store.getById(id);
    if (card) {
      found.push(card);
    } else {
      notFoundIds.push(id);
    }
  }

  return jsonResponse({
    cards: found,
    ...(notFoundIds.length > 0 ? { not_found_ids: notFoundIds } : {}),
  });
}
