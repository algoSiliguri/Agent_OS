import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../../../../src/ccp/policy/tool-registry';
import { seedPiTools } from '../../../../src/ccp/tools/pi-tool-defaults';

describe('seedPiTools', () => {
  it('registers all default Pi tools without collision', () => {
    const reg = new ToolRegistry();
    seedPiTools(reg);
    expect(reg.lookup('read_file')).toBeTruthy();
    expect(reg.lookup('write_file')).toBeTruthy();
    expect(reg.lookup('run_command')).toBeTruthy();
    expect(reg.all().length).toBeGreaterThanOrEqual(14);
  });

  it('is idempotent — calling twice is a no-op rather than throwing', () => {
    const reg = new ToolRegistry();
    seedPiTools(reg);
    seedPiTools(reg); // should not throw
    expect(reg.all().length).toBeGreaterThanOrEqual(14);
  });
});
