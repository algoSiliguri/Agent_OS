# Contributing to Agent_OS

## Read First

1. `AGENTS.md` — work protocol and safety rules
2. `docs/WORK_INDEX.md` — current active work
3. `docs/SOLO_DEV_OPERATING_MODEL.md` — issue types, labels, board

## Project Board

https://github.com/users/algoSiliguri/projects/1/views/1

## Setup

```bash
npm install
npm run typecheck
npm test
```

Expected: typecheck clean, all tests pass.

Lint has 173 known formatting-only errors (non-blocking):
```bash
npm run lint
```

## Picking Work

1. Open the project board above.
2. Pick one **Ready** issue.
3. Move it to **In Progress**.
4. Create a branch:
   - `story-NNN-short-title`
   - `bug-NNN-short-title`
   - `chore-NNN-short-title`
5. Work only on that issue. Touch only the files listed in "Files Likely Touched".

## Before Opening a PR

```bash
npm run typecheck   # must pass
npm test            # must pass
npm run lint        # record result; non-blocking until lint is clean
```

## PR Requirements

Every PR must:
- Reference the issue: `Closes #N`
- List files changed
- Record test results
- Record dev/prod verification if the issue required it
- State rollback steps

## Safety

- No drive-by cleanup.
- No changes outside the issue scope.
- No architectural refactor without a characterization test in place first.
- No `src/` changes for docs-only stories.
- If install/update/uninstall is affected, follow `docs/INSTALL_UPDATE_UNINSTALL_CONTRACT.md`.
- If a god node is touched, a characterization test must exist before the change. See `docs/DEFINITION_OF_DONE.md`.
