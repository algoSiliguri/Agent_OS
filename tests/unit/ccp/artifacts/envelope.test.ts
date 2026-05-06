import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { ArtifactEnvelope, makeEnvelope } from '../../../../src/ccp/artifacts/envelope';

describe('ArtifactEnvelope', () => {
  it('schema validates a complete envelope', () => {
    const valid = {
      artifact_id: '0193-abc',
      task_id: 'T-001',
      artifact_type: 'GrillRecord',
      schema_version: 1,
      policy_version: 'v1',
      manifest_version: 'v1',
      created_at: '2026-05-04T12:00:00Z',
      validated_under: { schema_version: 1, policy_version: 'v1', manifest_version: 'v1' },
    };
    expect(Value.Check(ArtifactEnvelope, valid)).toBe(true);
  });

  it('schema rejects missing artifact_id', () => {
    const bad = { task_id: 'T-001', artifact_type: 'GrillRecord', schema_version: 1 };
    expect(Value.Check(ArtifactEnvelope, bad)).toBe(false);
  });

  it('makeEnvelope generates an envelope with auto fields', () => {
    const env = makeEnvelope({ taskId: 'T-001', artifactType: 'GrillRecord' });
    expect(env.task_id).toBe('T-001');
    expect(env.artifact_type).toBe('GrillRecord');
    expect(env.schema_version).toBe(1);
    expect(env.policy_version).toBe('v1');
    expect(env.manifest_version).toBe('v1');
    expect(env.artifact_id).toMatch(/^[a-f0-9-]+$/);
    expect(env.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(env.validated_under).toEqual({
      schema_version: 1,
      policy_version: 'v1',
      manifest_version: 'v1',
    });
  });
});
