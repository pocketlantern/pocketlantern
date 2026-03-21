import { resolve, basename } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { loadCards } from "@pocketlantern/mcp-server/loader";
import { resolveCardsDir } from "@pocketlantern/mcp-server";
import { resolveMcpServerPath } from "../paths.js";

/**
 * Diagnose PocketLantern installation status.
 * Checks cards directory, card loading, and MCP server availability.
 */
export async function runDoctor(cardsDir?: string) {
  const dir = resolveCardsDir(cardsDir);
  let hasError = false;

  // 1. Check cards directory
  process.stdout.write("Cards directory ... ");
  if (existsSync(dir)) {
    console.log(`OK (${dir})`);
  } else {
    console.log(`FAIL — not found: ${dir}`);
    hasError = true;
  }

  // 2. Load and validate cards
  process.stdout.write("Card loading    ... ");
  if (existsSync(dir)) {
    try {
      const cards = await loadCards(dir);
      if (cards.length === 0) {
        console.log("WARN — no cards found");
      } else {
        console.log(`OK (${cards.length} cards loaded)`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`FAIL — ${msg}`);
      hasError = true;
    }
  } else {
    console.log("SKIP (no cards directory)");
  }

  // 3. Check MCP server binary
  process.stdout.write("MCP server      ... ");
  const serverPath = resolveMcpServerPath();
  if (existsSync(serverPath)) {
    console.log("OK");
  } else {
    console.log(`FAIL — not built. Run: pnpm build`);
    hasError = true;
  }

  // 4. Check Claude Code MCP config (supports both CLI and Desktop paths)
  process.stdout.write("Claude Code MCP ... ");
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  const configPaths = [
    resolve(home, ".claude.json"), // Claude Code CLI
    resolve(home, ".claude", "claude_desktop_config.json"), // Claude Desktop
  ];
  let mcpFound = false;
  for (const configPath of configPaths) {
    if (!existsSync(configPath)) continue;
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      const servers = config.mcpServers ?? {};
      if (servers.pocketlantern) {
        console.log(`OK (registered in ${basename(configPath)})`);
        mcpFound = true;
        break;
      }
    } catch {
      /* skip unparseable */
    }
  }
  if (!mcpFound) {
    if (configPaths.some((p) => existsSync(p))) {
      console.log("WARN — config exists but pocketlantern not registered. Run: pocketlantern init");
    } else {
      console.log("SKIP (no Claude config found)");
    }
  }

  console.log();
  if (hasError) {
    console.log("Some checks failed. Fix the issues above and try again.");
    process.exit(1);
  } else {
    console.log("All checks passed!");
  }
}
