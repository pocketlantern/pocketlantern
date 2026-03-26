#!/usr/bin/env node
/**
 * Release gate: bundled G2 index must exist and match the shape MCP graph-loader expects.
 * Run from repo root: node scripts/verify-graph-bundle.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "packages", "knowledge", "graph", "_index.json");

if (!fs.existsSync(indexPath)) {
  console.error(`verify-graph-bundle: missing ${path.relative(root, indexPath)}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
} catch (e) {
  console.error("verify-graph-bundle: invalid JSON", e);
  process.exit(1);
}

if (!data || typeof data !== "object") {
  console.error("verify-graph-bundle: root must be an object");
  process.exit(1);
}
if (!Array.isArray(data.edges)) {
  console.error("verify-graph-bundle: .edges must be an array");
  process.exit(1);
}
if (data.nodes === null || typeof data.nodes !== "object") {
  console.error("verify-graph-bundle: .nodes must be an object");
  process.exit(1);
}

console.log(
  `verify-graph-bundle: ok (${Object.keys(data.nodes).length} nodes, ${data.edges.length} edges, built=${data.built ?? "?"})`,
);
