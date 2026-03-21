import { describe, it, expect } from "vitest";
import * as schema from "../index.js";

describe("index exports", () => {
  it.each([
    "CardSchema",
    "CandidateSchema",
    "ConstraintSchema",
    "CardStatusSchema",
    "CardSummarySchema",
    "cardJsonSchema",
    "candidateJsonSchema",
  ])("exports %s", (name) => {
    expect(schema).toHaveProperty(name);
    expect((schema as Record<string, unknown>)[name]).toBeDefined();
  });
});
