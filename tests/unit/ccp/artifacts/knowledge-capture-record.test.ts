import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { KnowledgeCaptureRecord } from '../../../../src/ccp/artifacts/knowledge-capture-record';

describe('KnowledgeCaptureRecord', () => {
  const env = {
    artifact_id: 'a',
    task_id: 'T-001',
    artifact_type: 'KnowledgeCaptureRecord',
    schema_version: 1,
    policy_version: 'v1',
    manifest_version: 'v1',
    created_at: '2026-05-04T12:00:00Z',
    validated_under: { schema_version: 1, policy_version: 'v1', manifest_version: 'v1' },
  };

  it('accepts a record with mixed approval states', () => {
    const r = {
      ...env,
      items: [
        {
          id: 'K-1',
          scope: 'project',
          type: 'convention',
          text: 'use src/middleware',
          evidence: 'execution.steps[0]',
          approval: 'approved',
        },
        {
          id: 'K-2',
          scope: 'global',
          type: 'decision',
          text: 'prefer libX',
          evidence: 'grill',
          approval: 'rejected',
        },
        {
          id: 'K-3',
          scope: 'session',
          type: 'pattern',
          text: 'mid-test debug pattern',
          evidence: 'recall',
          approval: 'pending',
        },
      ],
    };
    expect(Value.Check(KnowledgeCaptureRecord, r)).toBe(true);
  });

  it('rejects type outside enum', () => {
    const bad = {
      ...env,
      items: [
        {
          id: 'K-1',
          scope: 'project',
          type: 'gossip',
          text: 't',
          evidence: 'e',
          approval: 'pending',
        },
      ],
    };
    expect(Value.Check(KnowledgeCaptureRecord, bad)).toBe(false);
  });
});
