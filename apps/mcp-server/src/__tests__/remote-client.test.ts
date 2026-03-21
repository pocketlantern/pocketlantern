import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RemoteClient } from "../remote-client.js";
import type { Card } from "@pocketlantern/schema";

const validCard: Card = {
  id: "auth/jwt-vs-session",
  title: "JWT vs Session",
  problem: "Choosing auth strategy",
  candidates: [{ name: "JWT", summary: "Stateless", when_to_use: "APIs" }],
  tags: ["auth"],
  updated: "2026-01-01",
};

function mockFetch(response: unknown, options?: { ok?: boolean; status?: number }) {
  return vi.fn().mockResolvedValue({
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: () => Promise.resolve(response),
  });
}

describe("RemoteClient", () => {
  let client: RemoteClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new RemoteClient({ apiKey: "test-key", baseUrl: "https://api.example.com/" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("strips trailing slash from baseUrl", () => {
      const c = new RemoteClient({ apiKey: "k", baseUrl: "https://api.example.com/" });
      globalThis.fetch = mockFetch({ cards: [] });
      c.fetchAllCards();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api.example.com/cards",
        expect.any(Object),
      );
    });
  });

  describe("fetchAllCards", () => {
    it("returns valid cards", async () => {
      globalThis.fetch = mockFetch({ cards: [validCard] });
      const result = await client.fetchAllCards();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("auth/jwt-vs-session");
    });

    it("sends auth header", async () => {
      globalThis.fetch = mockFetch({ cards: [] });
      await client.fetchAllCards();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: { Authorization: "Bearer test-key" } }),
      );
    });

    it("returns empty array on non-ok response", async () => {
      globalThis.fetch = mockFetch({}, { ok: false, status: 500 });
      const result = await client.fetchAllCards();
      expect(result).toEqual([]);
    });

    it("returns empty array when response has no cards array", async () => {
      globalThis.fetch = mockFetch({ data: "wrong shape" });
      const result = await client.fetchAllCards();
      expect(result).toEqual([]);
    });

    it("skips invalid cards in response", async () => {
      globalThis.fetch = mockFetch({ cards: [validCard, { id: "bad", title: 123 }] });
      const result = await client.fetchAllCards();
      expect(result).toHaveLength(1);
    });

    it("returns empty array on network error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));
      const result = await client.fetchAllCards();
      expect(result).toEqual([]);
    });
  });
});
