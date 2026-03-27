import { describe, it, expect } from "vitest";
import type { Card } from "@pocketlantern/schema";
import { handleListConstraints } from "../../tools/list-constraints.js";
import { fixtureCards } from "../fixtures.js";

const ALL_CONSTRAINT_NAMES = [
  "serverless",
  "high-scale",
  "low-ops",
  "cost-sensitive",
  "enterprise",
  "small-team",
  "monorepo",
  "microservices",
  "real-time",
  "compliance",
];

describe("handleListConstraints", () => {
  it("returns all 10 constraint enum values", () => {
    const result = handleListConstraints(fixtureCards);
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.constraints).toHaveLength(10);
    const names = parsed.constraints.map((c: any) => c.name);
    for (const name of ALL_CONSTRAINT_NAMES) {
      expect(names).toContain(name);
    }
  });

  it("returns correct card_count for each constraint", () => {
    const result = handleListConstraints(fixtureCards);
    const parsed = JSON.parse(result.content[0].text);

    const countMap = new Map(parsed.constraints.map((c: any) => [c.name, c.count]));
    // serverless: card-1, card-3 = 2
    expect(countMap.get("serverless")).toBe(2);
    // high-scale: card-2 = 1
    expect(countMap.get("high-scale")).toBe(1);
    // enterprise: card-2 = 1
    expect(countMap.get("enterprise")).toBe(1);
    // small-team: card-1 = 1
    expect(countMap.get("small-team")).toBe(1);
    // real-time: card-3 = 1
    expect(countMap.get("real-time")).toBe(1);
    // low-ops, cost-sensitive, monorepo, microservices, compliance = 0
    expect(countMap.get("low-ops")).toBe(0);
    expect(countMap.get("cost-sensitive")).toBe(0);
    expect(countMap.get("monorepo")).toBe(0);
    expect(countMap.get("microservices")).toBe(0);
    expect(countMap.get("compliance")).toBe(0);
  });

  it("excludes deprecated and draft cards from counts", () => {
    const cardsWithDeprecatedConstraint: Card[] = [
      ...fixtureCards.slice(0, 3),
      {
        ...fixtureCards[3],
        constraints: ["compliance"],
      },
      {
        ...fixtureCards[4],
        constraints: ["compliance"],
      },
    ];
    const result = handleListConstraints(cardsWithDeprecatedConstraint);
    const parsed = JSON.parse(result.content[0].text);

    const countMap = new Map(parsed.constraints.map((c: any) => [c.name, c.count]));
    expect(countMap.get("compliance")).toBe(0);
  });

  it("includes a description for each constraint", () => {
    const result = handleListConstraints(fixtureCards);
    const parsed = JSON.parse(result.content[0].text);

    for (const constraint of parsed.constraints) {
      expect(constraint).toHaveProperty("description");
      expect(typeof constraint.description).toBe("string");
      expect(constraint.description.length).toBeGreaterThan(0);
    }
  });
});
