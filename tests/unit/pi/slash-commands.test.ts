import { describe, expect, it } from 'vitest';
import { ALL_COMMANDS, makeStubHandler } from '../../../src/pi/slash-commands';

describe('slash-commands', () => {
  it('exports the six v1 commands', () => {
    expect(ALL_COMMANDS).toEqual(['grill', 'plan', 'run', 'verify', 'remember', 'status']);
  });

  it('makeStubHandler logs "not implemented" without throwing', async () => {
    const logs: string[] = [];
    const handler = makeStubHandler('grill', { log: (m) => logs.push(m) });
    await handler('add rate limit');
    expect(logs.join(' ')).toContain('not implemented');
    expect(logs.join(' ')).toContain('grill');
  });
});
