#!/usr/bin/env node
/**
 * Thin entry point for `pocketlantern-mcp` binary.
 * Resolves and runs the MCP server so Cursor/Windsurf can use it directly.
 */
const [major] = process.versions.node.split(".").map(Number);
if (major < 22) {
  console.error(
    `PocketLantern requires Node.js >= 22. You have ${process.versions.node}.\nUpgrade: https://nodejs.org/`,
  );
  process.exit(1);
}

import { resolveMcpServerPath } from "./paths.js";

const serverPath = resolveMcpServerPath();
await import(serverPath);
