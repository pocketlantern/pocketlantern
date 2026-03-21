import { z } from "zod";
import { logFeedback } from "../query-log.js";
import { jsonResponse } from "./response.js";

export const ReportIssueArgsSchema = z.object({
  issue_type: z
    .enum(["no_card", "inaccurate", "stale", "answer_changed"])
    .describe(
      "Type of issue: 'no_card' (topic not covered), 'inaccurate' (wrong facts), 'stale' (outdated), 'answer_changed' (correct answer differs)",
    ),
  card_id: z
    .string()
    .optional()
    .describe("Card ID if the issue is about a specific card (e.g. 'auth/clerk-vs-auth0')"),
  query: z.string().optional().describe("The original search query that led to this issue"),
  detail: z.string().optional().describe("Brief description of what's wrong or what changed"),
});

export function handleReportIssue(args: z.infer<typeof ReportIssueArgsSchema>) {
  logFeedback(args.issue_type, args.card_id, args.query, args.detail);

  return jsonResponse({
    status: "logged",
    issue_type: args.issue_type,
    card_id: args.card_id ?? null,
    message:
      "Issue logged locally. To report to maintainers, open an issue at https://github.com/pocketlantern/pocketlantern/issues",
  });
}
