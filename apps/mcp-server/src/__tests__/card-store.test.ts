import { describe, it, expect } from "vitest";
import { LocalCardStore, MergedCardStore } from "../card-store.js";
import { makeCard } from "./fixtures.js";

describe("LocalCardStore", () => {
  it("returns all cards", () => {
    const cards = [makeCard("cat/a"), makeCard("cat/b")];
    const store = new LocalCardStore(cards);
    expect(store.getAll()).toHaveLength(2);
    expect(store.mode).toBe("local");
  });

  it("finds card by id", () => {
    const store = new LocalCardStore([makeCard("cat/a"), makeCard("cat/b")]);
    expect(store.getById("cat/a")?.title).toBe("Card cat/a");
  });

  it("returns undefined for missing id", () => {
    const store = new LocalCardStore([makeCard("cat/a")]);
    expect(store.getById("cat/nonexistent")).toBeUndefined();
  });

  it("handles empty card list", () => {
    const store = new LocalCardStore([]);
    expect(store.getAll()).toHaveLength(0);
    expect(store.getById("any")).toBeUndefined();
  });
});

describe("MergedCardStore", () => {
  it("merges local and remote cards", () => {
    const local = [makeCard("cat/a")];
    const remote = [makeCard("cat/b")];
    const store = new MergedCardStore(local, remote);
    expect(store.getAll()).toHaveLength(2);
    expect(store.mode).toBe("pro");
  });

  it("local cards take priority on id conflict", () => {
    const local = [makeCard("cat/a", { title: "Local Version" })];
    const remote = [makeCard("cat/a", { title: "Remote Version" })];
    const store = new MergedCardStore(local, remote);
    expect(store.getAll()).toHaveLength(1);
    expect(store.getById("cat/a")?.title).toBe("Local Version");
  });

  it("deduplicates by id", () => {
    const local = [makeCard("cat/a"), makeCard("cat/b")];
    const remote = [makeCard("cat/b"), makeCard("cat/c")];
    const store = new MergedCardStore(local, remote);
    expect(store.getAll()).toHaveLength(3);
    expect(store.getById("cat/b")?.title).toBe("Card cat/b");
  });

  it("handles empty local", () => {
    const store = new MergedCardStore([], [makeCard("cat/a")]);
    expect(store.getAll()).toHaveLength(1);
  });

  it("handles empty remote", () => {
    const store = new MergedCardStore([makeCard("cat/a")], []);
    expect(store.getAll()).toHaveLength(1);
  });
});
