import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import { ToolMetadata, ToolRegistry } from '../../../../src/ccp/policy/tool-registry';

describe('tool-registry', () => {
  const example = {
    tool_id: 'write_file',
    source: 'pi' as const,
    trust_level: 'trusted' as const,
    capability_type: 'WRITE_LOCAL' as const,
    read_or_write: 'write' as const,
    network_required: false,
    workspace_required: true,
    approval_tier: 2 as const,
    audit_metadata: {},
    retry_policy: 'idempotent' as const,
    idempotency_key_support: false,
  };

  it('ToolMetadata schema validates a complete entry', () => {
    expect(Value.Check(ToolMetadata, example)).toBe(true);
  });

  it('ToolMetadata rejects approval_tier=5', () => {
    expect(Value.Check(ToolMetadata, { ...example, approval_tier: 5 })).toBe(false);
  });

  it('register / lookup round-trip', () => {
    const reg = new ToolRegistry();
    reg.register(example);
    expect(reg.lookup('write_file')).toEqual(example);
    expect(reg.lookup('nope')).toBeUndefined();
  });

  it('register throws on duplicate tool_id', () => {
    const reg = new ToolRegistry();
    reg.register(example);
    expect(() => reg.register(example)).toThrow(/already registered/);
  });
});
