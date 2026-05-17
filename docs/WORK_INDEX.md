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

**#42 STORY-014: Task state transition characterization test**
https://github.com/algoSiliguri/Agent_OS/issues/42
Status: Ready

## Next Action

Move #42 to In Progress → branch `story-014-characterize-task-state-machine` → add exhaustive HAPPY-table test → run `npm test` → do not touch `src/`.

## Last Checkpoint

- Commit: `d458b57`
- Date: 2026-05-17
- Branch: `story-013-audit-write-artifact-raw` → PR #47 open
- Working tree: clean (graphify-out/ changes are untracked/generated)
- `npm run typecheck`: PASS (was broken, fixed in this branch)
- `npm test`: PASS — 636 tests, 99 files
- `npm run lint`: KNOWN FAIL — 173 Biome formatting errors, non-blocking

## Resume Command

```
Use AGENTS.md. Continue the next Ready issue from the GitHub Project board.
```

## Notes

- EPIC-000 complete (issues #27–#36 all closed).
- EPIC-001 in progress: STORY-010 done (#38, PR #44), STORY-011 done (#39, PR #45), STORY-012 done (#40, PR #46), STORY-013 done (#41, PR #47). STORY-014 through STORY-015 (#42–#43) in Inbox. STORY-016 added (#48, readArtifactRaw migration).
- Do not start multiple stories.
- Do not create more epics yet.
- `agent-os-starter` stable tag not yet published.
