import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { CardSchema } from "@pocketlantern/schema";
import type { Card } from "@pocketlantern/schema";
import { findYamlFiles } from "@pocketlantern/mcp-server/loader";
import { resolveCardsDir } from "@pocketlantern/mcp-server";

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Check related_cards bidirectional consistency and broken links.
 */
export function checkRelatedCards(cards: Card[]): string[] {
  const warnings: string[] = [];
  const ids = new Set(cards.map((c) => c.id));
  const cardIndex = new Map(cards.map((c) => [c.id, c]));

  for (const card of cards) {
    for (const relId of card.related_cards ?? []) {
      if (!ids.has(relId)) {
        warnings.push(`${card.id}: related_cards references non-existent card '${relId}'`);
        continue;
      }

      if (relId === card.id) {
        warnings.push(`${card.id}: related_cards references itself`);
        continue;
      }

      const target = cardIndex.get(relId);
      if (target && !(target.related_cards ?? []).includes(card.id)) {
        warnings.push(`${card.id} → ${relId} is one-directional (${relId} does not link back)`);
      }
    }
  }

  return warnings;
}

/**
 * Validate all knowledge cards against the zod schema
 * and check related_cards consistency.
 */
export async function runValidate(cardsDir?: string) {
  const dir = resolveCardsDir(cardsDir);
  const files = await findYamlFiles(dir);

  if (files.length === 0) {
    console.log("No .yaml files found.");
    return;
  }

  const results: ValidationResult[] = [];
  const parsedCards: Card[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const file of files) {
    const relativePath = relative(dir, file);
    try {
      const content = await readFile(file, "utf-8");
      const raw = parseYaml(content);
      const card = CardSchema.parse(raw);
      parsedCards.push(card);
      results.push({ file: relativePath, valid: true });
      validCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ file: relativePath, valid: false, errors: [message] });
      invalidCount++;
    }
  }

  // Print schema validation results
  for (const result of results) {
    if (result.valid) {
      console.log(`  OK  ${result.file}`);
    } else {
      console.log(`  FAIL  ${result.file}`);
      /* v8 ignore next */
      for (const err of result.errors ?? []) {
        console.log(`        ${err}`);
      }
    }
  }

  console.log();
  console.log(`${validCount} valid, ${invalidCount} invalid, ${files.length} total`);

  // Check related_cards consistency
  if (parsedCards.length > 0) {
    const warnings = checkRelatedCards(parsedCards);
    if (warnings.length > 0) {
      console.log();
      console.log(`related_cards warnings (${warnings.length}):`);
      for (const w of warnings) {
        console.log(`  WARN  ${w}`);
      }
    }
  }

  if (invalidCount > 0) {
    process.exit(1);
  }
}
