import { resolve } from "node:path";

/**
 * Resolve the MCP server entry point path.
 */
export function resolveMcpServerPath(): string {
  // From dist/ -> cli/ -> apps/ -> then into mcp-server/dist/
  return resolve(import.meta.dirname, "..", "..", "mcp-server", "dist", "server.js");
}
