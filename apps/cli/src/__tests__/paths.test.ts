import { describe, it, expect } from "vitest";
import { resolveMcpServerPath } from "../paths.js";

describe("resolveMcpServerPath", () => {
  it("returns path ending with mcp-server/dist/server.js", () => {
    const result = resolveMcpServerPath();
    expect(result).toMatch(/mcp-server\/dist\/server\.js$/);
  });
});
