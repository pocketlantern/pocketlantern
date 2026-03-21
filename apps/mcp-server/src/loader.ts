import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { CardSchema, type Card } from "@pocketlantern/schema";

/**
 * Find all .yaml files under a directory (recursive).
 */
export async function findYamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true });
  const ymlFiles = entries.filter((e) => e.endsWith(".yml"));
  if (ymlFiles.length > 0) {
    console.error(
      `[warn] Found ${ymlFiles.length} .yml file(s) — only .yaml is supported. Rename to .yaml: ${ymlFiles.slice(0, 3).join(", ")}`,
    );
  }
  return entries.filter((e) => e.endsWith(".yaml")).map((e) => join(dir, e));
}

/**
 * Load and validate all knowledge cards from the given directory.
 * Returns valid cards and logs warnings for invalid ones.
 */
export async function loadCards(cardsDir: string): Promise<Card[]> {
  const files = await findYamlFiles(cardsDir);
  const cards: Card[] = [];

  for (const file of files) {
    const relativePath = relative(cardsDir, file);
    try {
      const content = await readFile(file, "utf-8");
      const raw = parseYaml(content);
      const card = CardSchema.parse(raw);
      cards.push(card);
    } catch (error) {
      /* v8 ignore next */
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[warn] Skipping invalid card ${relativePath}: ${message}`);
    }
  }

  return cards;
}
