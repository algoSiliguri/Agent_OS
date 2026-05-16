[A1] Self-Declaration
This file is non-authoritative. It does not define execution rules, policies, or system identity. It only attempts to invoke the governing contract.

[A2] Invocation Instruction
Before any execution begins, read: `./AGENT_OS_CONSTITUTION.md`.
The file at that path is the governing contract for this session.

[A3] Failure Instruction
If that file cannot be read, does not exist, or cannot be bound as governing authority:
- Do not proceed as Agent OS active
- Produce the required NOT_ACTIVE binding output immediately
- Operate under no Agent OS authority

[A4] Deference
If the file is successfully bound, follow its binding conditions, invalidation conditions, and output contract exactly. This file has no further instructions beyond [A5].

[A5] Capability Declaration
```yaml
harness-id: claude-code
capability-tier: 2
l3-transport: mcp
brain-db-path: $BRAIN_DB_PATH
```

---

# Claude Code Instructions for Agent_OS

**All work protocol is in `AGENTS.md`. Read that first.**

Read order:
1. `AGENTS.md` — canonical work protocol, safety rules, current active work
2. `docs/WORK_INDEX.md` — current story and next action
3. The current GitHub issue (if `gh` CLI available)

If `CLAUDE.md` and `AGENTS.md` conflict, `AGENTS.md` wins.

One-line resume prompt: `Use AGENTS.md. Continue the next Ready issue from the GitHub Project board.`

---

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

- ALWAYS read `graphify-out/GRAPH_REPORT.md` before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
