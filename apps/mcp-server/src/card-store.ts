/**
 * CardStore — abstraction over card access at load time.
 *
 * LocalCardStore: reads from local YAML files (current behavior).
 * RemoteCardStore: fetches from hosted retrieval API (Pro mode, future).
 * MergedCardStore: combines local + remote, deduplicates by ID.
 *
 * MCP tool handlers receive the CardStore directly and use getById() for
 * O(1) lookup. List-style handlers receive Card[] via store.getAll().
 */

import type { Card } from "@pocketlantern/schema";
import { loadCards } from "./loader.js";

export interface CardStore {
  /** All available cards. */
  getAll(): Card[];
  /** Find a card by ID. Returns undefined if not found. */
  getById(id: string): Card | undefined;
  /** Current mode: "local" or "pro". */
  readonly mode: "local" | "pro";
}

/**
 * Local-only card store. Loads from YAML files at startup.
 */
export class LocalCardStore implements CardStore {
  readonly mode = "local" as const;
  private cards: Card[];
  private index: Map<string, Card>;

  constructor(cards: Card[]) {
    this.cards = cards;
    this.index = new Map(cards.map((c) => [c.id, c]));
  }

  static async create(cardsDir: string): Promise<LocalCardStore> {
    const cards = await loadCards(cardsDir);
    return new LocalCardStore(cards);
  }

  getAll(): Card[] {
    return this.cards;
  }

  getById(id: string): Card | undefined {
    return this.index.get(id);
  }
}

/**
 * Merged card store — combines local + remote cards.
 * Local cards take priority on ID conflict.
 * Used when Pro mode is active.
 */
export class MergedCardStore implements CardStore {
  readonly mode = "pro" as const;
  private cards: Card[];
  private index: Map<string, Card>;

  constructor(localCards: Card[], remoteCards: Card[]) {
    // Local takes priority — build index from remote first, then overwrite with local
    this.index = new Map<string, Card>();
    for (const card of remoteCards) {
      this.index.set(card.id, card);
    }
    for (const card of localCards) {
      this.index.set(card.id, card);
    }
    this.cards = [...this.index.values()];
  }

  getAll(): Card[] {
    return this.cards;
  }

  getById(id: string): Card | undefined {
    return this.index.get(id);
  }
}
