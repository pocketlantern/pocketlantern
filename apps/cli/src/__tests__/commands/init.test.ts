import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("node:path", () => ({
  resolve: vi.fn((...args: string[]) => args.join("/")),
}));

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
}));

vi.mock("@pocketlantern/mcp-server", () => ({
  resolveCardsDir: vi.fn(() => "/resolved/cards"),
}));

vi.mock("../../paths.js", () => ({
  resolveMcpServerPath: vi.fn(() => "/resolved/mcp-server/dist/server.js"),
}));

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInit } from "../../commands/init.js";

const mockExistsSync = vi.mocked(existsSync);
const mockExecFileSync = vi.mocked(execFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

describe("runInit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExistsSync.mockReturnValue(true);
    mockExecFileSync.mockReturnValue(Buffer.from(""));
    mockReadFileSync.mockReturnValue("# Existing CLAUDE.md\n");
  });

  it("prints error and exits when server is not built", () => {
    mockExistsSync.mockReturnValue(false);
    runInit();
    expect(console.error).toHaveBeenCalledWith("MCP server not built. Run: pnpm build");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("registers MCP server via execFileSync", () => {
    runInit();
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["mcp", "add", "-s", "user", "pocketlantern"]),
      expect.objectContaining({ stdio: "pipe" }),
    );
    expect(console.log).toHaveBeenCalledWith("MCP server registered.");
  });

  it("prints already registered when server exists", () => {
    mockExecFileSync.mockImplementation(() => {
      const err = new Error("fail") as Error & { stderr: Buffer };
      err.stderr = Buffer.from("already exists");
      throw err;
    });
    runInit();
    expect(console.log).toHaveBeenCalledWith("MCP server already registered.");
    expect(process.exit).not.toHaveBeenCalled();
  });

  it("prints error and exits on other errors", () => {
    mockExecFileSync.mockImplementation(() => {
      const err = new Error("something else") as Error & { stderr: Buffer };
      err.stderr = Buffer.from("unknown error");
      throw err;
    });
    runInit();
    expect(console.error).toHaveBeenCalledWith("Failed to register MCP server.");
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("uses 'user' as default scope", () => {
    runInit();
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-s", "user"]),
      expect.anything(),
    );
  });

  it("passes custom scope correctly", () => {
    runInit({ scope: "project" });
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-s", "project"]),
      expect.anything(),
    );
  });

  it("adds -e flag for custom cardsDir", () => {
    runInit({ cardsDir: "/custom/cards" });
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-e"]),
      expect.anything(),
    );
  });

  it("skips rule if already present in CLAUDE.md", () => {
    mockReadFileSync.mockReturnValue("# Project\n\n## PocketLantern\n\nExisting rule.\n");
    runInit();
    expect(console.log).toHaveBeenCalledWith("  Rule already in CLAUDE.md — no changes made.");
  });

  it("handles error without stderr property", () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error("no stderr");
    });
    runInit();
    expect(console.error).toHaveBeenCalledWith("Failed to register MCP server.");
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
