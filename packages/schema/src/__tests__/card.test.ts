import { describe, it, expect } from "vitest";
import {
  CardSchema,
  CandidateSchema,
  ConstraintSchema,
  isActiveCard,
  CardStatusSchema,
  CardSummarySchema,
} from "../card.js";

const validCandidate = {
  name: "Option A",
  summary: "A brief summary.",
  when_to_use: "When you need speed.",
};

const validCard = {
  id: "auth/jwt-vs-session",
  title: "JWT vs Session",
  problem: "Choosing an authentication strategy.",
  candidates: [validCandidate],
  tags: ["auth"],
  updated: "2026-01-15",
};

describe("CardSchema", () => {
  it("accepts a valid minimal card (required fields only)", () => {
    const result = CardSchema.safeParse(validCard);
    expect(result.success).toBe(true);
  });

  it("accepts a valid full card (all optional fields)", () => {
    const full = {
      ...validCard,
      context: ["Node.js", "REST API"],
      constraints: ["serverless", "low-ops"] as const,
      candidates: [
        {
          ...validCandidate,
          tradeoffs: "Fast but stateless.",
          cautions: "Revocation is hard.",
          links: ["https://jwt.io"],
        },
      ],
      aliases: ["login", "signin"],
      related_cards: ["auth/oauth-providers"],
      status: "active" as const,
    };
    const result = CardSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  describe("missing required fields", () => {
    it("rejects missing id", () => {
      const { id, ...rest } = validCard;
      expect(CardSchema.safeParse(rest).success).toBe(false);
    });

    it("rejects missing title", () => {
      const { title, ...rest } = validCard;
      expect(CardSchema.safeParse(rest).success).toBe(false);
    });

    it("rejects missing problem", () => {
      const { problem, ...rest } = validCard;
      expect(CardSchema.safeParse(rest).success).toBe(false);
    });

    it("rejects missing candidates", () => {
      const { candidates, ...rest } = validCard;
      expect(CardSchema.safeParse(rest).success).toBe(false);
    });

    it("rejects missing tags", () => {
      const { tags, ...rest } = validCard;
      expect(CardSchema.safeParse(rest).success).toBe(false);
    });

    it("rejects missing updated", () => {
      const { updated, ...rest } = validCard;
      expect(CardSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe("invalid id format", () => {
    it("rejects uppercase letters", () => {
      const result = CardSchema.safeParse({ ...validCard, id: "Auth/jwt" });
      expect(result.success).toBe(false);
    });

    it("rejects id without slash", () => {
      const result = CardSchema.safeParse({ ...validCard, id: "auth-jwt" });
      expect(result.success).toBe(false);
    });

    it("rejects id with double slash", () => {
      const result = CardSchema.safeParse({ ...validCard, id: "auth//jwt" });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid date format", () => {
    it("rejects slashes (2026/01/01)", () => {
      const result = CardSchema.safeParse({ ...validCard, updated: "2026/01/01" });
      expect(result.success).toBe(false);
    });

    it("rejects text dates (Jan 1 2026)", () => {
      const result = CardSchema.safeParse({ ...validCard, updated: "Jan 1 2026" });
      expect(result.success).toBe(false);
    });

    it("rejects single-digit month/day (2026-1-1)", () => {
      const result = CardSchema.safeParse({ ...validCard, updated: "2026-1-1" });
      expect(result.success).toBe(false);
    });
  });

  it("rejects empty candidates array", () => {
    const result = CardSchema.safeParse({ ...validCard, candidates: [] });
    expect(result.success).toBe(false);
  });

  it("rejects empty tags array", () => {
    const result = CardSchema.safeParse({ ...validCard, tags: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid constraint enum value", () => {
    const result = CardSchema.safeParse({
      ...validCard,
      constraints: ["not-a-constraint"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status enum value", () => {
    const result = CardSchema.safeParse({ ...validCard, status: "archived" });
    expect(result.success).toBe(false);
  });

  it("accepts valid URLs in candidate links", () => {
    const result = CardSchema.safeParse({
      ...validCard,
      candidates: [
        {
          ...validCandidate,
          links: ["https://example.com", "https://docs.example.com/guide"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("ConstraintSchema", () => {
  const allConstraints = [
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
  ] as const;

  it.each(allConstraints)("accepts '%s'", (value) => {
    expect(ConstraintSchema.safeParse(value).success).toBe(true);
  });
});

describe("CardStatusSchema", () => {
  it.each(["active", "deprecated", "draft"] as const)("accepts '%s'", (value) => {
    expect(CardStatusSchema.safeParse(value).success).toBe(true);
  });
});

describe("CardSummarySchema", () => {
  it("validates subset fields (id, title, problem, tags)", () => {
    const summary = {
      id: "db/sql-vs-nosql",
      title: "SQL vs NoSQL",
      problem: "Choosing a database paradigm.",
      tags: ["database"],
    };
    const result = CardSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it("rejects when a required summary field is missing", () => {
    const result = CardSummarySchema.safeParse({
      id: "db/sql-vs-nosql",
      title: "SQL vs NoSQL",
      // problem missing
      tags: ["database"],
    });
    expect(result.success).toBe(false);
  });
});

describe("isActiveCard", () => {
  const base = {
    id: "cat/card",
    title: "T",
    problem: "P",
    candidates: [{ name: "C", summary: "S", when_to_use: "W" }],
    tags: ["t"],
    updated: "2026-01-01",
  };

  it("returns true for active status", () => {
    expect(isActiveCard({ ...base, status: "active" })).toBe(true);
  });

  it("returns true when status is undefined (default)", () => {
    expect(isActiveCard({ ...base })).toBe(true);
  });

  it("returns false for deprecated", () => {
    expect(isActiveCard({ ...base, status: "deprecated" })).toBe(false);
  });

  it("returns false for draft", () => {
    expect(isActiveCard({ ...base, status: "draft" })).toBe(false);
  });
});
