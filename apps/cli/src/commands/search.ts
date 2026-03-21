import { loadCards } from "@pocketlantern/mcp-server/loader";
import { searchCards } from "@pocketlantern/mcp-server/search";
import { resolveCardsDir } from "@pocketlantern/mcp-server";

/**
 * Search knowledge cards from the CLI (human-readable output).
 */
export async function runSearch(query: string, cardsDir?: string) {
  const dir = resolveCardsDir(cardsDir);
  const cards = await loadCards(dir);
  const results = searchCards(cards, query);

  if (results.length === 0) {
    console.log(`No cards found for "${query}"`);
    return;
  }

  console.log(`Found ${results.length} card(s) for "${query}":\n`);

  for (const card of results) {
    console.log(`  ${card.id}`);
    console.log(`    ${card.title}`);
    console.log(`    ${card.problem}`);
    console.log(`    tags: ${card.tags.join(", ")}`);
    if (card.constraints.length > 0) {
      console.log(`    constraints: ${card.constraints.join(", ")}`);
    }
    console.log();
  }
}
