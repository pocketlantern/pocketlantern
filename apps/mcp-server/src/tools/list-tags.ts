import { z } from "zod";
import { isActiveCard, type Card } from "@pocketlantern/schema";
import { jsonResponse } from "./response.js";

export const ListTagsArgsSchema = z.object({
  category: z
    .string()
    .optional()
    .describe(
      "Optional: filter tags to a specific category (e.g. 'auth', 'backend', 'frontend'). Omit to see all tags.",
    ),
});

export function handleListTags(cards: Card[], args: z.infer<typeof ListTagsArgsSchema>) {
  let filtered = cards.filter(isActiveCard);

  if (args.category) {
    filtered = filtered.filter((c) => c.id.startsWith(args.category + "/"));
  }

  const counts = new Map<string, number>();

  for (const card of filtered) {
    for (const tag of card.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return jsonResponse({ tags });
}
