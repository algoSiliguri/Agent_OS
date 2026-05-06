// tests/unit/pi/ui.test.ts
import { describe, expect, it } from 'vitest';
import { wrapUi } from '../../../src/pi/ui';

describe('wrapUi', () => {
  it('confirm returns true/false based on Pi response', async () => {
    const captured: string[] = [];
    const ui = wrapUi({
      confirm: async (msg) => {
        captured.push(msg);
        return true;
      },
      input: async () => 'x',
      select: async () => 'a',
    });
    await expect(ui.confirm('proceed?')).resolves.toBe(true);
    expect(captured).toEqual(['proceed?']);
  });

  it('select forwards options', async () => {
    let receivedChoices: string[] = [];
    const ui = wrapUi({
      confirm: async () => true,
      input: async () => '',
      select: async (_msg, choices) => {
        receivedChoices = choices;
        return choices[0]!;
      },
    });
    await ui.select('pick one', ['a', 'b', 'c']);
    expect(receivedChoices).toEqual(['a', 'b', 'c']);
  });

  it('input returns the user string', async () => {
    const ui = wrapUi({
      confirm: async () => true,
      input: async () => 'agniva',
      select: async () => 'a',
    });
    await expect(ui.input('name?')).resolves.toBe('agniva');
  });
});
