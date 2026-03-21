import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("../../paths.js", () => ({
  resolveMcpServerPath: vi.fn(() => "/resolved/mcp-server/dist/server.js"),
}));

import { spawn } from "node:child_process";
import { runServe } from "../../commands/serve.js";

const mockSpawn = vi.mocked(spawn);

function createMockChild() {
  return new EventEmitter();
}

describe("runServe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSpawn.mockReturnValue(createMockChild() as any);
  });

  it("spawns node with server path and inherit stdio", () => {
    runServe();

    expect(mockSpawn).toHaveBeenCalledWith(
      "node",
      ["/resolved/mcp-server/dist/server.js"],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it("passes POCKETLANTERN_CARDS_DIR env when cardsDir provided", () => {
    runServe("/custom/cards");

    const callArgs = mockSpawn.mock.calls[0];
    const options = callArgs[2] as any;
    expect(options.env.POCKETLANTERN_CARDS_DIR).toBeDefined();
  });

  it("does not set POCKETLANTERN_CARDS_DIR env when cardsDir not provided", () => {
    runServe();

    const callArgs = mockSpawn.mock.calls[0];
    const options = callArgs[2] as any;
    expect(options.env.POCKETLANTERN_CARDS_DIR).toBeUndefined();
  });

  it("prints message and exits on error", () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child as any);

    runServe();
    child.emit("error", new Error("spawn failed"));

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("spawn failed"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("exits with child's exit code on exit", () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child as any);

    runServe();
    child.emit("exit", 42);

    expect(process.exit).toHaveBeenCalledWith(42);
  });

  it("exits with 0 when child exit code is null (signal kill)", () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child as any);

    runServe();
    child.emit("exit", null);

    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
