# Agent_OS Work Index

## Purpose

GitHub Issues and the Project board are the source of truth.
This file is a local AI handoff checkpoint only. GitHub wins on conflicts.

## Board

https://github.com/users/algoSiliguri/projects/1/views/1

## Active Epic

**None.** EPIC-001 (#37) closed 2026-05-17.

## Current Story

No active story. Two follow-on stories in Inbox:

**#48 STORY-016: Migrate readArtifactRaw callers to validated readArtifact**
https://github.com/algoSiliguri/Agent_OS/issues/48

**#51 STORY-017: Move writeTaskState into task-lifecycle.ts as private**
https://github.com/algoSiliguri/Agent_OS/issues/51

## Next Action

Create EPIC-002 or pick STORY-016/017 as a standalone story → move to In Progress → branch → work.

## Last Checkpoint

- Commit: `d807695` (main after PR #50 merge)
- Date: 2026-05-17
- Working tree: clean (graphify-out/ changes are untracked/generated)
- `npm run typecheck`: PASS
- `npm test`: PASS — 642 tests, 99 files (+62 vs EPIC-001 start)
- `npm run lint`: KNOWN FAIL — 173 Biome formatting errors, non-blocking

## Resume Command

```
Use AGENTS.md. Continue the next Ready issue from the GitHub Project board.
```

## Notes

- EPIC-000 complete (#27–#36, closed).
- EPIC-001 complete (#37–#43, PRs #44–#50, closed 2026-05-17). +62 characterization tests.
- Follow-ons from EPIC-001: STORY-016 (#48), STORY-017 (#51).
- Do not start multiple stories.
- Do not create more epics yet.
- `agent-os-starter` stable tag not yet published.
