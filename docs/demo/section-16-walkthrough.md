# Section-16 Walkthrough — v1 Demo

This is the brief's Section-16 scenario, replayed against a real codebase.
Every step references a slash command, the artifact it produces, and the
event(s) emitted.

## Setup

1. Install: `pi install npm:@agnivadc/agent-os`
2. Bind: create `.agent-os/project.yaml` (see README)
3. Run `pi` and verify with `/doctor` that the binding succeeds

## Step 1 — `/grill`

```
> /grill add rate limiting to /api/v1/auth
[grill T-001 started]

[assumption] What does this idea ASSUME about the existing code that might be wrong?
  (why: Wrong assumptions cause wasted work.)
  > existing JWT middleware in place

[risk] What is the WORST that could happen if this ships and is wrong?
  (why: Calibrates blast radius.)
  > brute-force protection becomes a foot-gun for legit users

... (continues for ~7 questions, or until you type "done") ...

GrillRecord saved → .agent-os/tasks/T-001/grill.yaml
[T-001: NEW_IDEA → GRILLING → SHARED_UNDERSTANDING]
```

Events: `TASK_CREATED`, `GRILL_STARTED`, `QUESTION_ASKED` × N,
`ANSWER_RECORDED` × N, `SHARED_UNDERSTANDING_CREATED`.

## Step 2 — `/plan`

```
> /plan
PLAN — 1 step:
  1. Implement: add rate limiting to /api/v1/auth (risk: low)

Approve this plan? [y/N] y
PLAN_APPROVED
[T-001: SHARED_UNDERSTANDING → PLANNING → AWAITING_PLAN_APPROVAL]
```

Events: `PLAN_CREATED`, `PLAN_APPROVED`.

## Step 3 — `/run` (first attempt fails recoverably)

```
> /run T-001
EXEC step 1/1: ... [Pi agent works on it]
COMMAND_FAILED (compile_error: TS2345 mismatch)
[T-001: EXECUTING → FAILED_RECOVERABLE]
```

Events: `COMMAND_STARTED`, `COMMAND_FAILED`, state transition.

## Step 4 — fix and `/run --resume`

```
> /run T-001 --resume
EXEC step 1/1: ... [Pi retries]
COMMAND_COMPLETED · 1 file changed · 18 lines added
[T-001: FAILED_RECOVERABLE → EXECUTING → VERIFYING]
```

## Step 5 — `/verify` (auto-chained from /run)

```
VERIFY T-001 · 1 command · all pass
[T-001: VERIFYING → AWAITING_HUMAN_REVIEW]
```

Events: `VERIFICATION_STARTED`, `VERIFICATION_PASSED`.

## Step 6 — `/remember`

```
> /remember
[capture 1/4] type=architecture scope=project
  Plan approved by user — design choice worth remembering.
  Keep? [y/N] y

... (continues for each proposal) ...

REMEMBER T-001 · 4 proposed · 3 kept · 1 dropped → brain (project scope)
[T-001: AWAITING_HUMAN_REVIEW → PERSISTING_KNOWLEDGE → COMPLETED]
```

Events: `KNOWLEDGE_CAPTURE_PROPOSED` × 4, `KNOWLEDGE_CAPTURE_APPROVED` × 3,
`KNOWLEDGE_CAPTURE_REJECTED` × 1, `TASK_COMPLETED`.

## Step 7 — `/status`

```
> /status
T-001 · COMPLETED
next: task done — start a new one
```

## What the demo proves

- Idea pressure-tested before any code touched
- Bounded plan with explicit approval gate
- Policy-gated tool execution (Tier 2 caches; Tier 3 re-prompts)
- Recoverable failure → resume
- Verification gate before "done"
- Knowledge persisted with user review
- Compressed timeline, not raw transcript noise

The integration test at `tests/integration/section-16-demo.test.ts` runs
this scenario end-to-end without human input (using scripted UI fixtures)
and asserts every artifact + event listed above.
