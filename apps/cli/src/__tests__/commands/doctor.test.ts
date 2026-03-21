import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server/loader", () => ({
  loadCards: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server", () => ({
  resolveCardsDir: vi.fn(() => "/resolved/cards"),
}));

vi.mock("../../paths.js", () => ({
  resolveMcpServerPath: vi.fn(() => "/resolved/mcp-server/dist/server.js"),
}));

import { existsSync, readFileSync } from "node:fs";
import { loadCards } from "@pocketlantern/mcp-server/loader";
import { runDoctor } from "../../commands/doctor.js";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockLoadCards = vi.mocked(loadCards);

describe("runDoctor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Default: all checks pass
    mockExistsSync.mockReturnValue(true);
    mockLoadCards.mockResolvedValue([{ id: "card1" } as any]);
    mockReadFileSync.mockReturnValue(JSON.stringify({ mcpServers: { pocketlantern: {} } }));
  });

  it("does not exit when all checks pass", async () => {
    await runDoctor();

    expect(process.exit).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("All checks passed!");
  });

  it("prints FAIL and exits when cards dir is missing", async () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path) === "/resolved/cards") return false;
      return true;
    });

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("prints FAIL and exits when card loading throws an error", async () => {
    mockLoadCards.mockRejectedValue(new Error("load failed"));

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("prints WARN when cards loaded but 0 cards found", async () => {
    mockLoadCards.mockResolvedValue([]);

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
  });

  it("prints FAIL and exits when MCP server is not built", async () => {
    mockExistsSync.mockImplementation((path) => {
      if (String(path) === "/resolved/mcp-server/dist/server.js") return false;
      return true;
    });

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("prints SKIP when config file is missing", async () => {
    mockExistsSync.mockImplementation((path) => {
      const p = String(path);
      if (p.includes(".claude.json") || p.includes("claude_desktop_config.json")) return false;
      return true;
    });

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("SKIP"));
  });

  it("prints WARN when config exists but pocketlantern not registered", async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({ mcpServers: {} }));

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("not registered"));
  });

  it("prints WARN when config exists but cannot be parsed", async () => {
    mockReadFileSync.mockReturnValue("not valid json{{{");

    await runDoctor();

    // With multi-path checking, unparseable config → falls through to "not registered"
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
  });

  it("handles non-Error throw in card loading", async () => {
    mockLoadCards.mockRejectedValue("string error");

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("FAIL — string error"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("falls back to USERPROFILE when HOME is not set", async () => {
    const origHome = process.env.HOME;
    const origProfile = process.env.USERPROFILE;
    delete process.env.HOME;
    process.env.USERPROFILE = "/mock/home";

    await runDoctor();

    process.env.HOME = origHome;
    if (origProfile !== undefined) {
      process.env.USERPROFILE = origProfile;
    } else {
      delete process.env.USERPROFILE;
    }

    expect(process.exit).not.toHaveBeenCalled();
  });

  it("falls back to empty string when neither HOME nor USERPROFILE is set", async () => {
    const origHome = process.env.HOME;
    const origProfile = process.env.USERPROFILE;
    delete process.env.HOME;
    delete process.env.USERPROFILE;

    // Config file won't exist at empty path, so SKIP is expected
    mockExistsSync.mockImplementation((path) => {
      const p = String(path);
      if (p.includes(".claude.json") || p.includes("claude_desktop_config")) return false;
      return true;
    });

    await runDoctor();

    process.env.HOME = origHome;
    if (origProfile !== undefined) {
      process.env.USERPROFILE = origProfile;
    }

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("SKIP"));
  });

  it("handles config without mcpServers key", async () => {
    mockReadFileSync.mockReturnValue(JSON.stringify({}));

    await runDoctor();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("WARN"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("not registered"));
  });
});
