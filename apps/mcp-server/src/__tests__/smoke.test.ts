import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function sendJsonRpc(proc: ReturnType<typeof spawn>, id: number, method: string, params = {}) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  proc.stdin!.write(`${msg}\n`);
}

function collectResponses(proc: ReturnType<typeof spawn>): Promise<Record<number, unknown>> {
  return new Promise((resolve, reject) => {
    const responses: Record<number, unknown> = {};
    let buffer = "";

    proc.stdout!.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.id != null) responses[parsed.id] = parsed;
        } catch {
          // ignore non-JSON lines
        }
      }
    });

    proc.on("close", () => resolve(responses));
    proc.on("error", reject);
  });
}

describe("MCP stdio smoke", () => {
  it("responds to initialize + tools/list via real JSON-RPC", async () => {
    const emptyCardsDir = mkdtempSync(join(tmpdir(), "pl-smoke-"));
    const serverPath = join(import.meta.dirname, "../../dist/server.js");

    const proc = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, POCKETLANTERN_CARDS_DIR: emptyCardsDir },
    });

    const done = collectResponses(proc);

    sendJsonRpc(proc, 1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "0.0.1" },
    });

    // Wait for initialize response before sending next request
    await new Promise((r) => setTimeout(r, 1500));

    sendJsonRpc(proc, 2, "notifications/initialized");
    sendJsonRpc(proc, 3, "tools/list");

    await new Promise((r) => setTimeout(r, 1500));
    proc.kill();

    const responses = await done;

    // Initialize response
    const initResp = responses[1] as {
      result?: { serverInfo?: { name: string }; capabilities?: unknown };
    };
    expect(initResp).toBeDefined();
    expect(initResp.result?.serverInfo?.name).toBe("pocketlantern");

    // Tools list response
    const toolsResp = responses[3] as { result?: { tools: { name: string }[] } };
    expect(toolsResp).toBeDefined();
    expect(toolsResp.result?.tools).toBeDefined();

    const toolNames = toolsResp.result!.tools.map((t) => t.name).sort();
    expect(toolNames).toEqual([
      "get_card",
      "get_cards",
      "get_related_cards",
      "list_categories",
      "list_constraints",
      "list_tags",
      "report_issue",
      "search_cards",
    ]);
  }, 10_000);
});
