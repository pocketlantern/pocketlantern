import { ConstraintSchema, isActiveCard } from "@pocketlantern/schema";
import type { Card, Constraint } from "@pocketlantern/schema";
import { jsonResponse } from "./response.js";

const constraintDescriptions: Record<Constraint, string> = {
  serverless: "Serverless environment (Lambda, Vercel Functions)",
  "high-scale": "High traffic/data volume processing",
  "low-ops": "Minimal operational overhead",
  "cost-sensitive": "Cost optimization priority",
  enterprise: "Enterprise environment (regulations, audits)",
  "small-team": "Small team (1-5 people)",
  monorepo: "Monorepo structure",
  microservices: "Microservices architecture",
  "real-time": "Real-time processing requirement",
  compliance: "Regulatory compliance (GDPR, SOC2, etc.)",
};

export function handleListConstraints(cards: Card[]) {
  const counts = new Map<string, number>();
  const activeCards = cards.filter(isActiveCard);

  for (const card of activeCards) {
    for (const constraint of card.constraints ?? []) {
      counts.set(constraint, (counts.get(constraint) ?? 0) + 1);
    }
  }

  const constraints = ConstraintSchema.options.map((name) => ({
    name,
    /* v8 ignore start */
    description: constraintDescriptions[name] ?? name,
    /* v8 ignore stop */
    count: counts.get(name) ?? 0,
  }));

  return jsonResponse({ constraints });
}
