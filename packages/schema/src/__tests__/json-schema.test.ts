import { describe, it, expect } from "vitest";
import { CardSchema, CandidateSchema } from "../card.js";
import { cardJsonSchema, candidateJsonSchema } from "../json-schema.js";

type JsonSchemaObj = {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
};

function resolveSchema(raw: unknown): JsonSchemaObj {
  const schema = raw as Record<string, unknown>;
  const def = (schema["$defs"] as Record<string, unknown>)?.["Card"] ?? schema;
  return def as JsonSchemaObj;
}

describe("cardJsonSchema ↔ CardSchema sync", () => {
  const jsonSchema = resolveSchema(cardJsonSchema);
  const zodShape = CardSchema.shape;

  it("JSON Schema properties match Zod schema fields exactly", () => {
    const jsonProps = Object.keys(jsonSchema.properties).sort();
    const zodFields = Object.keys(zodShape).sort();
    expect(jsonProps).toEqual(zodFields);
  });

  it("JSON Schema required fields match Zod non-optional fields", () => {
    const jsonRequired = (jsonSchema.required ?? []).sort();
    const zodRequired = Object.entries(zodShape)
      .filter(([, v]) => !(v as { isOptional?: () => boolean }).isOptional?.())
      .map(([k]) => k)
      .sort();
    expect(jsonRequired).toEqual(zodRequired);
  });

  it("id field preserves regex pattern from Zod", () => {
    const idProp = jsonSchema.properties.id as { pattern?: string };
    expect(idProp.pattern).toBeDefined();
    expect(new RegExp(idProp.pattern!).test("auth/jwt-vs-session")).toBe(true);
    expect(new RegExp(idProp.pattern!).test("BAD")).toBe(false);
  });
});

describe("candidateJsonSchema ↔ CandidateSchema sync", () => {
  const jsonSchema = resolveSchema(candidateJsonSchema);
  const zodShape = CandidateSchema.shape;

  it("JSON Schema properties match Zod schema fields exactly", () => {
    const jsonProps = Object.keys(jsonSchema.properties).sort();
    const zodFields = Object.keys(zodShape).sort();
    expect(jsonProps).toEqual(zodFields);
  });

  it("JSON Schema required fields match Zod non-optional fields", () => {
    const jsonRequired = (jsonSchema.required ?? []).sort();
    const zodRequired = Object.entries(zodShape)
      .filter(([, v]) => !(v as { isOptional?: () => boolean }).isOptional?.())
      .map(([k]) => k)
      .sort();
    expect(jsonRequired).toEqual(zodRequired);
  });
});
