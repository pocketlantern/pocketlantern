import { loadCards } from "@pocketlantern/mcp-server/loader";
import { searchCardsWithQuality } from "@pocketlantern/mcp-server/search";
import { resolveCardsDir } from "@pocketlantern/mcp-server";

const CARD_REQUEST_URL =
  "https://github.com/pocketlantern/pocketlantern/discussions/categories/card-requests";

/**
 * Search knowledge cards from the CLI (human-readable output).
 */
export async function runSearch(query: string, cardsDir?: string) {
  const dir = resolveCardsDir(cardsDir);
  const cards = await loadCards(dir);
  const { results, weak } = searchCardsWithQuality(cards, query);

  if (results.length === 0) {
    console.log(`No matching decision cards yet for "${query}"\n`);
    console.log("Try a narrower question:");
    console.log('  pocketlantern search "auth pricing"');
    console.log('  pocketlantern search "nextjs upgrade"');
    console.log('  pocketlantern search "openai realtime migration"');
    console.log(
      '\nBrowse categories: pocketlantern search "<category>" (auth, database, frontend, ai, serverless, ...)',
    );
    console.log(`\nNeed this topic? Open a card request:\n  ${CARD_REQUEST_URL}`);
    return;
  }

  if (weak) {
    console.log(`Closest matches for "${query}" (not an exact topic match):\n`);
  } else {
    console.log(`Found ${results.length} card(s) for "${query}":\n`);
  }

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

  if (weak) {
    console.log("These may not be exactly what you're looking for.");
    console.log("Try narrowing your query or browse by category.");
    console.log(`\nNeed this topic? Open a card request:\n  ${CARD_REQUEST_URL}`);
  }
}
