# Agent_OS Work Index

## Purpose

GitHub Issues and the Project board are the source of truth.
This file is a local AI handoff checkpoint only. GitHub wins on conflicts.

## Board

https://github.com/users/algoSiliguri/projects/1/views/1

## Active Epic

**#37 EPIC-001: State + Event Spine Protection**
https://github.com/algoSiliguri/Agent_OS/issues/37

## Current Story

**#43 STORY-015: Remove writeTaskState backdoor**
https://github.com/algoSiliguri/Agent_OS/issues/43
Status: Ready

## Next Action

Move #43 to In Progress → branch `story-015-remove-write-task-state-backdoor` → audit `writeTaskState` call sites → migrate or delete → run `npm test`.

## Last Checkpoint

- Commit: `3061074`
- Date: 2026-05-17
- Branch: `story-014-characterize-task-state-machine` → PR #49 open
- Working tree: clean (graphify-out/ changes are untracked/generated)
- `npm run typecheck`: PASS
- `npm test`: PASS — 642 tests, 99 files
- `npm run lint`: KNOWN FAIL — 173 Biome formatting errors, non-blocking

## Resume Command

```
Use AGENTS.md. Continue the next Ready issue from the GitHub Project board.
```

## Notes

- EPIC-000 complete (issues #27–#36 all closed).
- EPIC-001 in progress: STORY-010–014 done (#38–#42, PRs #44–#49). STORY-015 (#43) in Inbox. STORY-016 (#48, readArtifactRaw migration) in Inbox.
- Do not start multiple stories.
- Do not create more epics yet.
- `agent-os-starter` stable tag not yet published.
