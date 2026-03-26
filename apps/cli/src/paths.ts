import { createRequire } from "node:module";

/**
 * Resolve the MCP server entry point path.
 * Uses require.resolve to work in both monorepo dev and npm install -g.
 */
export function resolveMcpServerPath(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("@pocketlantern/mcp-server/server");
}
