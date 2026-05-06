import { describe, expect, it } from 'vitest';
import { ALL_TOOL_CLASSES, ToolClass } from '../../../../src/ccp/policy/tool-classes';

describe('tool-classes', () => {
  it('exports the 12 spec-named classes', () => {
    expect(ALL_TOOL_CLASSES).toHaveLength(12);
    const expected = [
      'READ_LOCAL',
      'WRITE_LOCAL',
      'EXECUTE_LOCAL',
      'READ_NETWORK',
      'WRITE_NETWORK',
      'MCP_READ',
      'MCP_WRITE',
      'BROWSER_READ',
      'BROWSER_WRITE',
      'MEMORY_READ',
      'MEMORY_WRITE',
      'GOVERNANCE_MUTATION',
    ];
    for (const name of expected) {
      expect(ALL_TOOL_CLASSES).toContain(name);
    }
  });

  it('ToolClass enum values match the strings', () => {
    expect(ToolClass.READ_LOCAL).toBe('READ_LOCAL');
    expect(ToolClass.GOVERNANCE_MUTATION).toBe('GOVERNANCE_MUTATION');
  });
});
