#!/usr/bin/env node

import { createRequire } from "node:module";
import { runServe } from "./commands/serve.js";
import { runSearch } from "./commands/search.js";
import { runValidate } from "./commands/validate.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const HELP = `
pocketlantern - Blocker-aware decision layer for AI agents

Usage:
  pocketlantern serve [--cards-dir <path>]    Start the MCP server
  pocketlantern search <query>                Search knowledge cards
  pocketlantern validate [--cards-dir <path>] Validate card schemas
  pocketlantern init [--scope <scope>]         Register MCP server in Claude Code
  pocketlantern doctor [--cards-dir <path>]   Diagnose installation status
  pocketlantern help                          Show this help message

Options:
  --cards-dir <path>  Path to knowledge cards directory
  --scope <scope>     MCP registration scope: user (default), project
`.trim();

export function parseArgs(args: string[]) {
  const command = args[0];
  const rest = args.slice(1);

  let cardsDir: string | undefined;
  let scope: string | undefined;
  const positional: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--cards-dir") {
      if (i + 1 >= rest.length || rest[i + 1].startsWith("-")) {
        console.error("Error: --cards-dir requires a path argument");
        process.exit(1);
      }
      cardsDir = rest[++i];
    } else if (rest[i] === "--scope") {
      if (i + 1 >= rest.length || rest[i + 1].startsWith("-")) {
        console.error("Error: --scope requires a value (user or project)");
        process.exit(1);
      }
      scope = rest[++i];
    } else {
      positional.push(rest[i]);
    }
  }

  return { command, positional, cardsDir, scope };
}

export async function run(args: string[]) {
  const { command, positional, cardsDir, scope } = parseArgs(args);

  switch (command) {
    case "serve":
      runServe(cardsDir);
      break;

    case "search": {
      const query = positional.join(" ");
      if (!query) {
        console.error("Usage: pocketlantern search <query>");
        process.exit(1);
      }
      await runSearch(query, cardsDir);
      break;
    }

    case "validate":
      await runValidate(cardsDir);
      break;

    case "init":
      runInit({ cardsDir, scope });
      break;

    case "doctor":
      await runDoctor(cardsDir);
      break;

    case "--version":
    case "-v":
      console.log(version);
      break;

    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;

    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

/* v8 ignore start */
run(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exit(1);
});
/* v8 ignore stop */
