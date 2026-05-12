import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { GrillRecord } from '../../../../src/ccp/artifacts/grill-record';

describe('GrillRecord', () => {
  const env = {
    artifact_id: 'a-1',
    task_id: 'T-001',
    artifact_type: 'GrillRecord',
    schema_version: 1,
    policy_version: 'v1',
    manifest_version: 'v1',
    created_at: '2026-05-04T12:00:00Z',
    validated_under: { schema_version: 1, policy_version: 'v1', manifest_version: 'v1' },
  };

  it('accepts a fully populated record', () => {
    const record = {
      ...env,
      goal: 'Add rate limit',
      user_type: 'developer',
      problem_statement: 'No rate limiting on auth endpoint',
      assumptions: [{ id: 'A-1', text: 'JWT auth in place', status: 'accepted' }],
      questions: [
        {
          id: 'Q-1',
          question: 'Limit per IP?',
          why_it_matters: 'block brute-force',
          answer: '10/min',
          status: 'answered',
        },
      ],
      risks: [
        { id: 'R-1', risk: 'Locks legit users', severity: 'medium', mitigation: 'allowlist' },
      ],
      constraints: [{ id: 'C-1', text: 'no DB schema change' }],
      success_criteria: [{ id: 'SC-1', text: '11th request returns 429' }],
      decision: { proceed: true, reason: 'risks understood' },
      open_blockers: [],
    };
    expect(Value.Check(GrillRecord, record)).toBe(true);
  });

  it('rejects assumption with invalid status', () => {
    const bad = {
      ...env,
      goal: 'g',
      user_type: 'developer',
      problem_statement: 'p',
      assumptions: [{ id: 'A-1', text: 't', status: 'invalid_status' }],
      questions: [],
      risks: [],
      constraints: [],
      success_criteria: [],
      decision: { proceed: true, reason: 'r' },
      open_blockers: [],
    };
    expect(Value.Check(GrillRecord, bad)).toBe(false);
  });

  it('rejects user_type outside enum', () => {
    const bad = {
      ...env,
      goal: 'g',
      user_type: 'wizard',
      problem_statement: 'p',
      assumptions: [],
      questions: [],
      risks: [],
      constraints: [],
      success_criteria: [],
      decision: { proceed: true, reason: 'r' },
      open_blockers: [],
    };
    expect(Value.Check(GrillRecord, bad)).toBe(false);
  });

  it('accepts record with source_docs', () => {
    const record = {
      ...env,
      goal: 'Add rate limit',
      user_type: 'developer',
      problem_statement: 'No rate limiting on auth endpoint',
      assumptions: [],
      questions: [],
      risks: [],
      constraints: [],
      success_criteria: [],
      decision: { proceed: true, reason: 'ok' },
      open_blockers: [],
      source_docs: [
        { path: 'CONTRIBUTING.md', title: 'Contributing Guide', bytes: 1024, reason: 'known-root' },
      ],
    };
    expect(Value.Check(GrillRecord, record)).toBe(true);
  });

  it('accepts record without source_docs (optional field)', () => {
    const record = {
      ...env,
      goal: 'Add feature',
      user_type: 'developer',
      problem_statement: 'Need feature',
      assumptions: [],
      questions: [],
      risks: [],
      constraints: [],
      success_criteria: [],
      decision: { proceed: true, reason: 'ok' },
      open_blockers: [],
      // no source_docs
    };
    expect(Value.Check(GrillRecord, record)).toBe(true);
  });
});
