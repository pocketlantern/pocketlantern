/**
 * Remote API client — fetches cards from PocketLantern Pro hosted retrieval.
 *
 * Graceful fallback: any fetch failure returns empty array (local-only mode continues).
 * Timeout: 3 seconds per request.
 */

import type { Card } from "@pocketlantern/schema";
import { CardSchema } from "@pocketlantern/schema";

const REMOTE_TIMEOUT_MS = 3000;

export interface RemoteClientOptions {
  apiKey: string;
  baseUrl: string;
}

export class RemoteClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: RemoteClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
  }

  /**
   * Fetch all cards from remote. Returns empty array on any failure.
   */
  async fetchAllCards(): Promise<Card[]> {
    try {
      const res = await fetch(`${this.baseUrl}/cards`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(REMOTE_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.error(`[pocketlantern:remote] /cards responded ${res.status}`);
        return [];
      }
      const data = (await res.json()) as { cards?: unknown[] };
      if (!Array.isArray(data.cards)) return [];

      // Validate each card, skip invalid
      const valid: Card[] = [];
      for (const raw of data.cards) {
        const result = CardSchema.safeParse(raw);
        if (result.success) valid.push(result.data);
      }
      return valid;
    } catch (e) {
      console.error(
        `[pocketlantern:remote] fetchAllCards failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return [];
    }
  }
}
