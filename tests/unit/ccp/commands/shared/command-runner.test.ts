import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeShellCommandRunner } from '../../../../../src/ccp/commands/shared/command-runner';

describe('makeShellCommandRunner', () => {
  it('runs a shell command and captures output', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-cmd-runner-'));
    const runner = makeShellCommandRunner({ cwd });

    const result = await runner.runCommand('printf hello');

    expect(result.command).toBe('printf hello');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello');
    expect(result.stderr).toBe('');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('normalizes non-zero exits without throwing', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'aos-cmd-runner-'));
    const runner = makeShellCommandRunner({ cwd });

    const result = await runner.runCommand('printf nope >&2; exit 7');

    expect(result.exitCode).toBe(7);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('nope');
  });
});
