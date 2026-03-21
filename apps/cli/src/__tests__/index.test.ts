import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseArgs } from "../index.js";

// Mock all command modules
vi.mock("../commands/serve.js", () => ({
  runServe: vi.fn(),
}));
vi.mock("../commands/search.js", () => ({
  runSearch: vi.fn(() => Promise.resolve()),
}));
vi.mock("../commands/validate.js", () => ({
  runValidate: vi.fn(() => Promise.resolve()),
}));
vi.mock("../commands/doctor.js", () => ({
  runDoctor: vi.fn(() => Promise.resolve()),
}));
vi.mock("../commands/init.js", () => ({
  runInit: vi.fn(),
}));

describe("parseArgs", () => {
  it("parses command name from first arg", () => {
    const result = parseArgs(["serve"]);
    expect(result.command).toBe("serve");
  });

  it("parses --cards-dir flag with value", () => {
    const result = parseArgs(["serve", "--cards-dir", "/tmp/cards"]);
    expect(result.cardsDir).toBe("/tmp/cards");
  });

  it("parses --scope flag with value", () => {
    const result = parseArgs(["init", "--scope", "project"]);
    expect(result.scope).toBe("project");
  });

  it("collects positional args", () => {
    const result = parseArgs(["search", "hello"]);
    expect(result.positional).toEqual(["hello"]);
  });

  it("handles no args (command is undefined)", () => {
    const result = parseArgs([]);
    expect(result.command).toBeUndefined();
    expect(result.positional).toEqual([]);
  });

  it("exits with error when --cards-dir has no value", () => {
    expect(() => parseArgs(["serve", "--cards-dir"])).toThrow();
  });

  it("handles multiple positional args", () => {
    const result = parseArgs(["search", "hello", "world"]);
    expect(result.positional).toEqual(["hello", "world"]);
  });

  it("handles all flags together", () => {
    const result = parseArgs(["init", "--cards-dir", "/tmp/cards", "--scope", "project", "extra"]);
    expect(result.command).toBe("init");
    expect(result.cardsDir).toBe("/tmp/cards");
    expect(result.scope).toBe("project");
    expect(result.positional).toEqual(["extra"]);
  });
});

describe("run", () => {
  let runServe: ReturnType<typeof vi.fn>;
  let runSearch: ReturnType<typeof vi.fn>;
  let runValidate: ReturnType<typeof vi.fn>;
  let runDoctor: ReturnType<typeof vi.fn>;
  let runInit: ReturnType<typeof vi.fn>;
  let run: (typeof import("../index.js"))["run"];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const mod = await import("../index.js");
    run = mod.run;

    const serveMod = await import("../commands/serve.js");
    const searchMod = await import("../commands/search.js");
    const validateMod = await import("../commands/validate.js");
    const doctorMod = await import("../commands/doctor.js");
    const initMod = await import("../commands/init.js");

    runServe = serveMod.runServe as ReturnType<typeof vi.fn>;
    runSearch = searchMod.runSearch as ReturnType<typeof vi.fn>;
    runValidate = validateMod.runValidate as ReturnType<typeof vi.fn>;
    runDoctor = doctorMod.runDoctor as ReturnType<typeof vi.fn>;
    runInit = initMod.runInit as ReturnType<typeof vi.fn>;
  });

  it("serve command calls runServe", async () => {
    await run(["serve"]);
    expect(runServe).toHaveBeenCalledWith(undefined);
  });

  it("serve with --cards-dir passes cardsDir", async () => {
    await run(["serve", "--cards-dir", "/tmp"]);
    expect(runServe).toHaveBeenCalledWith("/tmp");
  });

  it("search command calls runSearch with query", async () => {
    await run(["search", "auth", "library"]);
    expect(runSearch).toHaveBeenCalledWith("auth library", undefined);
  });

  it("search without query prints error and exits", async () => {
    await run(["search"]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Usage"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it("validate command calls runValidate", async () => {
    await run(["validate"]);
    expect(runValidate).toHaveBeenCalledWith(undefined);
  });

  it("init command calls runInit with options", async () => {
    await run(["init", "--scope", "project"]);
    expect(runInit).toHaveBeenCalledWith({ cardsDir: undefined, scope: "project" });
  });

  it("doctor command calls runDoctor", async () => {
    await run(["doctor"]);
    expect(runDoctor).toHaveBeenCalledWith(undefined);
  });

  it("help command prints help text", async () => {
    await run(["help"]);
    expect(console.log).toHaveBeenCalled();
  });

  it("--help flag prints help text", async () => {
    await run(["--help"]);
    expect(console.log).toHaveBeenCalled();
  });

  it("-h flag prints help text", async () => {
    await run(["-h"]);
    expect(console.log).toHaveBeenCalled();
  });

  it("no args prints help text", async () => {
    await run([]);
    expect(console.log).toHaveBeenCalled();
  });

  it("--version prints version string", async () => {
    await run(["--version"]);
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+/));
  });

  it("-v prints version string", async () => {
    await run(["-v"]);
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+/));
  });

  it("unknown command prints error and exits", async () => {
    await run(["foobar"]);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Unknown command: foobar"));
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
