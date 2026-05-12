import { describe, expect, it } from 'vitest';
import { parseInitArgs } from '../../../../../src/ccp/commands/init/args';

describe('parseInitArgs', () => {
  it('parses no args', () => {
    expect(parseInitArgs('')).toEqual({ positional: undefined, flags: {} });
  });

  it('parses positional only', () => {
    expect(parseInitArgs('my-project')).toEqual({ positional: 'my-project', flags: {} });
  });

  it('parses --upgrade', () => {
    expect(parseInitArgs('--upgrade')).toEqual({ positional: undefined, flags: { upgrade: true } });
  });

  it('parses --force with positional', () => {
    expect(parseInitArgs('my-project --force')).toEqual({
      positional: 'my-project',
      flags: { force: true },
    });
  });

  it('parses --domain VALUE', () => {
    expect(parseInitArgs('my-project --domain trading-research')).toEqual({
      positional: 'my-project',
      flags: { domain: 'trading-research' },
    });
  });

  it('parses --critical-actions a,b,c', () => {
    expect(
      parseInitArgs('my-project --critical-actions trade_execute,global_memory_write'),
    ).toEqual({
      positional: 'my-project',
      flags: { 'critical-actions': 'trade_execute,global_memory_write' },
    });
  });

  it('parses --no-prompt', () => {
    expect(parseInitArgs('--no-prompt my-project')).toEqual({
      positional: 'my-project',
      flags: { 'no-prompt': true },
    });
  });

  it('allows --upgrade with --force (force-overwrite packs, preserve project.yaml)', () => {
    expect(parseInitArgs('--upgrade --force')).toEqual({
      positional: undefined,
      flags: { upgrade: true, force: true },
    });
  });
});
