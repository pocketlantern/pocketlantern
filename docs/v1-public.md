# PocketLantern — v1 public essentials

Short contract for what the **open toolkit** is, what it does **not** promise, how to run it, and how Pro differs. This is not a full architecture or ops manual.

---

## 1. What this product does

PocketLantern is an **MCP server** (and CLI) that ships a **fixed cardset snapshot**: **pipeline-checked**, **source-linked** decision cards (YAML) with official reference links. Agents call `search_cards` / `get_card` to surface **blockers in this cardset snapshot** (dates, EOLs, licensing shifts, compatibility) instead of guessing from stale training data. **That snapshot may still be older than the live web**—use it to ground the agent, then confirm against official sources when it matters.

- **G1 — Card links**: `related_cards` connect topics; `get_related_cards` follows those links.
- **G2 — Sidecar blocker edges**: When `packages/knowledge/graph/_index.json` is bundled, `search_cards` can attach **sidecar blocker edges** derived from that index. If the index is missing, search still works; blocker augmentation is off.

---

## 2. What we do **not** promise yet

- **Live / real-time freshness**: Cards are a **repo snapshot**, not a continuously verified live feed.
- **Human editorial sign-off** on every card: Quality is **pipeline + automated checks + AI-assisted steps**, not third-party certification.
- **Complete coverage** of every vendor or topic.
- **Pro / hosted retrieval**: **Planned** — see §5. Until then, extra cards and remote merge are **not** a supported paid product surface in this repo.

---

## 3. Install, `init`, golden query

1. **Install** (from [README](../README.md)):

   ```bash
   git clone https://github.com/pocketlantern/pocketlantern.git
   cd pocketlantern && pnpm install && pnpm build
   ```

2. **Register MCP** (example — adjust path):

   ```json
   {
     "mcpServers": {
       "pocketlantern": {
         "command": "node",
         "args": ["<path-to-pocketlantern>/apps/mcp-server/dist/server.js"]
       }
     }
   }
   ```

3. **Project rule** (optional): run `npx pocketlantern init` to add a one-line hint under `## PocketLantern` in `CLAUDE.md`.

4. **Golden query** (CLI sanity check):

   ```bash
   npx pocketlantern search "Node.js 20 upgrade GitHub Actions"
   ```

   Expect ranked cards; with a bundled graph index, structured blocker lines may appear in MCP JSON responses.

---

## 4. Reporting issues

- **GitHub**: [Issues](https://github.com/pocketlantern/pocketlantern/issues) for bugs and tooling.
- **From an agent**: the MCP server **registers** a `report_issue` tool (`no_card`, `inaccurate`, `stale`, `answer_changed`, etc.). Whether it gets called depends on **your MCP client and the model’s tool use**—it is not automatic; humans can always file GitHub Issues directly.

---

## 5. Free snapshot vs Pro (planned)

|             | **Free (this repo)**                                                         | **Pro (planned)**                                                                                                                                                                                                       |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cardset** | Curated public **snapshot** (see `public-bundle-manifest.json` when present) | Larger cardset via **planned hosted retrieval** (coming soon)                                                                                                                                                           |
| **Mode**    | Local files only                                                             | `POCKETLANTERN_API_KEY` + remote fetch with local fallback: **internal preview / engineering path unless we announce otherwise**—**no billing, no SLA**, not a generally available paid product in this repo by default |
| **Hint**    | No Pro hints — local-only mode                                               | `pro_hint` surfaces additional coverage when API key + catalog exist                                                                                                                                                    |

---

## 6. Scheduled refresh — what automation **does** and **does not** guarantee

**Private production pipeline (studio)—not your local toolkit clone.** Nothing in this section implies that your installed copy auto-updates from the internet.

This section describes **private production** (studio) behavior that shapes future snapshots; the **toolkit bundle** is still a point-in-time export.

| Path                                           | What is guaranteed in automation today                                                                                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New card publish**                           | Schema validation, dedup, link check, AI audit (full / lite by attempt), hook gate, `related_cards` backlink merge with **neighbor schema validation** before write.                      |
| **Scheduled refresh** (`review_by`-driven job) | Agent refresh of YAML, then **schema + link check** before overwrite. **Not** re-run on every refresh: full hook gate, full audit pass, or backlink merge pass equivalent to new publish. |

So: **“Refreshed” in ops** means **the refresh pipeline’s checks**, not a full duplicate of the **new-publish** gate stack unless we say so in a future release note.

---

## 7. Snapshot provenance

The toolkit may include provenance files from the card pipeline:

- `public-bundle-manifest.json` — pipeline revision, time, card count.
- `packages/knowledge/graph/_index.json` — graph index rebuilt for this snapshot.

Sync and pipeline instructions are maintained internally by the core team.
