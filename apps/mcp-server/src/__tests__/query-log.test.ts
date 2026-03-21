import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import * as os from "node:os";

const { mockAppendFile, mockMkdir, mockStat, mockRename } = vi.hoisted(() => ({
  mockAppendFile: vi.fn().mockResolvedValue(undefined),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
  mockStat: vi.fn().mockRejectedValue(new Error("ENOENT")),
  mockRename: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs/promises", () => ({
  appendFile: mockAppendFile,
  mkdir: mockMkdir,
  stat: mockStat,
  rename: mockRename,
}));

import { logQuery, logSearch, logGetCard, logFeedback } from "../query-log.js";

function flushPromises() {
  return new Promise((r) => setTimeout(r, 10));
}

describe("query-log", () => {
  const originalEnv = process.env.POCKETLANTERN_LOG_DIR;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppendFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockStat.mockRejectedValue(new Error("ENOENT"));
    process.env.POCKETLANTERN_LOG_DIR = "/tmp/pl-test-logs";
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.POCKETLANTERN_LOG_DIR;
    } else {
      process.env.POCKETLANTERN_LOG_DIR = originalEnv;
    }
  });

  describe("logQuery", () => {
    it("writes JSONL to log file", async () => {
      logQuery({ type: "search", query: "auth", hit: true });
      await flushPromises();

      expect(mockAppendFile).toHaveBeenCalledTimes(1);
      const [path, content] = mockAppendFile.mock.calls[0];
      expect(path).toBe(resolve("/tmp/pl-test-logs", "query-log.jsonl"));
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.type).toBe("search");
      expect(parsed.query).toBe("auth");
      expect(parsed.hit).toBe(true);
      expect(parsed.timestamp).toBeDefined();
    });

    it("ensures log directory exists via mkdir recursive", async () => {
      logQuery({ type: "search", query: "test", hit: false });
      await flushPromises();

      expect(mockMkdir).toHaveBeenCalledWith("/tmp/pl-test-logs", { recursive: true });
    });

    it("does not throw on write failure", async () => {
      mockAppendFile.mockRejectedValue(new Error("disk full"));
      expect(() => logQuery({ type: "search", query: "test", hit: false })).not.toThrow();
      await flushPromises();
    });
  });

  describe("logSearch", () => {
    it("logs search with result ids (capped at 10)", async () => {
      const ids = Array.from({ length: 15 }, (_, i) => `cat/card-${i}`);
      logSearch("auth query", ids);
      await flushPromises();

      const [, content] = mockAppendFile.mock.calls[0];
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.type).toBe("search");
      expect(parsed.query).toBe("auth query");
      expect(parsed.result_count).toBe(15);
      expect(parsed.result_ids).toHaveLength(10);
      expect(parsed.hit).toBe(true);
    });

    it("logs search with no results", async () => {
      logSearch("unknown", []);
      await flushPromises();

      const [, content] = mockAppendFile.mock.calls[0];
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.hit).toBe(false);
      expect(parsed.result_count).toBe(0);
    });
  });

  describe("logGetCard", () => {
    it("logs card access", async () => {
      logGetCard("auth/jwt", true);
      await flushPromises();

      const [, content] = mockAppendFile.mock.calls[0];
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.type).toBe("get_card");
      expect(parsed.card_id).toBe("auth/jwt");
      expect(parsed.hit).toBe(true);
    });
  });

  describe("logFeedback", () => {
    it("logs feedback with all fields", async () => {
      logFeedback("inaccurate", "auth/jwt", "jwt auth", "wrong expiry");
      await flushPromises();

      const [, content] = mockAppendFile.mock.calls[0];
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.type).toBe("feedback");
      expect(parsed.issue_type).toBe("inaccurate");
      expect(parsed.card_id).toBe("auth/jwt");
      expect(parsed.query).toBe("jwt auth");
      expect(parsed.detail).toBe("wrong expiry");
      expect(parsed.hit).toBe(false);
    });

    it("logs feedback with minimal fields", async () => {
      logFeedback("no_card");
      await flushPromises();

      const [, content] = mockAppendFile.mock.calls[0];
      const parsed = JSON.parse((content as string).trim());
      expect(parsed.issue_type).toBe("no_card");
      expect(parsed.card_id).toBeUndefined();
    });
  });

  describe("log dir resolution", () => {
    it("falls back to ~/.pocketlantern when env not set", async () => {
      delete process.env.POCKETLANTERN_LOG_DIR;
      logQuery({ type: "search", query: "test", hit: false });
      await flushPromises();

      const [path] = mockAppendFile.mock.calls[0];
      expect(path).toBe(resolve(os.homedir(), ".pocketlantern", "query-log.jsonl"));
    });
  });
});
