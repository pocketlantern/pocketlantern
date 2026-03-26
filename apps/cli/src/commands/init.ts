import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { resolveCardsDir } from "@pocketlantern/mcp-server";
import { resolveMcpServerPath } from "../paths.js";

const POCKETLANTERN_RULE_MARKER = "## PocketLantern";
const POCKETLANTERN_RULE_LINE =
  "For technology decisions, upgrades, migrations, or licensing questions: before finalizing your answer, check the PocketLantern MCP server's search_cards tool for blockers in these bundled decision cards — your training data may be stale.";
const POCKETLANTERN_RULE_BLOCK = `\n${POCKETLANTERN_RULE_MARKER}\n\n${POCKETLANTERN_RULE_LINE}\n`;

/**
 * Add PocketLantern rule to project CLAUDE.md.
 * Returns: "added" | "exists" | "conflict"
 */
function addProjectRule(): "added" | "exists" {
  const claudeMdPath = resolve(process.cwd(), "CLAUDE.md");

  if (existsSync(claudeMdPath)) {
    const content = readFileSync(claudeMdPath, "utf-8");

    // Already has PocketLantern section
    if (content.includes(POCKETLANTERN_RULE_MARKER)) {
      return "exists";
    }

    writeFileSync(claudeMdPath, content.trimEnd() + POCKETLANTERN_RULE_BLOCK);
    return "added";
  }

  // No CLAUDE.md — create with rule only
  writeFileSync(claudeMdPath, `${POCKETLANTERN_RULE_MARKER}\n\n${POCKETLANTERN_RULE_LINE}\n`);
  return "added";
}

/**
 * Register PocketLantern MCP server and add project-level rule.
 */
export function runInit(options?: { cardsDir?: string; scope?: string }) {
  const serverPath = resolveMcpServerPath();
  if (!existsSync(serverPath)) {
    console.error("MCP server not built. Run: pnpm build");
    process.exit(1);
  }

  const resolvedCardsDir = resolveCardsDir(options?.cardsDir);
  const scope = options?.scope ?? "user";

  // Step 1: Register MCP server (execFileSync avoids space-in-path issues)
  const cliArgs = ["mcp", "add", "-s", scope, "pocketlantern", "--", "node", serverPath];

  if (options?.cardsDir) {
    const nameIndex = cliArgs.indexOf("pocketlantern");
    cliArgs.splice(nameIndex, 0, "-e", `POCKETLANTERN_CARDS_DIR=${resolvedCardsDir}`);
  }

  try {
    execFileSync("claude", cliArgs, { stdio: "pipe" });
    console.log("MCP server registered.");
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer })?.stderr?.toString() ?? "";
    if (stderr.includes("already exists")) {
      console.log("MCP server already registered.");
    } else {
      console.error("Failed to register MCP server.");
      console.error(`Command: claude ${cliArgs.join(" ")}`);
      if (stderr) console.error(stderr.trim());
      console.error(
        "\nMake sure Claude Code CLI is installed: https://docs.anthropic.com/en/docs/claude-code",
      );
      process.exit(1);
    }
  }

  // Step 2: Add project rule
  const ruleResult = addProjectRule();
  const claudeMdPath = resolve(process.cwd(), "CLAUDE.md");

  console.log("");
  console.log("PocketLantern is ready.");
  console.log(`  Server: ${serverPath}`);
  console.log(`  Cards:  ${resolvedCardsDir}`);
  console.log("");

  if (ruleResult === "added") {
    console.log(`  Modified: ${claudeMdPath}`);
    console.log("  Added rule under ## PocketLantern:");
    console.log("");
    console.log(`    "${POCKETLANTERN_RULE_LINE}"`);
    console.log("");
    console.log("  This creates a project-level PocketLantern-aware environment.");
    console.log("  It works when your AI agent runs in this project directory.");
  } else {
    console.log("  Rule already in CLAUDE.md — no changes made.");
  }

  console.log("");
  console.log("Restart Claude Code in this project, then try:");
  console.log("");
  console.log('  "What breaks when upgrading Node.js 20 to 24?"');
  console.log('  "What are the risks of staying on Redis after the AGPL change?"');
  console.log('  "What are the lock-in risks if I need to migrate away from Supabase?"');
}
