import { describe, it, expect, vi } from "vitest";
import { handleReportIssue } from "../tools/report-issue.js";

vi.mock("../query-log.js", () => ({
  logFeedback: vi.fn(),
}));

import { logFeedback } from "../query-log.js";

describe("handleReportIssue", () => {
  it("logs feedback and returns status", () => {
    const result = handleReportIssue({
      issue_type: "inaccurate",
      card_id: "auth/jwt",
      query: "jwt auth",
      detail: "wrong expiry info",
    });

    expect(logFeedback).toHaveBeenCalledWith(
      "inaccurate",
      "auth/jwt",
      "jwt auth",
      "wrong expiry info",
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("logged");
    expect(parsed.issue_type).toBe("inaccurate");
    expect(parsed.card_id).toBe("auth/jwt");
  });

  it("handles minimal fields", () => {
    const result = handleReportIssue({ issue_type: "no_card" });

    expect(logFeedback).toHaveBeenCalledWith("no_card", undefined, undefined, undefined);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe("logged");
    expect(parsed.card_id).toBeNull();
  });
});
