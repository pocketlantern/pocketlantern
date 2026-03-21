import { describe, it, expect } from "vitest";
import { cardJsonSchema, candidateJsonSchema } from "../json-schema.js";

describe("cardJsonSchema", () => {
  it("is a valid JSON Schema object with type and properties", () => {
    const schema = cardJsonSchema as Record<string, unknown>;
    const def = (schema["$defs"] as Record<string, unknown>)?.["Card"] ?? schema;

    const defObj = def as Record<string, unknown>;
    expect(defObj).toHaveProperty("type");
    expect(defObj).toHaveProperty("properties");
  });

  it("properties include all required card fields", () => {
    const schema = cardJsonSchema as Record<string, unknown>;
    const def = (schema["$defs"] as Record<string, unknown>)?.["Card"] ?? schema;

    const properties = (def as Record<string, unknown>)["properties"] as Record<string, unknown>;

    const requiredFields = ["id", "title", "problem", "candidates", "tags", "updated"];
    for (const field of requiredFields) {
      expect(properties).toHaveProperty(field);
    }
  });
});

describe("candidateJsonSchema", () => {
  it("is a valid JSON Schema object with type and properties", () => {
    const schema = candidateJsonSchema as Record<string, unknown>;
    const def = (schema["$defs"] as Record<string, unknown>)?.["Candidate"] ?? schema;

    const defObj = def as Record<string, unknown>;
    expect(defObj).toHaveProperty("type");
    expect(defObj).toHaveProperty("properties");
  });

  it("properties include all required candidate fields", () => {
    const schema = candidateJsonSchema as Record<string, unknown>;
    const def = (schema["$defs"] as Record<string, unknown>)?.["Candidate"] ?? schema;

    const properties = (def as Record<string, unknown>)["properties"] as Record<string, unknown>;

    const requiredFields = ["name", "summary", "when_to_use", "tradeoffs", "cautions"];
    for (const field of requiredFields) {
      expect(properties).toHaveProperty(field);
    }
  });
});
