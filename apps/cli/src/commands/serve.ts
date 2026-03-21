import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { resolveMcpServerPath } from "../paths.js";

/**
 * Start the PocketLantern MCP server.
 * Spawns the MCP server process with stdio transport.
 */
export function runServe(cardsDir?: string) {
  const serverPath = resolveMcpServerPath();

  const env = { ...process.env };
  if (cardsDir) {
    env.POCKETLANTERN_CARDS_DIR = resolve(cardsDir);
  }

  const child = spawn("node", [serverPath], {
    env,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`Failed to start MCP server: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
