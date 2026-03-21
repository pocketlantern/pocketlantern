import { isActiveCard, type Card } from "@pocketlantern/schema";
import { jsonResponse } from "./response.js";

export function handleListCategories(cards: Card[]) {
  const counts = new Map<string, number>();
  const activeCards = cards.filter(isActiveCard);

  for (const card of activeCards) {
    const category = card.id.split("/")[0];
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  const categories = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return jsonResponse({ categories });
}
