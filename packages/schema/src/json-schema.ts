import { z } from "zod";
import { CardSchema, CandidateSchema } from "./card.js";

export const cardJsonSchema = z.toJSONSchema(CardSchema, { target: "draft-7" });
export const candidateJsonSchema = z.toJSONSchema(CandidateSchema, { target: "draft-7" });
