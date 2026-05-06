import { describe, expect, it } from 'vitest';
import { type PiToolDefault, piToolDefaults } from '../../../../src/ccp/tools/tool-id-conventions';

describe('piToolDefaults', () => {
  it('classifies the core Pi tool set', () => {
    const map = new Map(piToolDefaults().map((t) => [t.tool_id, t] as const));
    expect(map.get('read_file')?.capability_type).toBe('READ_LOCAL');
    expect(map.get('read_file')?.approval_tier).toBe(1);
    expect(map.get('write_file')?.capability_type).toBe('WRITE_LOCAL');
    expect(map.get('write_file')?.approval_tier).toBe(2);
    expect(map.get('run_command')?.capability_type).toBe('EXECUTE_LOCAL');
    expect(map.get('run_command')?.approval_tier).toBe(2);
  });

  it('marks read_or_write correctly', () => {
    const map = new Map(piToolDefaults().map((t) => [t.tool_id, t] as const));
    expect(map.get('read_file')?.read_or_write).toBe('read');
    expect(map.get('write_file')?.read_or_write).toBe('write');
  });

  it('every tool has full ToolMetadata', () => {
    for (const t of piToolDefaults()) {
      expect(t.tool_id).toBeTruthy();
      expect(t.source).toBeTruthy();
      expect(t.capability_type).toBeTruthy();
      expect([1, 2, 3, 4]).toContain(t.approval_tier);
    }
  });
});
