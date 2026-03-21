/**
 * Lightweight query logger for dogfooding.
 * Logs search queries, results, and user feedback to JSONL.
 *
 * Log file location: $POCKETLANTERN_LOG_DIR/query-log.jsonl
 * or ~/.pocketlantern/query-log.jsonl
 */

import { appendFile, mkdir, stat, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";

const MAX_LOG_BYTES = 10 * 1024 * 1024; // 10 MB

export type IssueType = "no_card" | "inaccurate" | "stale" | "answer_changed";

export interface QueryLogEntry {
  type: "search" | "get_card" | "feedback";
  query?: string;
  card_id?: string;
  result_count?: number;
  result_ids?: string[];
  hit: boolean;
  issue_type?: IssueType;
  detail?: string;
}

function getLogDir(): string {
  if (process.env.POCKETLANTERN_LOG_DIR) {
    return resolve(process.env.POCKETLANTERN_LOG_DIR);
  }
  return resolve(homedir(), ".pocketlantern");
}

function getLogPath(): string {
  return resolve(getLogDir(), "query-log.jsonl");
}

async function ensureLogDir(): Promise<void> {
  await mkdir(getLogDir(), { recursive: true });
}

async function rotateIfNeeded(logPath: string): Promise<void> {
  try {
    const s = await stat(logPath);
    if (s.size >= MAX_LOG_BYTES) {
      await rename(logPath, logPath.replace(/\.jsonl$/, ".old.jsonl"));
    }
  } catch {
    // File may not exist yet — that's fine
  }
}

export function logQuery(entry: QueryLogEntry): void {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  const logPath = getLogPath();

  // Fire-and-forget: never block MCP responses on log I/O
  void (async () => {
    try {
      await ensureLogDir();
      await rotateIfNeeded(logPath);
      await appendFile(logPath, line + "\n");
    } catch {
      // Silent — logging must never break the MCP server
    }
  })();
}

export function logSearch(query: string, resultIds: string[]): void {
  logQuery({
    type: "search",
    query,
    result_count: resultIds.length,
    result_ids: resultIds.slice(0, 10),
    hit: resultIds.length > 0,
  });
}

export function logGetCard(cardId: string, found: boolean): void {
  logQuery({
    type: "get_card",
    card_id: cardId,
    hit: found,
  });
}

export function logFeedback(
  issueType: IssueType,
  cardId?: string,
  query?: string,
  detail?: string,
): void {
  logQuery({
    type: "feedback",
    issue_type: issueType,
    card_id: cardId,
    query,
    detail,
    hit: false,
  });
}
